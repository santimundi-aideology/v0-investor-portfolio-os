import { NextResponse } from "next/server"

import { requireAuthContext } from "@/lib/auth/server"
import { getInvestorById } from "@/lib/db/investors"
import {
  getOpportunityById,
  updateOpportunityStatus,
  type OpportunityStatus,
} from "@/lib/db/opportunities"
import { AccessError, assertInvestorAccess } from "@/lib/security/rbac"

const ALLOWED_TARGET_STATUSES: OpportunityStatus[] = [
  "memo_review",
  "deal_room",
  "acquired",
  "expired",
]

function canTransition(
  from: OpportunityStatus,
  to: OpportunityStatus
): { ok: true } | { ok: false; error: string } {
  if (from === to) return { ok: true }

  if (from === "rejected") {
    return { ok: false, error: "Rejected opportunities cannot be reopened from realtor flow" }
  }
  if (from === "acquired" || from === "expired") {
    return { ok: false, error: `Cannot transition an opportunity in ${from} status` }
  }

  const validTargets: Record<OpportunityStatus, OpportunityStatus[]> = {
    recommended: ["expired"],
    shortlisted: ["memo_review", "deal_room", "expired"],
    memo_review: ["deal_room", "expired"],
    deal_room: ["acquired", "expired"],
    acquired: [],
    rejected: [],
    expired: [],
  }

  if (!validTargets[from]?.includes(to)) {
    return { ok: false, error: `Invalid transition from ${from} to ${to}` }
  }
  return { ok: true }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuthContext(req)
    if (ctx.role === "investor") {
      return NextResponse.json(
        { error: "Investors cannot update realtor opportunity status" },
        { status: 403 }
      )
    }

    const { id } = await params
    const opportunity = await getOpportunityById(id)
    if (!opportunity) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 })
    }

    const investor = await getInvestorById(opportunity.investorId)
    if (!investor) {
      return NextResponse.json({ error: "Investor not found" }, { status: 404 })
    }
    assertInvestorAccess(investor, ctx)

    const body = (await req.json()) as {
      status?: OpportunityStatus
      memoId?: string
      dealRoomId?: string
      holdingId?: string
    }
    const status = body.status

    if (!status || !ALLOWED_TARGET_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${ALLOWED_TARGET_STATUSES.join(", ")}` },
        { status: 400 }
      )
    }

    const transition = canTransition(opportunity.status, status)
    if (!transition.ok) {
      return NextResponse.json({ error: transition.error }, { status: 400 })
    }

    const resolvedMemoId = body.memoId ?? opportunity.memoId ?? undefined
    if ((status === "memo_review" || status === "deal_room") && !resolvedMemoId) {
      return NextResponse.json(
        { error: "memoId is required before moving to memo_review or deal_room" },
        { status: 400 }
      )
    }

    if (status === "acquired" && !body.holdingId) {
      return NextResponse.json(
        { error: "holdingId is required when marking as acquired" },
        { status: 400 }
      )
    }

    const updated = await updateOpportunityStatus(id, status, {
      memoId: resolvedMemoId,
      dealRoomId: body.dealRoomId ?? opportunity.dealRoomId ?? undefined,
      holdingId: body.holdingId,
    })

    if (!updated) {
      return NextResponse.json(
        { error: "Failed to update opportunity status" },
        { status: 500 }
      )
    }

    return NextResponse.json({ opportunity: updated })
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[realtor/opportunities/status] Error:", err)
    return NextResponse.json(
      { error: "Failed to update opportunity status" },
      { status: 500 }
    )
  }
}
