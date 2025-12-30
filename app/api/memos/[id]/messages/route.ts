import { NextResponse } from "next/server"

import { AuditEvents, createAuditEventWriter } from "@/lib/audit"
import { addMessage, getInvestor, getMemo, getMessagesByMemo, store } from "@/lib/data/store"
import { AccessError, assertMemoAccess, buildRequestContext } from "@/lib/security/rbac"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = buildRequestContext(req)
    const memo = getMemo((await params).id)
    if (!memo) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const investor = getInvestor(memo.investorId)
    if (!investor) return NextResponse.json({ error: "Not found" }, { status: 404 })
    assertMemoAccess({ tenantId: memo.tenantId, investorId: memo.investorId }, ctx, investor)

    return NextResponse.json(getMessagesByMemo(memo.id))
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = buildRequestContext(req)
    const memo = getMemo((await params).id)
    if (!memo) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const investor = getInvestor(memo.investorId)
    if (!investor) return NextResponse.json({ error: "Not found" }, { status: 404 })
    assertMemoAccess({ tenantId: memo.tenantId, investorId: memo.investorId }, ctx, investor)

    const body = await req.json()
    if (!body.body) throw new AccessError("Message body required")

    const record = addMessage({
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

    return NextResponse.json(record, { status: 201 })
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

