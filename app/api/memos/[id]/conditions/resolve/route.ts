import { NextResponse } from "next/server"

import { AuditEvents, createAuditEventWriter } from "@/lib/audit"
import { getDecisionByMemo, getInvestor, getMemo, resolveDecision, store } from "@/lib/data/store"
import { AccessError, assertInvestorAccess, buildRequestContext } from "@/lib/security/rbac"

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = buildRequestContext(req as any)
    const memo = getMemo(params.id)
    if (!memo) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const investor = getInvestor(memo.investorId)
    if (!investor) return NextResponse.json({ error: "Not found" }, { status: 404 })
    assertInvestorAccess(investor, ctx)

    if (!["agent", "manager", "super_admin"].includes(ctx.role)) throw new AccessError("Forbidden")

    const decision = getDecisionByMemo(memo.id)
    if (!decision) throw new AccessError("No decision found")
    if (decision.decisionType !== "approved_conditional") throw new AccessError("Decision is not conditional")
    if (decision.resolvedStatus !== "pending") throw new AccessError("Condition already resolved")

    const body = await req.json()
    const resolution = body.resolution as "met" | "not_met" | "withdrawn"
    if (!["met", "not_met", "withdrawn"].includes(resolution)) throw new AccessError("Invalid resolution")

    const updated = resolveDecision(memo.id, resolution, ctx.userId, body.agentNotes)
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const write = createAuditEventWriter()
    await write(
      AuditEvents.conditionResolved({
        tenantId: store.tenantId,
        actorId: ctx.userId,
        role: ctx.role,
        memoId: memo.id,
        resolution,
        notes: body.agentNotes,
      }),
    )

    return NextResponse.json(updated)
  } catch (err) {
    return handleError(err)
  }
}

function handleError(err: unknown) {
  if (err instanceof AccessError) {
    return NextResponse.json({ error: err.message }, { status: err.status })
  }
  return NextResponse.json({ error: "Internal error" }, { status: 500 })
}

