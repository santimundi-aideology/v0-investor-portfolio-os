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
    if (ctx.role !== "manager" && ctx.role !== "super_admin") {
      throw new AccessError("Only managers can approve memos")
    }
    const memo = await getMemo((await params).id)
    if (!memo) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const investor = await getInvestorById(memo.investorId)
    if (!investor) return NextResponse.json({ error: "Not found" }, { status: 404 })
    assertMemoAccess({ tenantId: memo.tenantId, investorId: memo.investorId }, ctx, investor)

    const next = transitionMemo(memo, "ready")
    await saveMemo(next)

    const write = createAuditEventWriter()
    await write(
      AuditEvents.memoApproved({
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

