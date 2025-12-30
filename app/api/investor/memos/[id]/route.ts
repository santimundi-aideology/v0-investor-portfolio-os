import { NextResponse } from "next/server"

import { createAuditEventWriter } from "@/lib/audit"
import { getInvestor, getMemo, saveMemo, store } from "@/lib/data/store"
import { transitionMemo } from "@/lib/domain/memos"
import { AccessError, buildRequestContext } from "@/lib/security/rbac"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = buildRequestContext(req as any)
    if (ctx.role !== "investor") throw new AccessError("Investor access only")
    if (!ctx.investorId) throw new AccessError("Missing investor scope")

    const memo = getMemo((await params).id)
    if (!memo) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (memo.investorId !== ctx.investorId) throw new AccessError("Forbidden")
    if (!["sent", "opened", "decided"].includes(memo.state)) throw new AccessError("Memo not shared")

    // idempotent sent->opened
    if (memo.state === "sent") {
      const next = transitionMemo(memo, "opened")
      saveMemo(next as any)
      const write = createAuditEventWriter()
      await write({
        eventType: "memo.opened_by_investor",
        tenantId: memo.tenantId,
        actorId: ctx.userId,
        actorRole: ctx.role,
        objectType: "memo",
        objectId: memo.id,
        metadata: { investorId: memo.investorId },
      })
      return NextResponse.json(next)
    }

    return NextResponse.json(memo)
  } catch (err) {
    return handleError(err)
  }
}

function handleError(err: unknown) {
  if (err instanceof AccessError) return NextResponse.json({ error: err.message }, { status: err.status })
  return NextResponse.json({ error: "Internal error" }, { status: 500 })
}

