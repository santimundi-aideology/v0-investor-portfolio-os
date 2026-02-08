import { NextResponse } from "next/server"

import { AuditEvents, createAuditEventWriter } from "@/lib/audit"
import { createListingDb, listListings } from "@/lib/db/listings"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError, assertTenantScope } from "@/lib/security/rbac"

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthContext(req)
    assertTenantScope(ctx.tenantId!, ctx)
    if (ctx.role === "investor") throw new AccessError("Investors cannot access listings")
    const listings = await listListings(ctx.tenantId!)
    return NextResponse.json(listings)
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthContext(req)
    if (ctx.role !== "agent" && ctx.role !== "super_admin") {
      throw new AccessError("Only agents can create listings")
    }
    assertTenantScope(ctx.tenantId!, ctx)
    const body = await req.json()
    const record = await createListingDb({
      tenantId: ctx.tenantId!,
      title: body.title,
      area: body.area,
      address: body.address,
      type: body.type,
      status: body.status ?? "available",
      price: body.price,
      size: body.size,
      bedrooms: body.bedrooms,
      bathrooms: body.bathrooms,
      readiness: body.readiness,
      developer: body.developer,
      expectedRent: body.expectedRent,
      currency: body.currency,
      handoverDate: body.handoverDate,
    })
    
    if (!record) throw new Error("Failed to create listing")

    const write = createAuditEventWriter()
    await write(
      AuditEvents.listingCreated({
        tenantId: ctx.tenantId!,
        actorId: ctx.userId,
        role: ctx.role,
        listingId: record.id,
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

