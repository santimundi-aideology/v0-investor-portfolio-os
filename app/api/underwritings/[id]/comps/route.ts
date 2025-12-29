import { NextResponse } from "next/server"

import { getInvestor, getUnderwriting, store } from "@/lib/data/store"
import { AccessError, assertInvestorAccess, buildRequestContext } from "@/lib/security/rbac"

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = buildRequestContext(req as any)
    const uw = getUnderwriting(params.id)
    if (!uw) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const investor = getInvestor(uw.investorId)
    if (!investor) return NextResponse.json({ error: "Not found" }, { status: 404 })
    assertInvestorAccess(investor, ctx)
    if (ctx.role === "investor") throw new AccessError("Investors cannot access comps")

    const comps = store.underwritingComps.filter((c) => c.underwritingId === uw.id)
    return NextResponse.json(comps)
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
import { NextResponse } from "next/server"

import { AuditEvents, createAuditEventWriter } from "@/lib/audit"
import { listInvestorsByAgent } from "@/lib/db/investors"
import { addCompDb, listComps } from "@/lib/db/comps"
import { getUnderwritingById } from "@/lib/db/underwritings"
import { AccessError, buildRequestContext } from "@/lib/security/rbac"

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = buildRequestContext(req as any)
    const uw = await getUnderwritingById(params.id)
    if (!uw) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (ctx.role === "manager") throw new AccessError("Managers are read-only")
    if (ctx.role === "investor") throw new AccessError("Investors cannot modify comps")
    if (ctx.role === "agent") {
      const investorList = await listInvestorsByAgent(ctx.tenantId!, ctx.userId)
      const isMine = investorList.some((i) => i.id === uw.investorId)
      if (!isMine) throw new AccessError("Forbidden")
    }

    const body = await req.json()
    if (!body.description || !body.source) throw new AccessError("description and source are required")

    const record =
      (await addCompDb({
        tenantId: ctx.tenantId!,
        underwritingId: uw.id,
        description: body.description,
        price: body.price,
        pricePerSqft: body.pricePerSqft,
        rentPerYear: body.rentPerYear,
        source: body.source,
        sourceDetail: body.sourceDetail,
        observedDate: body.observedDate,
        attachmentId: body.attachmentId,
        addedBy: ctx.userId,
      })) ?? undefined

    const write = createAuditEventWriter()
    await write(
      AuditEvents.underwritingCompAdded({
        tenantId: ctx.tenantId!,
        actorId: ctx.userId,
        role: ctx.role,
        underwritingId: uw.id,
        compId: record?.id ?? "unknown",
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

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = buildRequestContext(req as any)
    const uw = await getUnderwritingById(params.id)
    if (!uw) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (ctx.role === "investor") throw new AccessError("Investors cannot access comps")
    if (ctx.role === "agent") {
      const investorList = await listInvestorsByAgent(ctx.tenantId!, ctx.userId)
      const isMine = investorList.some((i) => i.id === uw.investorId)
      if (!isMine) throw new AccessError("Forbidden")
    }
    const comps = await listComps(ctx.tenantId!, uw.id)
    return NextResponse.json(comps)
  } catch (err) {
    return handleError(err)
  }
}

