import { NextResponse } from "next/server"

import { AuditEvents, createAuditEventWriter } from "@/lib/audit"
import { listInvestorsByAgent } from "@/lib/db/investors"
import { createUnderwritingDb, listUnderwritingsForAgent, listUnderwritingsForTenant } from "@/lib/db/underwritings"
import { computeConfidence, computeScenarios } from "@/lib/domain/underwriting"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError } from "@/lib/security/rbac"

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthContext(req)
    const tenantId = ctx.tenantId!

    if (ctx.role === "investor") throw new AccessError("Investors cannot access underwritings")

    if (ctx.role === "agent") {
      const investorIds = new Set((await listInvestorsByAgent(tenantId, ctx.userId)).map((i) => i.id))
      const list = await listUnderwritingsForAgent(tenantId, ctx.userId, async (invId) => investorIds.has(invId))
      return NextResponse.json(list)
    }

    const dbAll = await listUnderwritingsForTenant(tenantId)
    return NextResponse.json(dbAll)
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthContext(req)
    if (ctx.role !== "agent" && ctx.role !== "super_admin") throw new AccessError("Only agents can create underwritings")

    const body = await req.json()
    const tenantId = ctx.tenantId!
    const investorList = await listInvestorsByAgent(tenantId, ctx.userId)
    const investor = investorList.find((i) => i.id === body.investorId)
    if (!investor && ctx.role !== "super_admin") throw new AccessError("Investor not found or not assigned")

    if (!body.listingId) throw new AccessError("listingId is required")

    const scenarios = computeScenarios({
      price: body.inputs?.price,
      rent: body.inputs?.rent,
      fees: body.inputs?.fees,
      vacancy: body.inputs?.vacancy,
    })
    const record =
      (await createUnderwritingDb({
        tenantId,
        investorId: body.investorId,
        listingId: body.listingId,
        inputs: body.inputs ?? {},
        scenarios,
        createdBy: ctx.userId,
        confidence: computeConfidence([], body.inputs ?? {}),
      })) ?? undefined

    const write = createAuditEventWriter()
    await write(
      AuditEvents.underwritingCreated({
        tenantId,
        actorId: ctx.userId,
        role: ctx.role,
        underwritingId: record?.id ?? "unknown",
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

