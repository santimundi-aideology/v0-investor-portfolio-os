import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"

/**
 * GET /api/dld/signals - Get market signals derived from DLD data
 * 
 * Query parameters:
 *   - type: Filter by signal type ('area_hot', 'premium_area', 'high_value_sale', 'value_opportunity')
 *   - area: Filter by area name
 *   - severity: Filter by severity ('info', 'warning', 'opportunity', 'alert')
 *   - active_only: If "true", only return active signals (default: true)
 *   - limit: Number of results (default 50)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    
    const type = searchParams.get("type")
    const area = searchParams.get("area")
    const severity = searchParams.get("severity")
    const activeOnly = searchParams.get("active_only") !== "false"
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200)

    const supabase = getSupabaseAdminClient()

    // Use view with coordinates
    let query = supabase
      .from("dld_signals_with_coords")
      .select("*")
      .order("detected_at", { ascending: false })
      .limit(limit)

    if (type) query = query.eq("signal_type", type)
    if (area) query = query.ilike("area_name_en", `%${area}%`)
    if (severity) query = query.eq("severity", severity)
    if (activeOnly) query = query.eq("is_active", true)

    const { data, error } = await query

    if (error) throw error

    // Group by type for summary
    const summary: Record<string, number> = {}
    for (const signal of data || []) {
      summary[signal.signal_type] = (summary[signal.signal_type] || 0) + 1
    }

    return NextResponse.json({
      filters: { type, area, severity, activeOnly },
      summary,
      total: data?.length || 0,
      signals: data,
    })
  } catch (err) {
    console.error("DLD Signals API error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/dld/signals/refresh - Regenerate market signals from latest DLD data
 */
export async function POST(req: Request) {
  try {
    const supabase = getSupabaseAdminClient()

    // Mark existing signals as inactive
    await supabase
      .from("dld_market_signals")
      .update({ is_active: false })
      .eq("is_active", true)

    // Generate fresh signals - this would typically be a stored procedure
    // For now, we'll do it with multiple queries

    // 1. Hot Areas
    const { data: hotAreas } = await supabase
      .from("dld_transactions")
      .select("area_name_en, actual_worth, meter_sale_price")
      .eq("trans_group_en", "Sales")
      .gt("actual_worth", 0)

    if (hotAreas) {
      const areaStats: Record<string, { count: number; totalValue: number; totalPsm: number; psmCount: number }> = {}
      
      for (const row of hotAreas) {
        const area = row.area_name_en || "Unknown"
        if (!areaStats[area]) {
          areaStats[area] = { count: 0, totalValue: 0, totalPsm: 0, psmCount: 0 }
        }
        areaStats[area].count++
        areaStats[area].totalValue += row.actual_worth || 0
        if (row.meter_sale_price) {
          areaStats[area].totalPsm += row.meter_sale_price
          areaStats[area].psmCount++
        }
      }

      const signals = Object.entries(areaStats)
        .filter(([_, s]) => s.count >= 100)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10)
        .map(([area, stats]) => ({
          signal_type: "area_hot",
          area_name_en: area,
          title: `High Activity: ${area}`,
          description: `${area} showing strong transaction volume with ${stats.count} sales. Avg price: AED ${Math.round(stats.totalValue / stats.count / 1000000 * 10) / 10}M`,
          severity: "opportunity",
          metrics: {
            transaction_count: stats.count,
            avg_price: Math.round(stats.totalValue / stats.count),
            avg_price_per_sqm: stats.psmCount > 0 ? Math.round(stats.totalPsm / stats.psmCount) : null,
          },
          valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          is_active: true,
        }))

      if (signals.length > 0) {
        await supabase.from("dld_market_signals").insert(signals)
      }
    }

    // Get updated count
    const { count } = await supabase
      .from("dld_market_signals")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)

    return NextResponse.json({
      success: true,
      message: "Market signals refreshed",
      active_signals: count,
    })
  } catch (err) {
    console.error("DLD Signals refresh error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}
