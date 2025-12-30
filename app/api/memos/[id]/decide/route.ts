import { NextResponse } from "next/server"

import { AuditEvents, createAuditEventWriter } from "@/lib/audit"
import { addDecision, getInvestor, getMemo, saveMemo } from "@/lib/data/store"
import { transitionMemo } from "@/lib/domain/memos"
import { AccessError, assertMemoAccess, buildRequestContext } from "@/lib/security/rbac"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = buildRequestContext(req as any)
    const memo = getMemo((await params).id)
    if (!memo) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const investor = getInvestor(memo.investorId)
    if (!investor) return NextResponse.json({ error: "Not found" }, { status: 404 })
    assertMemoAccess({ tenantId: memo.tenantId, investorId: memo.investorId }, ctx, investor)

    if (ctx.role !== "investor" && ctx.role !== "super_admin") throw new AccessError("Only investors can decide")

    if (memo.state !== "opened" && memo.state !== "sent") {
      throw new AccessError("Memo must be opened before decision")
    }

    const body = await req.json()
    const decisionType = body.decision as "approved" | "rejected" | "approved_conditional"
    if (!["approved", "rejected", "approved_conditional"].includes(decisionType)) {
      throw new AccessError("Invalid decision type")
    }
    if (!Array.isArray(body.reasonTags) || body.reasonTags.length === 0) {
      throw new AccessError("reasonTags are required")
    }
    if (decisionType === "approved_conditional" && !body.conditionText) {
      throw new AccessError("conditionText required for approved_conditional")
    }

    const decision = addDecision({
      memoId: memo.id,
      investorId: memo.investorId,
      decisionType,
      reasonTags: body.reasonTags,
      conditionText: body.conditionText,
      deadline: body.deadline,
      resolvedStatus: "pending",
    })

    const nextState = memo.state === "opened" ? "decided" : "decided"
    const next = transitionMemo(memo.state === "sent" ? transitionMemo(memo, "opened") : memo, nextState)
    saveMemo(next as any)

    const write = createAuditEventWriter()
    await write(
      AuditEvents.memoDecided({
        tenantId: memo.tenantId,
        actorId: ctx.userId,
        role: ctx.role,
        memoId: memo.id,
        decision: decisionType,
        reasonTags: body.reasonTags,
        conditionText: body.conditionText,
      }),
    )

    return NextResponse.json({ memo: next, decision })
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

