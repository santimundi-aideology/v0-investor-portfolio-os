import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"

/**
 * GET /api/market-report/all-areas
 * Returns comprehensive breakdown of all Dubai areas with key metrics
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdminClient()
    
    // Get base area stats from DLD transactions
    const { data: areaStatsData, error: areaStatsError } = await supabase.rpc("exec_sql_readonly", {
      sql_query: `
        SELECT 
          area_name_en as area,
          COUNT(*)::int as total_txns,
          ROUND(AVG(actual_worth))::bigint as avg_price,
          ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY actual_worth))::bigint as median_price,
          ROUND(AVG(meter_sale_price))::bigint as avg_psm,
          ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY meter_sale_price))::bigint as median_psm,
          ROUND(SUM(actual_worth))::bigint as total_volume,
          MAX(instance_date::date)::text as latest_transaction
        FROM dld_transactions 
        WHERE trans_group_en = 'Sales' 
          AND actual_worth > 0 
          AND area_name_en IS NOT NULL
        GROUP BY area_name_en
        HAVING COUNT(*) >= 10
        ORDER BY COUNT(*) DESC
        LIMIT 100
      `,
    })
    
    if (areaStatsError) {
      console.error("[market-report/all-areas] Base stats error:", areaStatsError)
      return NextResponse.json({ areas: [] })
    }
    
    const baseStats = Array.isArray(areaStatsData) ? areaStatsData : []
    
    // Get price trend data (3-month comparison)
    const { data: trendData } = await supabase.rpc("exec_sql_readonly", {
      sql_query: `
        SELECT 
          area_name_en as area,
          ROUND(AVG(CASE WHEN instance_date >= CURRENT_DATE - INTERVAL '3 months' THEN meter_sale_price END))::bigint as recent_avg_psm,
          ROUND(AVG(CASE WHEN instance_date >= CURRENT_DATE - INTERVAL '6 months' AND instance_date < CURRENT_DATE - INTERVAL '3 months' THEN meter_sale_price END))::bigint as prev_avg_psm
        FROM dld_transactions
        WHERE trans_group_en = 'Sales'
          AND actual_worth > 0
          AND area_name_en IS NOT NULL
          AND meter_sale_price > 0
        GROUP BY area_name_en
      `,
    })
    
    const trends = Array.isArray(trendData) ? trendData : []
    
    // Get portal listing data
    const { data: portalData } = await supabase.rpc("exec_sql_readonly", {
      sql_query: `
        SELECT 
          area_name as area,
          COUNT(*)::int as active_listings,
          COUNT(CASE WHEN listing_type = 'sale' THEN 1 END)::int as for_sale,
          COUNT(CASE WHEN listing_type = 'rent' THEN 1 END)::int as for_rent,
          ROUND(AVG(CASE WHEN listing_type = 'sale' THEN asking_price END))::bigint as avg_sale_price,
          ROUND(AVG(CASE WHEN listing_type = 'rent' THEN asking_price END))::bigint as avg_rent_price
        FROM portal_listings
        WHERE is_active = true
        GROUP BY area_name
      `,
    })
    
    const portal = Array.isArray(portalData) ? portalData : []
    
    // Merge all data together
    const areas = baseStats.map((stat: any) => {
      const trend = trends.find((t: any) => t.area === stat.area)
      const portalInfo = portal.find((p: any) => p.area === stat.area)
      
      const recentPsm = trend?.recent_avg_psm
      const prevPsm = trend?.prev_avg_psm
      const priceChangePct = recentPsm && prevPsm && prevPsm > 0
        ? Math.round(((recentPsm - prevPsm) / prevPsm * 100) * 10) / 10
        : null
      
      const avgSale = portalInfo?.avg_sale_price
      const avgRent = portalInfo?.avg_rent_price
      const estimatedYield = avgRent && avgSale && avgSale > 0
        ? Math.round((avgRent * 12 / avgSale * 100) * 10) / 10
        : null
      
      return {
        area: stat.area,
        total_txns: stat.total_txns,
        avg_price: stat.avg_price,
        median_price: stat.median_price,
        avg_psm: stat.avg_psm,
        median_psm: stat.median_psm,
        total_volume: stat.total_volume,
        latest_transaction: stat.latest_transaction,
        recent_avg_psm: recentPsm,
        prev_avg_psm: prevPsm,
        price_change_pct: priceChangePct,
        active_listings: portalInfo?.active_listings || null,
        for_sale: portalInfo?.for_sale || null,
        for_rent: portalInfo?.for_rent || null,
        portal_avg_sale: avgSale || null,
        portal_avg_rent: avgRent || null,
        estimated_yield: estimatedYield,
      }
    })
    
    return NextResponse.json({ 
      areas,
      summary: {
        totalAreas: areas.length,
        totalTransactions: areas.reduce((sum: number, a: any) => sum + (a.total_txns || 0), 0),
        totalVolume: areas.reduce((sum: number, a: any) => sum + (a.total_volume || 0), 0),
      }
    })
  } catch (err) {
    console.error("[market-report/all-areas] Error:", err)
    return NextResponse.json({ error: "Failed to fetch area breakdown" }, { status: 500 })
  }
}
