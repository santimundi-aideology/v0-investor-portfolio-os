import { NextResponse } from "next/server"

import { AuditEvents, createAuditEventWriter } from "@/lib/audit"
import { createMemo, getInvestor, store } from "@/lib/data/store"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError, assertInvestorAccess } from "@/lib/security/rbac"

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthContext(req)
    const tenantId = store.tenantId
    if (ctx.role === "investor") {
      const mine = store.memos.filter((m) => m.tenantId === tenantId && m.investorId === ctx.investorId)
      return NextResponse.json(mine)
    }
    if (ctx.role === "agent") {
      const mine = store.memos.filter((m) => {
        const inv = getInvestor(m.investorId)
        return m.tenantId === tenantId && inv?.assignedAgentId === ctx.userId
      })
      return NextResponse.json(mine)
    }
    const all = store.memos.filter((m) => m.tenantId === tenantId)
    return NextResponse.json(all)
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthContext(req)
    const body = await req.json()
    const investor = getInvestor(body.investorId)
    if (!investor) throw new AccessError("Investor not found")
    assertInvestorAccess(investor, ctx)

    if (ctx.role === "investor") throw new AccessError("Investors cannot create memos")

    const memo = createMemo({
      investorId: body.investorId,
      listingId: body.listingId,
      underwritingId: body.underwritingId,
      content: body.content ?? {},
      createdBy: ctx.userId,
    })

    const write = createAuditEventWriter()
    await write(
      AuditEvents.memoCreated({
        tenantId: store.tenantId,
        actorId: ctx.userId,
        role: ctx.role,
        memoId: memo.id,
      }),
    )

    return NextResponse.json(memo, { status: 201 })
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

