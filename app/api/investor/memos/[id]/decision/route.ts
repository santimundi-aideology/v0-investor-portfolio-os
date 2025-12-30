import { NextResponse } from "next/server"

import { AuditEvents, createAuditEventWriter } from "@/lib/audit"
import { addDecision, getInvestor, getMemo, saveMemo, store } from "@/lib/data/store"
import { transitionMemo } from "@/lib/domain/memos"
import { AccessError, buildRequestContext } from "@/lib/security/rbac"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = buildRequestContext(req as any)
    if (ctx.role !== "investor") throw new AccessError("Investor access only")
    if (!ctx.investorId) throw new AccessError("Missing investor scope")

    const { id } = await params
    const memo = getMemo(id)
    if (!memo) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (memo.investorId !== ctx.investorId) throw new AccessError("Forbidden")
    if (!["sent", "opened"].includes(memo.state)) throw new AccessError("Memo not open for decision")

    const body = await req.json()
    const decisionType = body.decision as "approved" | "rejected" | "approved_conditional"
    if (!["approved", "rejected", "approved_conditional"].includes(decisionType)) throw new AccessError("Invalid decision")
    if (!Array.isArray(body.reasonTags) || body.reasonTags.length === 0) throw new AccessError("reasonTags required")
    if (decisionType === "approved_conditional" && !body.conditionText) throw new AccessError("conditionText required")

    const decision = addDecision({
      memoId: memo.id,
      investorId: memo.investorId,
      decisionType,
      reasonTags: body.reasonTags,
      conditionText: body.conditionText,
      deadline: body.deadline,
    })

    const openedMemo = memo.state === "sent" ? transitionMemo(memo, "opened") : memo
    const decided = transitionMemo(openedMemo, "decided")
    saveMemo(decided as any)

    const write = createAuditEventWriter()
    await write(
      AuditEvents.memoDecided({
        tenantId: store.tenantId,
        actorId: ctx.userId,
        role: ctx.role,
        memoId: memo.id,
        decision: decisionType,
        reasonTags: body.reasonTags,
        conditionText: body.conditionText,
      }),
    )

    return NextResponse.json({ memo: decided, decision })
  } catch (err) {
    return handleError(err)
  }
}

function handleError(err: unknown) {
  if (err instanceof AccessError) return NextResponse.json({ error: err.message }, { status: err.status })
  return NextResponse.json({ error: "Internal error" }, { status: 500 })
}

