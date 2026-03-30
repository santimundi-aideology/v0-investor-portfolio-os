import { NextResponse } from "next/server"

import { getInvestorById } from "@/lib/db/investors"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError } from "@/lib/security/rbac"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuthContext(req)
    const { id } = await params
    const investor = await getInvestorById(id)
    if (!investor) {
      return NextResponse.json({ error: "Investor not found" }, { status: 404 })
    }

    if (ctx.role === "investor") {
      // Investors may only read their own record (from the investor portal)
      const isSelf = ctx.investorId === id
      if (!isSelf) {
        throw new AccessError("Investors can only access their own profile")
      }
    } else if (ctx.tenantId && investor.tenantId !== ctx.tenantId) {
      throw new AccessError("Cross-tenant access denied")
    }

    return NextResponse.json(investor)
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[investors/[id]] Error:", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
