import { NextResponse } from "next/server"

import { AuditEvents, createAuditEventWriter } from "@/lib/audit"
import { getDealRoomById, updateDealRoom, deleteDealRoom } from "@/lib/db/deal-rooms"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError, assertTenantScope } from "@/lib/security/rbac"

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
