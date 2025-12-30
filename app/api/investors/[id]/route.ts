import { NextResponse } from "next/server"

import { AuditEvents, createAuditEventWriter } from "@/lib/audit"
import { deleteInvestorDb, getInvestorById, updateInvestorDb } from "@/lib/db/investors"
import { AccessError, assertInvestorAccess, buildRequestContext } from "@/lib/security/rbac"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = buildRequestContext(req as any)
    const investor = await getInvestorById((await params).id)
    if (!investor) return NextResponse.json({ error: "Not found" }, { status: 404 })
    assertInvestorAccess(investor, ctx)
    return NextResponse.json(investor)
  } catch (err) {
    return handleError(err)
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = buildRequestContext(req as any)
    const investor = await getInvestorById((await params).id)
    if (!investor) return NextResponse.json({ error: "Not found" }, { status: 404 })
    assertInvestorAccess(investor, ctx)

    const body = await req.json()
    const updated = await updateInvestorDb((await params).id, body)
    return NextResponse.json(updated)
  } catch (err) {
    return handleError(err)
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = buildRequestContext(req as any)
    const investor = await getInvestorById((await params).id)
    if (!investor) return NextResponse.json({ error: "Not found" }, { status: 404 })
    assertInvestorAccess(investor, ctx)

    if (ctx.role === "investor") throw new AccessError("Investors cannot delete investors")

    await deleteInvestorDb((await params).id)
    return NextResponse.json({ ok: true })
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

