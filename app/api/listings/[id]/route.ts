import { NextResponse } from "next/server"

import { deleteListingDb, getListingById, updateListingDb } from "@/lib/db/listings"
import { AccessError, assertTenantScope, buildRequestContext } from "@/lib/security/rbac"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = buildRequestContext(req)
    assertTenantScope(ctx.tenantId!, ctx)
    const listing = await getListingById((await params).id)
    if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (ctx.role === "investor") throw new AccessError("Investors cannot access listings directly")
    return NextResponse.json(listing)
  } catch (err) {
    return handleError(err)
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = buildRequestContext(req)
    if (ctx.role !== "agent" && ctx.role !== "super_admin") throw new AccessError("Only agents can update listings")
    assertTenantScope(ctx.tenantId!, ctx)
    const body = await req.json()
    const updated = await updateListingDb((await params).id, body)
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(updated)
  } catch (err) {
    return handleError(err)
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = buildRequestContext(req)
    if (ctx.role !== "agent" && ctx.role !== "super_admin") throw new AccessError("Only agents can delete listings")
    assertTenantScope(ctx.tenantId!, ctx)
    await deleteListingDb((await params).id)
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

