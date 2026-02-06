import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"

/**
 * GET /api/market-report?area=Business%20Bay
 * Returns comprehensive market data for generating a market report
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const area = searchParams.get("area")
    
    if (!area) {
      return NextResponse.json({ error: "area parameter is required" }, { status: 400 })
    }
    
    const supabase = getSupabaseAdminClient()
    
    // Run all queries in parallel
    const [
      transactionsRes,
      monthlyRes,
      propertyTypesRes,
      recentTxnsRes,
      listingsRes,
      signalsRes,
    ] = await Promise.all([
      // Area summary stats
      supabase.rpc("exec_sql_readonly", {
        sql_query: `
          SELECT 
            COUNT(*)::int as total_transactions,
            ROUND(AVG(actual_worth))::bigint as avg_price,
            ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY actual_worth))::bigint as median_price,
            ROUND(MIN(actual_worth))::bigint as min_price,
            ROUND(MAX(actual_worth))::bigint as max_price,
            ROUND(AVG(meter_sale_price))::bigint as avg_psm,
            ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY meter_sale_price))::bigint as median_psm,
            ROUND(SUM(actual_worth))::bigint as total_volume
          FROM dld_transactions 
          WHERE area_name_en = '${area.replace(/'/g, "''")}'
            AND trans_group_en = 'Sales' 
            AND actual_worth > 0
        `,
      }),
      // Monthly trends
      supabase.rpc("exec_sql_readonly", {
        sql_query: `
          SELECT 
            TO_CHAR(DATE_TRUNC('month', instance_date::date), 'YYYY-MM') as month,
            COUNT(*)::int as txn_count,
            ROUND(AVG(actual_worth))::bigint as avg_price,
            ROUND(AVG(meter_sale_price))::bigint as avg_psm,
            ROUND(SUM(actual_worth))::bigint as volume
          FROM dld_transactions 
          WHERE area_name_en = '${area.replace(/'/g, "''")}'
            AND trans_group_en = 'Sales' 
            AND actual_worth > 0
            AND instance_date IS NOT NULL
          GROUP BY DATE_TRUNC('month', instance_date::date)
          ORDER BY month
        `,
      }),
      // Property type breakdown
      supabase.rpc("exec_sql_readonly", {
        sql_query: `
          SELECT 
            property_type_en as property_type,
            COUNT(*)::int as count,
            ROUND(AVG(actual_worth))::bigint as avg_price,
            ROUND(AVG(meter_sale_price))::bigint as avg_psm
          FROM dld_transactions 
          WHERE area_name_en = '${area.replace(/'/g, "''")}'
            AND trans_group_en = 'Sales' 
            AND actual_worth > 0
          GROUP BY property_type_en
          ORDER BY count DESC
          LIMIT 10
        `,
      }),
      // Recent notable transactions
      supabase
        .from("dld_transactions")
        .select("transaction_id, instance_date, property_type_en, property_sub_type_en, building_name_en, project_name_en, rooms_en, actual_worth, meter_sale_price, procedure_area")
        .eq("area_name_en", area)
        .eq("trans_group_en", "Sales")
        .gt("actual_worth", 0)
        .order("instance_date", { ascending: false })
        .limit(15),
      // Active listings
      supabase
        .from("portal_listings")
        .select("id, asking_price, price_per_sqm, bedrooms, size_sqm, property_type, listing_type, building_name, days_on_market")
        .eq("area_name", area)
        .eq("is_active", true)
        .limit(100),
      // Active signals
      supabase
        .from("market_signal")
        .select("id, type, severity, geo_name, confidence_score, evidence, created_at")
        .eq("geo_name", area)
        .eq("status", "new")
        .order("created_at", { ascending: false })
        .limit(10),
    ])
    
    // Process stats
    const rawStats = transactionsRes.data
    const stats = Array.isArray(rawStats) && rawStats.length > 0 ? rawStats[0] : rawStats
    
    // Process monthly
    const monthly = Array.isArray(monthlyRes.data) ? monthlyRes.data : []
    
    // Process property types
    const propertyTypes = Array.isArray(propertyTypesRes.data) ? propertyTypesRes.data : []
    
    // Process listings for supply analysis
    const listings = listingsRes.data || []
    const saleListings = listings.filter((l) => l.listing_type === "sale")
    const rentListings = listings.filter((l) => l.listing_type === "rent")
    
    const supplyAnalysis = {
      totalActive: listings.length,
      forSale: saleListings.length,
      forRent: rentListings.length,
      avgAskingPrice: saleListings.length > 0
        ? Math.round(saleListings.reduce((s, l) => s + (l.asking_price || 0), 0) / saleListings.length)
        : 0,
      avgRent: rentListings.length > 0
        ? Math.round(rentListings.reduce((s, l) => s + (l.asking_price || 0), 0) / rentListings.length)
        : 0,
      avgDaysOnMarket: listings.length > 0
        ? Math.round(listings.reduce((s, l) => s + (l.days_on_market || 0), 0) / listings.length)
        : 0,
    }
    
    // Compute estimated yield
    const estimatedYield = supplyAnalysis.avgRent > 0 && supplyAnalysis.avgAskingPrice > 0
      ? Math.round(((supplyAnalysis.avgRent * 12) / supplyAnalysis.avgAskingPrice) * 1000) / 10
      : null
    
    // Price trend analysis
    const sortedMonthly = [...monthly].sort((a, b) => 
      (a as Record<string, string>).month.localeCompare((b as Record<string, string>).month)
    )
    let priceTrend = "stable"
    if (sortedMonthly.length >= 3) {
      const recentAvg = sortedMonthly.slice(-3).reduce((s, m) => s + Number((m as Record<string, number>).avg_psm || 0), 0) / 3
      const olderAvg = sortedMonthly.slice(0, 3).reduce((s, m) => s + Number((m as Record<string, number>).avg_psm || 0), 0) / 3
      if (olderAvg > 0) {
        const change = ((recentAvg - olderAvg) / olderAvg) * 100
        priceTrend = change > 5 ? "rising" : change < -5 ? "declining" : "stable"
      }
    }
    
    return NextResponse.json({
      area,
      generatedAt: new Date().toISOString(),
      stats: stats || {},
      monthlyTrends: monthly,
      propertyTypes,
      recentTransactions: recentTxnsRes.data || [],
      supplyAnalysis,
      estimatedYield,
      priceTrend,
      signals: (signalsRes.data || []).map((s) => ({
        id: s.id,
        type: s.type,
        severity: s.severity,
        confidence: s.confidence_score,
        createdAt: s.created_at,
      })),
    })
  } catch (err) {
    console.error("[market-report] Error:", err)
    return NextResponse.json({ error: "Failed to generate market report" }, { status: 500 })
  }
}
