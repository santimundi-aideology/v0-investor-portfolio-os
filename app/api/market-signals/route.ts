import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { buildRequestContext } from "@/lib/security/rbac"

/**
 * GET /api/market-signals
 * Returns DLD market signals for the dashboard
 */
export async function GET(req: Request) {
  try {
    const ctx = buildRequestContext(req)
    // Market signals are tenant-scoped but can be public for demo
    const supabase = getSupabaseAdminClient()

    const { searchParams } = new URL(req.url)
    const limit = Number(searchParams.get("limit") || "50")
    const activeOnly = searchParams.get("activeOnly") === "true"

    let query = supabase
      .from("dld_market_signals")
      .select("*")
      .order("detected_at", { ascending: false })
      .limit(limit)

    if (activeOnly) {
      query = query.eq("is_active", true)
    }

    const { data: signals, error } = await query

    if (error) throw error

    // Transform DLD signals to MarketSignalItem format
    const transformedSignals = (signals || []).map((s) => ({
      id: s.id,
      type: s.signal_type as string,
      sourceType: "dld" as const,
      severity: (s.severity || "medium") as "low" | "medium" | "high",
      status: s.is_active ? ("active" as const) : ("resolved" as const),
      title: s.title,
      description: s.description || "",
      area: s.area_name_en || "",
      propertyType: s.property_type_en || null,
      detectedAt: s.detected_at || s.created_at,
      validUntil: s.valid_until || null,
      metrics: (s.metrics || {}) as Record<string, unknown>,
      evidence: {} as Record<string, unknown>,
      propertyTitle: s.title || null, // Use title from DLD signals
    }))

    return NextResponse.json({ signals: transformedSignals })
  } catch (err) {
    console.error("[market-signals] Error:", err)
    return NextResponse.json({ error: "Failed to fetch market signals" }, { status: 500 })
  }
}
