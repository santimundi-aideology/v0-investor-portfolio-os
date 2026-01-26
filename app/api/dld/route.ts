import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"

/**
 * GET /api/dld - Query Dubai Land Department transaction data
 * 
 * Query parameters:
 *   - area: Filter by area name (e.g., "Dubai Marina", "Downtown Dubai")
 *   - type: Filter by transaction type: "Sales", "Mortgages", "Gifts"
 *   - property_type: Filter by property type: "Villa", "Land", "Building", "Unit"
 *   - min_price: Minimum price in AED
 *   - max_price: Maximum price in AED
 *   - from_date: Start date (YYYY-MM-DD)
 *   - to_date: End date (YYYY-MM-DD)
 *   - limit: Number of results (default 100, max 1000)
 *   - offset: Pagination offset
 *   - stats: If "true", return aggregated statistics instead of transactions
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    
    const area = searchParams.get("area")
    const type = searchParams.get("type") || "Sales"
    const propertyType = searchParams.get("property_type")
    const minPrice = searchParams.get("min_price")
    const maxPrice = searchParams.get("max_price")
    const fromDate = searchParams.get("from_date")
    const toDate = searchParams.get("to_date")
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 1000)
    const offset = parseInt(searchParams.get("offset") || "0")
    const stats = searchParams.get("stats") === "true"
    
    const supabase = getSupabaseAdminClient()

    if (stats) {
      // Return aggregated statistics
      const { data, error } = await supabase.rpc("get_dld_area_stats", {
        p_area: area || null,
        p_type: type,
        p_property_type: propertyType || null,
        p_from_date: fromDate || null,
        p_to_date: toDate || null,
      })

      if (error) {
        // Fallback to direct query if RPC doesn't exist
        let query = supabase
          .from("dld_transactions")
          .select("area_name_en, property_type_en, actual_worth, meter_sale_price, instance_date")
          .eq("trans_group_en", type)
          .gt("actual_worth", 0)

        if (area) query = query.ilike("area_name_en", `%${area}%`)
        if (propertyType) query = query.eq("property_type_en", propertyType)
        if (fromDate) query = query.gte("instance_date", fromDate)
        if (toDate) query = query.lte("instance_date", toDate)

        const { data: rawData, error: rawError } = await query.limit(10000)
        
        if (rawError) throw rawError

        // Aggregate in memory
        const areaStats: Record<string, {
          area: string
          count: number
          totalValue: number
          totalPricePerSqm: number
          pricePerSqmCount: number
          minPrice: number
          maxPrice: number
        }> = {}

        for (const row of rawData || []) {
          const key = row.area_name_en || "Unknown"
          if (!areaStats[key]) {
            areaStats[key] = {
              area: key,
              count: 0,
              totalValue: 0,
              totalPricePerSqm: 0,
              pricePerSqmCount: 0,
              minPrice: Infinity,
              maxPrice: 0,
            }
          }
          areaStats[key].count++
          areaStats[key].totalValue += row.actual_worth || 0
          if (row.meter_sale_price) {
            areaStats[key].totalPricePerSqm += row.meter_sale_price
            areaStats[key].pricePerSqmCount++
          }
          areaStats[key].minPrice = Math.min(areaStats[key].minPrice, row.actual_worth || Infinity)
          areaStats[key].maxPrice = Math.max(areaStats[key].maxPrice, row.actual_worth || 0)
        }

        const statsResult = Object.values(areaStats)
          .map(s => ({
            area_name_en: s.area,
            transaction_count: s.count,
            avg_price: Math.round(s.totalValue / s.count),
            avg_price_per_sqm: s.pricePerSqmCount > 0 
              ? Math.round(s.totalPricePerSqm / s.pricePerSqmCount) 
              : null,
            min_price: s.minPrice === Infinity ? null : s.minPrice,
            max_price: s.maxPrice === 0 ? null : s.maxPrice,
          }))
          .sort((a, b) => b.transaction_count - a.transaction_count)

        return NextResponse.json({
          type: "statistics",
          filters: { area, type, propertyType, fromDate, toDate },
          data: statsResult,
        })
      }

      return NextResponse.json({
        type: "statistics",
        filters: { area, type, propertyType, fromDate, toDate },
        data,
      })
    }

    // Return individual transactions
    let query = supabase
      .from("dld_transactions")
      .select(`
        transaction_id,
        trans_group_en,
        procedure_name_en,
        instance_date,
        property_type_en,
        property_sub_type_en,
        property_usage_en,
        area_name_en,
        building_name_en,
        project_name_en,
        rooms_en,
        has_parking,
        procedure_area,
        actual_worth,
        meter_sale_price
      `)
      .eq("trans_group_en", type)
      .order("instance_date", { ascending: false })
      .range(offset, offset + limit - 1)

    if (area) query = query.ilike("area_name_en", `%${area}%`)
    if (propertyType) query = query.eq("property_type_en", propertyType)
    if (minPrice) query = query.gte("actual_worth", parseFloat(minPrice))
    if (maxPrice) query = query.lte("actual_worth", parseFloat(maxPrice))
    if (fromDate) query = query.gte("instance_date", fromDate)
    if (toDate) query = query.lte("instance_date", toDate)

    const { data, error, count } = await query

    if (error) throw error

    return NextResponse.json({
      type: "transactions",
      filters: { area, type, propertyType, minPrice, maxPrice, fromDate, toDate },
      pagination: { limit, offset },
      count: data?.length || 0,
      data,
    })
  } catch (err) {
    console.error("DLD API error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}
