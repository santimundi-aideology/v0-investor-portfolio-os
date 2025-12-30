import { NextResponse } from "next/server"

import { AuditEvents, createAuditEventWriter } from "@/lib/audit"
import { createInvestorDb, listInvestorsByAgent, listInvestorsByTenant } from "@/lib/db/investors"
import { getInvestor } from "@/lib/data/store"
import { AccessError, assertInvestorAccess, buildRequestContext } from "@/lib/security/rbac"

export async function GET(req: Request) {
  try {
    const ctx = buildRequestContext(req as any)
    const tenantId = ctx.tenantId!

    if (ctx.role === "investor") {
      throw new AccessError("Investors cannot list investors")
    }

    if (ctx.role === "agent") {
      const mine = await listInvestorsByAgent(tenantId, ctx.userId)
      return NextResponse.json(mine)
    }

    // manager / super_admin
    const all = await listInvestorsByTenant(tenantId)
    return NextResponse.json(all)
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(req: Request) {
  try {
    const ctx = buildRequestContext(req as any)
    if (ctx.role === "investor") throw new AccessError("Investors cannot create investors")
    const body = await req.json()

    const assignedAgentId = ctx.role === "agent" ? ctx.userId : body.assignedAgentId ?? ctx.userId
    const record = await createInvestorDb({
      tenantId: ctx.tenantId!,
      name: body.name,
      company: body.company,
      email: body.email,
      phone: body.phone,
      status: body.status ?? "active",
      mandate: body.mandate,
      lastContact: body.lastContact,
      assignedAgentId,
      ownerUserId: body.ownerUserId ?? null,
    })
    if (!record) throw new Error("Failed to create investor")

    const write = createAuditEventWriter()
    await write(
      AuditEvents.investorCreated({
        tenantId: ctx.tenantId!,
        actorId: ctx.userId,
        role: ctx.role,
        investorId: record.id,
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

