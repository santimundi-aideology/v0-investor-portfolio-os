import { NextResponse } from "next/server"

import { AuditEvents, createAuditEventWriter } from "@/lib/audit"
import { createShareToken, getMemo, saveMemo } from "@/lib/data/store"
import { transitionMemo } from "@/lib/domain/memos"
import { AccessError, assertMemoAccess, buildRequestContext } from "@/lib/security/rbac"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = buildRequestContext(req)
    if (ctx.role !== "agent" && ctx.role !== "super_admin") throw new AccessError("Only agents can share memos")

    const memo = getMemo((await params).id)
    if (!memo) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const investor = getInvestor(memo.investorId)
    if (!investor) return NextResponse.json({ error: "Not found" }, { status: 404 })
    assertMemoAccess({ tenantId: memo.tenantId, investorId: memo.investorId }, ctx, investor)

    const next = transitionMemo(memo, "sent")
    saveMemo(next)
    const token = createShareToken(memo.id, memo.investorId)

    const write = createAuditEventWriter()
    await write(
      AuditEvents.memoSent({
        tenantId: memo.tenantId,
        actorId: ctx.userId,
        role: ctx.role,
        memoId: memo.id,
        investorId: memo.investorId,
        version: memo.currentVersion,
      }),
    )

    return NextResponse.json({ memo: next, shareUrl: `/investor/share/${token.token}` })
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

