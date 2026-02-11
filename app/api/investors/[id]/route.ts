import { NextResponse } from "next/server"

import { deleteInvestorDb, getInvestorById, updateInvestorDb } from "@/lib/db/investors"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError, assertInvestorAccess } from "@/lib/security/rbac"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuthContext(req)
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
    const ctx = await requireAuthContext(req)
    const investor = await getInvestorById((await params).id)
    if (!investor) return NextResponse.json({ error: "Not found" }, { status: 404 })
    assertInvestorAccess(investor, ctx)

    const body = await req.json()
    const patch = {
      name: body.name,
      company: body.company,
      email: body.email,
      phone: body.phone,
      status: body.status,
      mandate: body.mandate,
      lastContact: body.lastContact,
      totalDeals: body.totalDeals,
      assignedAgentId: body.assignedAgentId,
      ownerUserId: body.ownerUserId,
      avatar: body.avatar,
      description: body.description,
      thesisReturnStyle: body.thesisReturnStyle,
      thesisHoldPeriod: body.thesisHoldPeriod,
      thesisPreferredExits: body.thesisPreferredExits,
      thesisNotes: body.thesisNotes,
    }
    const updated = await updateInvestorDb((await params).id, patch)
    return NextResponse.json(updated)
  } catch (err) {
    return handleError(err)
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuthContext(req)
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

