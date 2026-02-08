import { NextResponse } from "next/server"

import { AuditEvents, createAuditEventWriter } from "@/lib/audit"
import { addMessage, getMemo, getMessagesByMemo, store } from "@/lib/data/store"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError } from "@/lib/security/rbac"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuthContext(req)
    if (ctx.role !== "investor") throw new AccessError("Investor access only")
    if (!ctx.investorId) throw new AccessError("Missing investor scope")

    const memo = getMemo((await params).id)
    if (!memo) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (memo.investorId !== ctx.investorId) throw new AccessError("Forbidden")
    if (!["sent", "opened", "decided"].includes(memo.state)) throw new AccessError("Memo not shared")

    const msgs = getMessagesByMemo(memo.id)
    return NextResponse.json(msgs)
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuthContext(req)
    if (ctx.role !== "investor") throw new AccessError("Investor access only")
    if (!ctx.investorId) throw new AccessError("Missing investor scope")

    const memo = getMemo((await params).id)
    if (!memo) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (memo.investorId !== ctx.investorId) throw new AccessError("Forbidden")
    if (!["sent", "opened", "decided"].includes(memo.state)) throw new AccessError("Memo not shared")

    const body = await req.json()
    if (!body.body) throw new AccessError("Message body required")

    const msg = addMessage({
      memoId: memo.id,
      body: body.body,
      versionContext: body.versionContext ?? memo.currentVersion,
      senderId: ctx.userId,
    })

    const write = createAuditEventWriter()
    await write(
      AuditEvents.qnaMessagePosted({
        tenantId: store.tenantId,
        actorId: ctx.userId,
        role: ctx.role,
        memoId: memo.id,
        investorId: memo.investorId,
      }),
    )

    return NextResponse.json(msg, { status: 201 })
  } catch (err) {
    return handleError(err)
  }
}

function handleError(err: unknown) {
  if (err instanceof AccessError) return NextResponse.json({ error: err.message }, { status: err.status })
  return NextResponse.json({ error: "Internal error" }, { status: 500 })
}

