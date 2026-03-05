import { NextResponse } from "next/server"

import { AuditEvents, createAuditEventWriter } from "@/lib/audit"
import { getDealRoomById, updateDealRoom, deleteDealRoom } from "@/lib/db/deal-rooms"
import { createHolding } from "@/lib/db/holdings"
import { getInvestorById } from "@/lib/db/investors"
import { getOpportunitiesByInvestor, updateOpportunityStatus } from "@/lib/db/opportunities"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError, assertTenantScope } from "@/lib/security/rbac"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { batchInsertNotifications } from "@/lib/db/notifications"
import {
  createPaymentMilestones,
  generateOffPlanMilestones,
  generateReadyMilestones,
} from "@/lib/db/payment-milestones"

type RouteContext = { params: Promise<{ id: string }> }

/**
 * GET /api/deal-rooms/:id
 * Retrieve a single deal room by ID.
 */
export async function GET(req: Request, { params }: RouteContext) {
  try {
    const ctx = await requireAuthContext(req)
    const { id } = await params
    const deal = await getDealRoomById(id)

    if (!deal) {
      return NextResponse.json({ error: "Deal room not found" }, { status: 404 })
    }

    assertTenantScope(deal.tenantId, ctx)

    // Investors can only see deal rooms where they are the linked investor
    if (ctx.role === "investor" && deal.investorId !== ctx.investorId) {
      throw new AccessError("You do not have access to this deal room")
    }

    return NextResponse.json(deal)
  } catch (err) {
    return handleError(err)
  }
}

/**
 * PUT /api/deal-rooms/:id
 * Update a deal room. Supports partial updates.
 */
export async function PUT(req: Request, { params }: RouteContext) {
  try {
    const ctx = await requireAuthContext(req)
    if (ctx.role === "investor") {
      throw new AccessError("Investors cannot update deal rooms")
    }

    const { id } = await params
    const existing = await getDealRoomById(id)
    if (!existing) {
      return NextResponse.json({ error: "Deal room not found" }, { status: 404 })
    }
    assertTenantScope(existing.tenantId, ctx)

    // Agents can only update deal rooms assigned to them
    if (ctx.role === "agent" && existing.assignedAgentId !== ctx.userId) {
      throw new AccessError("You can only update deal rooms assigned to you")
    }

    const body = await req.json()
    const previousStatus = existing.status

    const updated = await updateDealRoom(id, {
      title: body.title,
      propertyId: body.propertyId,
      investorId: body.investorId,
      investorName: body.investorName,
      propertyTitle: body.propertyTitle,
      status: body.status,
      ticketSizeAed: body.ticketSizeAed,
      offerPriceAed: body.offerPriceAed,
      targetCloseDate: body.targetCloseDate,
      probability: body.probability,
      priority: body.priority,
      nextStep: body.nextStep,
      summary: body.summary,
      notes: body.notes,
      assignedAgentId: body.assignedAgentId,
      parties: body.parties,
      checklist: body.checklist,
      timeline: body.timeline,
    })

    if (!updated) {
      return NextResponse.json({ error: "Failed to update deal room" }, { status: 500 })
    }

    const write = createAuditEventWriter()

    // Emit stage-change event if status changed
    if (body.status && body.status !== previousStatus) {
      await write(
        AuditEvents.dealRoomStageChanged({
          tenantId: existing.tenantId,
          actorId: ctx.userId,
          role: ctx.role,
          dealRoomId: id,
          fromStage: previousStatus,
          toStage: body.status,
        }),
      )

      // Notify investor + assigned agent about stage changes
      // Look up investor's linked user account via owner_user_id
      if (existing.investorId || existing.assignedAgentId) {
        const recipients: string[] = []

        if (existing.investorId) {
          const investorRecord = await getInvestorById(existing.investorId).catch(() => null)
          if (investorRecord?.ownerUserId) recipients.push(investorRecord.ownerUserId)
        }
        if (existing.assignedAgentId && existing.assignedAgentId !== ctx.userId) {
          recipients.push(existing.assignedAgentId)
        }

        if (recipients.length > 0) {
          const stageLabel = (body.status as string).replace(/-/g, " ").replace(/_/g, " ")
          await batchInsertNotifications(
            recipients.map((uid) => ({
              org_id: existing.tenantId,
              recipient_user_id: uid,
              entity_type: "deal_room",
              entity_id: id,
              title: `Deal room stage: ${stageLabel}`,
              body: `"${existing.title}" moved to ${stageLabel}.`,
              notification_key: `deal_room_stage_${id}_${body.status}_${uid}`,
            })),
          )
        }
      }

      // Auto-create holding when deal room reaches "completed"
      if (body.status === "completed" && existing.investorId && existing.propertyId) {
        try {
          const purchasePrice = existing.offerPriceAed ?? existing.ticketSizeAed ?? 0
          const holding = await createHolding({
            tenantId: existing.tenantId,
            investorId: existing.investorId,
            listingId: existing.propertyId,
            purchasePrice,
            purchaseDate: new Date().toISOString().slice(0, 10),
            currentValue: purchasePrice,
            monthlyRent: 0,
            occupancyRate: 1,
            annualExpenses: 0,
          })

          if (holding) {
            // Find the opportunity and update its status to "acquired"
            // Also retrieve memoId for payment plan detection
            const opps = await getOpportunitiesByInvestor(existing.investorId, { includeAcquired: true })
            const opp = opps.find((o) => o.listingId === existing.propertyId)
            if (opp) {
              await updateOpportunityStatus(opp.id, "acquired", { holdingId: holding.id })
            }

            // Auto-generate payment milestones
            try {
              let milestones
              if (opp?.memoId) {
                const supabase = getSupabaseAdminClient()
                const { data: versions } = await supabase
                  .from("memo_versions")
                  .select("content")
                  .eq("memo_id", opp.memoId)
                  .order("version", { ascending: false })
                  .limit(1)
                const content = versions?.[0]?.content as Record<string, unknown> | undefined
                const paymentPlan = content?.paymentPlan as Record<string, unknown> | undefined
                if (paymentPlan && content?.type === "offplan") {
                  milestones = generateOffPlanMilestones(holding.id, purchasePrice, paymentPlan)
                }
              }
              if (!milestones) {
                milestones = generateReadyMilestones(holding.id, purchasePrice)
              }
              await createPaymentMilestones(milestones)
            } catch (msErr) {
              console.error("[deal-rooms/:id] Error generating milestones:", msErr)
            }

            // Notify investor about acquisition via owner_user_id
            const investorRecord = await getInvestorById(existing.investorId).catch(() => null)
            if (investorRecord?.ownerUserId) {
              await batchInsertNotifications([
                {
                  org_id: existing.tenantId,
                  recipient_user_id: investorRecord.ownerUserId,
                  entity_type: "holding",
                  entity_id: holding.id,
                  title: "Property acquired!",
                  body: `Congratulations! "${existing.propertyTitle || "Your property"}" has been added to your portfolio.`,
                  notification_key: `holding_created_${holding.id}`,
                },
              ])
            }
          }
        } catch (holdingErr) {
          console.error("[deal-rooms/:id] Error auto-creating holding:", holdingErr)
        }
      }
    } else {
      await write(
        AuditEvents.dealRoomUpdated({
          tenantId: existing.tenantId,
          actorId: ctx.userId,
          role: ctx.role,
          dealRoomId: id,
          fields: Object.keys(body),
        }),
      )
    }

    return NextResponse.json(updated)
  } catch (err) {
    return handleError(err)
  }
}

/**
 * DELETE /api/deal-rooms/:id
 * Delete a deal room. Only managers/super_admins.
 */
export async function DELETE(req: Request, { params }: RouteContext) {
  try {
    const ctx = await requireAuthContext(req)
    if (ctx.role !== "manager" && ctx.role !== "super_admin") {
      throw new AccessError("Only managers can delete deal rooms")
    }

    const { id } = await params
    const existing = await getDealRoomById(id)
    if (!existing) {
      return NextResponse.json({ error: "Deal room not found" }, { status: 404 })
    }
    assertTenantScope(existing.tenantId, ctx)

    await deleteDealRoom(id)

    const write = createAuditEventWriter()
    await write(
      AuditEvents.dealRoomDeleted({
        tenantId: existing.tenantId,
        actorId: ctx.userId,
        role: ctx.role,
        dealRoomId: id,
      }),
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    return handleError(err)
  }
}

function handleError(err: unknown) {
  if (err instanceof AccessError) {
    return NextResponse.json({ error: err.message }, { status: err.status })
  }
  console.error("[deal-rooms/:id]", err)
  return NextResponse.json({ error: "Internal error" }, { status: 500 })
}
