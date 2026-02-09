import { NextResponse } from "next/server"

import { AuditEvents, createAuditEventWriter } from "@/lib/audit"
import { getMemo, saveMemo } from "@/lib/db/memo-ops"
import { getInvestorById } from "@/lib/db/investors"
import { editMemoContent, transitionMemo } from "@/lib/domain/memos"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError, assertMemoAccess } from "@/lib/security/rbac"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuthContext(req)
    const memo = await getMemo((await params).id)
    if (!memo) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const investor = await getInvestorById(memo.investorId)
    if (!investor) return NextResponse.json({ error: "Not found" }, { status: 404 })

    assertMemoAccess({ tenantId: memo.tenantId, investorId: memo.investorId }, ctx, investor)

    // Investor view auto-marks opened
    if (ctx.role === "investor" && memo.state === "sent") {
      const next = transitionMemo(memo, "opened")
      await saveMemo(next)
      const write = createAuditEventWriter()
      await write(
        AuditEvents.memoOpened({
          tenantId: memo.tenantId,
          actorId: ctx.userId,
          role: ctx.role,
          memoId: memo.id,
          investorId: memo.investorId,
        }),
      )
      return NextResponse.json(next)
    }

    return NextResponse.json(memo)
  } catch (err) {
    return handleError(err)
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuthContext(req)
    const memo = await getMemo((await params).id)
    if (!memo) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const investor = await getInvestorById(memo.investorId)
    if (!investor) return NextResponse.json({ error: "Not found" }, { status: 404 })
    assertMemoAccess({ tenantId: memo.tenantId, investorId: memo.investorId }, ctx, investor)

    if (ctx.role === "investor") throw new AccessError("Investors cannot edit memos")

    const body = await req.json()
    const updated = editMemoContent(memo, body.content ?? memo, ctx.userId)
    await saveMemo(updated)

    const write = createAuditEventWriter()
    await write(
      AuditEvents.memoUpdated({
        tenantId: memo.tenantId,
        actorId: ctx.userId,
        role: ctx.role,
        memoId: memo.id,
        version: updated.currentVersion,
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

