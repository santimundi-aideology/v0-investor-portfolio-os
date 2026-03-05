import { NextResponse } from "next/server"

import { requireAuthContext } from "@/lib/auth/server"
import { AccessError, assertMemoAccess } from "@/lib/security/rbac"
import { getMemo, getDecisionByMemo } from "@/lib/db/memo-ops"
import { getInvestorById } from "@/lib/db/investors"
import { getListingById } from "@/lib/db/listings"
import { createDealRoom } from "@/lib/db/deal-rooms"
import { getOpportunitiesByInvestor, updateOpportunityStatus } from "@/lib/db/opportunities"
import { AuditEvents, createAuditEventWriter } from "@/lib/audit"
import { batchInsertNotifications } from "@/lib/db/notifications"
import type { ChecklistItem, TimelineEvent } from "@/lib/types"

function buildChecklist(): ChecklistItem[] {
  return [
    { id: crypto.randomUUID(), title: "Verify title deed / Oqood registration", category: "legal", completed: false },
    { id: crypto.randomUUID(), title: "Confirm developer NOC", category: "legal", completed: false },
    { id: crypto.randomUUID(), title: "Obtain property valuation", category: "financial", completed: false },
    { id: crypto.randomUUID(), title: "Draft and review MoU / SPA", category: "legal", completed: false },
    { id: crypto.randomUUID(), title: "Arrange buyer financing (if applicable)", category: "financial", completed: false },
    { id: crypto.randomUUID(), title: "Deposit booking amount / earnest money", category: "financial", completed: false },
    { id: crypto.randomUUID(), title: "Schedule DLD transfer / registration", category: "regulatory", completed: false },
    { id: crypto.randomUUID(), title: "Conduct final property inspection", category: "inspection", completed: false },
    { id: crypto.randomUUID(), title: "Complete RERA fee payment", category: "regulatory", completed: false },
    { id: crypto.randomUUID(), title: "Handover / key collection", category: "transfer", completed: false },
  ]
}

function buildTimeline(title: string): TimelineEvent[] {
  return [
    { id: crypto.randomUUID(), type: "update", title: "Deal room created", description: `Deal room opened for "${title}"`, date: new Date().toISOString() },
  ]
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthContext(req)
    if (ctx.role === "investor") throw new AccessError("Investors cannot create deal rooms")

    const body = await req.json()
    const memoId = body.memoId as string
    if (!memoId) return NextResponse.json({ error: "memoId is required" }, { status: 400 })

    const memo = await getMemo(memoId)
    if (!memo) return NextResponse.json({ error: "Memo not found" }, { status: 404 })

    const investor = memo.investorId ? await getInvestorById(memo.investorId) : null
    if (investor) {
      assertMemoAccess({ tenantId: memo.tenantId, investorId: memo.investorId! }, ctx, investor)
    }

    if (memo.state !== "decided") {
      return NextResponse.json({ error: "Memo must be in decided state" }, { status: 400 })
    }

    const decision = await getDecisionByMemo(memoId)
    if (!decision || decision.decisionType === "rejected") {
      return NextResponse.json({ error: "Cannot create deal room for a rejected memo" }, { status: 400 })
    }

    const listing = memo.listingId ? await getListingById(memo.listingId) : null

    const latestContent = memo.versions?.[memo.versions.length - 1]?.content as Record<string, unknown> | undefined
    const analysis = latestContent?.analysis as Record<string, unknown> | undefined
    const property = latestContent?.property as Record<string, unknown> | undefined

    const propertyTitle =
      (listing?.title as string | undefined) ??
      (property?.title as string | undefined) ??
      "Property"
    const dealTitle = `Deal: ${propertyTitle}`

    const offerPriceAed =
      (analysis?.priceAed as number | undefined) ??
      (listing?.price as number | undefined) ??
      undefined

    const dealRoom = await createDealRoom({
      tenantId: memo.tenantId,
      title: dealTitle,
      propertyId: memo.listingId ?? null,
      investorId: memo.investorId ?? null,
      investorName: investor?.name ?? null,
      propertyTitle,
      status: "preparation",
      offerPriceAed: offerPriceAed ?? null,
      priority: "high",
      summary: `Auto-created from IC Memo. Decision: ${decision.decisionType}.`,
      assignedAgentId: memo.createdBy ?? ctx.userId,
      checklist: buildChecklist(),
      timeline: buildTimeline(dealTitle),
    })

    if (!dealRoom) throw new Error("Failed to create deal room")

    // Link opportunity record if one exists for this investor + listing
    if (memo.investorId && memo.listingId) {
      const opps = await getOpportunitiesByInvestor(memo.investorId, { includeAcquired: true })
      const opp = opps.find((o) => o.listingId === memo.listingId)
      if (opp) {
        await updateOpportunityStatus(opp.id, "deal_room", { dealRoomId: dealRoom.id })
      }
    }

    const write = createAuditEventWriter()
    await write(
      AuditEvents.dealRoomCreated({
        tenantId: memo.tenantId,
        actorId: ctx.userId,
        role: ctx.role,
        dealRoomId: dealRoom.id,
      }),
    )

    // Notify investor if they have a linked user account (via owner_user_id)
    if (investor?.ownerUserId) {
      await batchInsertNotifications([
        {
          org_id: memo.tenantId,
          recipient_user_id: investor.ownerUserId,
          entity_type: "deal_room",
          entity_id: dealRoom.id,
          title: "Deal room created",
          body: `A deal room has been opened for "${propertyTitle}".`,
          notification_key: `deal_room_created_${dealRoom.id}`,
        },
      ])
    }

    return NextResponse.json({ dealRoom }, { status: 201 })
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[deal-rooms/from-memo]", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
