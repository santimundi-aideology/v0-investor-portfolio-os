import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"

/**
 * GET /api/dld/trends - Get market trends and price changes
 * 
 * Query parameters:
 *   - area: Filter by area name
 *   - property_type: Filter by property type
 *   - period: "monthly", "quarterly", "yearly" (default: monthly)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const area = searchParams.get("area")
    const propertyType = searchParams.get("property_type")
    const period = searchParams.get("period") || "monthly"

    const supabase = getSupabaseAdminClient()

    let query = supabase
      .from("dld_transactions")
      .select("instance_date, actual_worth, meter_sale_price, area_name_en, property_type_en")
      .eq("trans_group_en", "Sales")
      .gt("actual_worth", 0)
      .not("instance_date", "is", null)
      .order("instance_date", { ascending: true })

    if (area) query = query.ilike("area_name_en", `%${area}%`)
    if (propertyType) query = query.eq("property_type_en", propertyType)

    const { data, error } = await query.limit(50000)

    if (error) throw error

    // Group by period
    const periodData: Record<string, {
      count: number
      totalValue: number
      totalPricePerSqm: number
      pricePerSqmCount: number
    }> = {}

    for (const row of data || []) {
      if (!row.instance_date) continue
      
      let periodKey: string
      const date = new Date(row.instance_date)
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      const quarter = Math.ceil(month / 3)

      switch (period) {
        case "yearly":
          periodKey = `${year}`
          break
        case "quarterly":
          periodKey = `${year}-Q${quarter}`
          break
        default: // monthly
          periodKey = `${year}-${String(month).padStart(2, "0")}`
      }

      if (!periodData[periodKey]) {
        periodData[periodKey] = {
          count: 0,
          totalValue: 0,
          totalPricePerSqm: 0,
          pricePerSqmCount: 0,
        }
      }

      periodData[periodKey].count++
      periodData[periodKey].totalValue += row.actual_worth || 0
      if (row.meter_sale_price) {
        periodData[periodKey].totalPricePerSqm += row.meter_sale_price
        periodData[periodKey].pricePerSqmCount++
      }
    }

    // Calculate averages and trends
    const trends = Object.entries(periodData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([periodKey, stats]) => ({
        period: periodKey,
        transaction_count: stats.count,
        avg_price: Math.round(stats.totalValue / stats.count),
        avg_price_per_sqm: stats.pricePerSqmCount > 0
          ? Math.round(stats.totalPricePerSqm / stats.pricePerSqmCount)
          : null,
        total_volume: Math.round(stats.totalValue),
      }))

    // Calculate period-over-period changes
    const trendsWithChange = trends.map((t, i) => {
      if (i === 0) return { ...t, price_change_pct: null, volume_change_pct: null }
      
      const prev = trends[i - 1]
      const priceChange = prev.avg_price > 0 
        ? ((t.avg_price - prev.avg_price) / prev.avg_price) * 100 
        : null
      const volumeChange = prev.total_volume > 0
        ? ((t.total_volume - prev.total_volume) / prev.total_volume) * 100
        : null

      return {
        ...t,
        price_change_pct: priceChange ? Math.round(priceChange * 10) / 10 : null,
        volume_change_pct: volumeChange ? Math.round(volumeChange * 10) / 10 : null,
      }
    })

    return NextResponse.json({
      filters: { area, propertyType, period },
      total_periods: trendsWithChange.length,
      trends: trendsWithChange,
    })
  } catch (err) {
    console.error("DLD Trends API error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}
