import { NextResponse } from "next/server"

import { AuditEvents, createAuditEventWriter } from "@/lib/audit"
import { listInvestorsByAgent } from "@/lib/db/investors"
import { getUnderwritingById, updateUnderwritingDb } from "@/lib/db/underwritings"
import { computeConfidence, computeScenarios } from "@/lib/domain/underwriting"
import { AccessError, buildRequestContext } from "@/lib/security/rbac"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = buildRequestContext(req)
    const uw = await getUnderwritingById((await params).id)
    if (!uw) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (ctx.role === "investor") throw new AccessError("Investors cannot access underwritings")

    if (ctx.role === "agent") {
      const investorList = await listInvestorsByAgent(ctx.tenantId!, ctx.userId)
      const isMine = investorList.some((i) => i.id === uw.investorId)
      if (!isMine) throw new AccessError("Forbidden")
    }
    // manager/super_admin allowed
    return NextResponse.json(uw)
  } catch (err) {
    return handleError(err)
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = buildRequestContext(req)
    const uw = await getUnderwritingById((await params).id)
    if (!uw) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (ctx.role === "manager") throw new AccessError("Managers are read-only on underwritings")
    if (ctx.role === "investor") throw new AccessError("Investors cannot access underwritings")
    if (ctx.role === "agent") {
      const investorList = await listInvestorsByAgent(ctx.tenantId!, ctx.userId)
      const isMine = investorList.some((i) => i.id === uw.investorId)
      if (!isMine) throw new AccessError("Forbidden")
    }

    const body = await req.json()
    const scenarios = computeScenarios({
      price: body.inputs?.price ?? uw.inputs?.price,
      rent: body.inputs?.rent ?? uw.inputs?.rent,
      fees: body.inputs?.fees ?? uw.inputs?.fees,
      vacancy: body.inputs?.vacancy ?? uw.inputs?.vacancy,
    })

    const updated = await updateUnderwritingDb((await params).id, {
      inputs: body.inputs ?? uw.inputs,
      scenarios,
      confidence: computeConfidence([], body.inputs ?? uw.inputs), // comps pulled separately
    })

    const write = createAuditEventWriter()
    await write(
      AuditEvents.underwritingUpdated({
        tenantId: ctx.tenantId!,
        actorId: ctx.userId,
        role: ctx.role,
        underwritingId: (await params).id,
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

