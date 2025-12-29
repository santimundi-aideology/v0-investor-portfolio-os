import { NextResponse } from "next/server"

import { createUnderwritingDb } from "@/lib/db/underwritings"
import { addCompDb, listComps } from "@/lib/db/comps"
import { computeScenarios } from "@/lib/domain/underwriting"
import { buildRequestContext } from "@/lib/security/rbac"

export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ error: "Not found" }, { status: 404 })

  const ctx = buildRequestContext(req as any)
  if (ctx.role !== "super_admin") return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (!ctx.tenantId) return NextResponse.json({ error: "tenant required" }, { status: 400 })

  const uw = await createUnderwritingDb({
    tenantId: ctx.tenantId,
    investorId: "test-investor",
    listingId: "test-listing",
    inputs: { price: 1000000, rent: 80000, fees: 5000, vacancy: 1 },
    scenarios: computeScenarios({ price: 1000000, rent: 80000, fees: 5000, vacancy: 1 }),
    createdBy: ctx.userId,
  })
  if (!uw) return NextResponse.json({ error: "failed to create uw" }, { status: 500 })

  const comp = await addCompDb({
    tenantId: ctx.tenantId,
    underwritingId: uw.id,
    description: "Test comp",
    price: 950000,
    pricePerSqft: 2000,
    rentPerYear: 78000,
    source: "Test",
    addedBy: ctx.userId,
  })

  const comps = await listComps(ctx.tenantId, uw.id)

  return NextResponse.json({ underwriting: uw, comp, comps })
}

