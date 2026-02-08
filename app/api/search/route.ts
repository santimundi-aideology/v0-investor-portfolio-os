import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError } from "@/lib/security/rbac"

/**
 * GET /api/search
 * Search investors and properties for command palette
 */
export async function GET(req: Request) {
  try {
    const ctx = await requireAuthContext(req)
    if (!ctx.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const query = searchParams.get("q") || ""
    const limit = Number(searchParams.get("limit") || "10")

    if (!query || query.length < 2) {
      return NextResponse.json({ investors: [], properties: [] })
    }

    const supabase = getSupabaseAdminClient()
    const searchTerm = `%${query}%`

    // Search investors
    const { data: investors } = await supabase
      .from("investors")
      .select("id, name, company, email")
      .eq("org_id", ctx.tenantId)
      .or(`name.ilike.${searchTerm},company.ilike.${searchTerm},email.ilike.${searchTerm}`)
      .limit(limit)

    // Search properties/listings
    const { data: properties } = await supabase
      .from("listings")
      .select("id, title, area, building_name, property_type")
      .eq("tenant_id", ctx.tenantId)
      .or(`title.ilike.${searchTerm},area.ilike.${searchTerm},building_name.ilike.${searchTerm}`)
      .limit(limit)

    return NextResponse.json({
      investors: investors || [],
      properties: properties || [],
    })
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[search] Error:", err)
    return NextResponse.json({ error: "Failed to search" }, { status: 500 })
  }
}
