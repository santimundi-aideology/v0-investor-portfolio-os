import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError } from "@/lib/security/rbac"

/**
 * GET /api/dashboard/properties
 * Returns properties for dashboard (readiness status, featured properties)
 */
export async function GET(req: Request) {
  try {
    const ctx = await requireAuthContext(req)
    if (!ctx.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = getSupabaseAdminClient()

    // Get all properties for readiness buckets
    const { data: allProperties } = await supabase
      .from("listings")
      .select("id, title, area, readiness_status, status, image_url")
      .eq("tenant_id", ctx.tenantId)

    // Count by readiness status
    const readinessBuckets: Record<string, number> = {}
    allProperties?.forEach((p) => {
      const status = p.readiness_status || "DRAFT"
      readinessBuckets[status] = (readinessBuckets[status] || 0) + 1
    })

    // Properties needing verification
    const verificationQueue = allProperties
      ?.filter((p) => p.readiness_status === "NEEDS_VERIFICATION")
      .slice(0, 4)
      .map((p) => ({
        id: p.id,
        title: p.title || "Untitled Property",
        area: p.area || "",
        imageUrl: p.image_url || null,
      })) || []

    // Featured properties (available, ready for memo)
    const featuredProperties = allProperties
      ?.filter((p) => p.status === "available" && p.readiness_status === "READY_FOR_MEMO")
      .slice(0, 8)
      .map((p) => ({
        id: p.id,
        title: p.title || "Untitled Property",
        area: p.area || "",
        imageUrl: p.image_url || null,
        price: 0, // Would need to join with pricing data
      })) || []

    return NextResponse.json({
      readinessBuckets,
      verificationQueue,
      featuredProperties,
      totalProperties: allProperties?.length || 0,
    })
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[dashboard/properties] Error:", err)
    return NextResponse.json({ error: "Failed to fetch properties" }, { status: 500 })
  }
}
