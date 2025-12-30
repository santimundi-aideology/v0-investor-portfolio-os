import { NextResponse } from "next/server"

import { AuditEvents, createAuditEventWriter } from "@/lib/audit"
import { getListingById } from "@/lib/db/listings"
import { getTrustRecord, upsertTrustRecordDb } from "@/lib/db/trust"
import { AccessError, assertTenantScope, buildRequestContext } from "@/lib/security/rbac"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = buildRequestContext(req as any)
    assertTenantScope(ctx.tenantId!, ctx)
    if (ctx.role === "investor") throw new AccessError("Investors cannot modify trust records")

    const listing = await getListingById((await params).id)
    if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 })

    const body = await req.json()
    const record = await upsertTrustRecordDb({
      tenantId: ctx.tenantId!,
      listingId: (await params).id,
      status: body.status,
      reason: body.reason,
      evidenceId: body.evidenceId,
      verifiedAt: body.verifiedAt,
      verifiedBy: ctx.userId,
    })

    const write = createAuditEventWriter()
    await write(
      AuditEvents.trustStatusChanged({
        tenantId: ctx.tenantId!,
        actorId: ctx.userId,
        role: ctx.role,
        listingId: (await params).id,
        status: body.status,
        reason: body.reason,
      }),
    )

    return NextResponse.json(record, { status: 200 })
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

