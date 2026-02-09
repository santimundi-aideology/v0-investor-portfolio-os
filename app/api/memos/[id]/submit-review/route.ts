import { NextResponse } from "next/server"

import { AuditEvents, createAuditEventWriter } from "@/lib/audit"
import { getMemo, saveMemo } from "@/lib/db/memo-ops"
import { getInvestorById } from "@/lib/db/investors"
import { transitionMemo } from "@/lib/domain/memos"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError, assertMemoAccess } from "@/lib/security/rbac"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuthContext(req)
    const memo = await getMemo((await params).id)
    if (!memo) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const investor = await getInvestorById(memo.investorId)
    if (!investor) return NextResponse.json({ error: "Not found" }, { status: 404 })
    assertMemoAccess({ tenantId: memo.tenantId, investorId: memo.investorId }, ctx, investor)

    if (ctx.role !== "agent" && ctx.role !== "super_admin") throw new AccessError("Only agents can submit for review")
    const next = transitionMemo(memo, "pending_review")
    await saveMemo(next)

    const write = createAuditEventWriter()
    await write(
      AuditEvents.memoSubmittedForReview({
        tenantId: memo.tenantId,
        actorId: ctx.userId,
        role: ctx.role,
        memoId: memo.id,
      }),
    )

    return NextResponse.json(next)
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

