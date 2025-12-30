import { NextResponse } from "next/server"

import { getInvestor, store } from "@/lib/data/store"
import { AccessError, buildRequestContext } from "@/lib/security/rbac"

export async function GET(req: Request) {
  try {
    const ctx = buildRequestContext(req)
    const tenantId = ctx.tenantId!

    if (ctx.role === "investor") throw new AccessError("Forbidden")

    const items = store.decisions
      .filter((d) => d.decisionType === "approved_conditional" && d.resolvedStatus === "pending" && d.tenantId === tenantId)
      .map((d) => {
        const memo = store.memos.find((m) => m.id === d.memoId)
        const investor = memo ? getInvestor(memo.investorId) : undefined
        return { decision: d, memo, investor }
      })
      .filter(({ memo, investor }) => memo && investor)
      .filter(({ investor }) => {
        if (ctx.role === "manager" || ctx.role === "super_admin") return true
        if (ctx.role === "agent") return investor!.assignedAgentId === ctx.userId
        return false
      })
      .map(({ decision, memo, investor }) => ({
        memoId: memo!.id,
        investorId: investor!.id,
        listingId: memo!.listingId,
        conditionText: decision.conditionText,
        deadline: decision.deadline,
        decidedAt: decision.createdAt,
      }))

    return NextResponse.json(items)
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

