import { NextResponse } from "next/server"

import { AuditEvents, createAuditEventWriter } from "@/lib/audit"
import { getInvestorById, updateInvestorDb } from "@/lib/db/investors"
import { AccessError, assertInvestorAccess, buildRequestContext } from "@/lib/security/rbac"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = buildRequestContext(req)
    if (ctx.role !== "manager" && ctx.role !== "super_admin") {
      throw new AccessError("Only manager or super_admin can reassign investors")
    }

    const investor = await getInvestorById((await params).id)
    if (!investor) return NextResponse.json({ error: "Not found" }, { status: 404 })
    assertInvestorAccess(investor, ctx)

    const body = await req.json()
    if (!body.assignedAgentId) throw new AccessError("assignedAgentId is required")

    const updated = await updateInvestorDb((await params).id, { assignedAgentId: body.assignedAgentId })

    const write = createAuditEventWriter()
    await write(
      AuditEvents.investorAssigned({
        tenantId: ctx.tenantId!,
        actorId: ctx.userId,
        role: ctx.role,
        investorId: (await params).id,
        fromAgentId: investor.assignedAgentId,
        toAgentId: body.assignedAgentId,
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

