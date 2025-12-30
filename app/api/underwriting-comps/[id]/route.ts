import { NextResponse } from "next/server"

import { AuditEvents, createAuditEventWriter } from "@/lib/audit"
import { listInvestorsByAgent } from "@/lib/db/investors"
import { deleteCompDb, getCompById } from "@/lib/db/comps"
import { getUnderwritingById } from "@/lib/db/underwritings"
import { AccessError, buildRequestContext } from "@/lib/security/rbac"

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = buildRequestContext(req)
    const comp = await getCompById((await params).id)
    if (!comp) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const uw = await getUnderwritingById(comp.underwritingId)
    if (!uw) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (ctx.role === "manager") throw new AccessError("Managers are read-only")
    if (ctx.role === "investor") throw new AccessError("Investors cannot delete comps")
    if (ctx.role === "agent") {
      const investorList = await listInvestorsByAgent(ctx.tenantId!, ctx.userId)
      const isMine = investorList.some((i) => i.id === uw.investorId)
      if (!isMine) throw new AccessError("Forbidden")
    }

    await deleteCompDb((await params).id)

    const write = createAuditEventWriter()
    await write(
      AuditEvents.underwritingCompRemoved({
        tenantId: ctx.tenantId!,
        actorId: ctx.userId,
        role: ctx.role,
        underwritingId: uw.id,
        compId: (await params).id,
      }),
    )

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

