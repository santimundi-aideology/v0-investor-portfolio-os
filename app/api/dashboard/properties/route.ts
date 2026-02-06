import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { buildRequestContext } from "@/lib/security/rbac"

/**
 * GET /api/dashboard/properties
 * Returns properties for dashboard (readiness status, featured properties)
 */
export async function GET(req: Request) {
  try {
    const ctx = buildRequestContext(req)
    if (!ctx.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = getSupabaseAdminClient()

    // Get all properties for readiness buckets
    // Note: column is "readiness" (not "readiness_status"), and "image_url" does not exist
    const { data: allProperties, error: propErr } = await supabase
      .from("listings")
      .select("id, title, area, readiness, status, price, attachments")
      .eq("tenant_id", ctx.tenantId)
    if (propErr) console.warn("[dashboard/properties] query error:", propErr.message)

    // Normalize DB readiness values to UI values:
    //   "Ready" -> "READY_FOR_MEMO", "Off-Plan" -> "NEEDS_VERIFICATION", null -> "DRAFT"
    function normalizeReadiness(dbVal: string | null): string {
      if (!dbVal) return "DRAFT"
      const lower = dbVal.toLowerCase()
      if (lower === "ready") return "READY_FOR_MEMO"
      if (lower === "off-plan" || lower === "offplan") return "NEEDS_VERIFICATION"
      return dbVal.toUpperCase().replace(/[\s-]+/g, "_")
    }

    // Count by readiness status
    const readinessBuckets: Record<string, number> = {}
    allProperties?.forEach((p) => {
      const status = normalizeReadiness(p.readiness)
      readinessBuckets[status] = (readinessBuckets[status] || 0) + 1
    })

    // Properties needing verification (off-plan or those without readiness)
    const verificationQueue = allProperties
      ?.filter((p) => normalizeReadiness(p.readiness) === "NEEDS_VERIFICATION")
      .slice(0, 4)
      .map((p) => ({
        id: p.id,
        title: p.title || "Untitled Property",
        area: p.area || "",
      })) || []

    // Featured properties (available, ready for memo)
    const featuredProperties = allProperties
      ?.filter((p) => p.status === "available" && normalizeReadiness(p.readiness) === "READY_FOR_MEMO")
      .slice(0, 8)
      .map((p) => ({
        id: p.id,
        title: p.title || "Untitled Property",
        area: p.area || "",
        imageUrl: null,
        price: Number(p.price) || 0,
      })) || []

    return NextResponse.json({
      readinessBuckets,
      verificationQueue,
      featuredProperties,
      totalProperties: allProperties?.length || 0,
    })
  } catch (err) {
    console.error("[dashboard/properties] Error:", err)
    return NextResponse.json({ error: "Failed to fetch properties" }, { status: 500 })
  }
}
