import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"

/**
 * GET /api/dld/map - Get transaction data with coordinates for mapping
 * 
 * Query parameters:
 *   - type: "Sales", "Mortgages", "Gifts" (default: Sales)
 *   - min_price: Minimum price filter
 *   - max_price: Maximum price filter
 *   - property_type: Filter by property type
 *   - area: Filter by area name (partial match)
 *   - from_date: Start date (YYYY-MM-DD)
 *   - to_date: End date (YYYY-MM-DD)
 *   - limit: Number of results (default 1000, max 5000)
 *   - aggregate: If "true", return aggregated data by area (for heatmap)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    
    const type = searchParams.get("type") || "Sales"
    const minPrice = searchParams.get("min_price")
    const maxPrice = searchParams.get("max_price")
    const propertyType = searchParams.get("property_type")
    const area = searchParams.get("area")
    const fromDate = searchParams.get("from_date")
    const toDate = searchParams.get("to_date")
    const limit = Math.min(parseInt(searchParams.get("limit") || "1000"), 5000)
    const aggregate = searchParams.get("aggregate") === "true"

    const supabase = getSupabaseAdminClient()

    if (aggregate) {
      // Return aggregated data by area for heatmap visualization
      let aggQuery = supabase
        .from("dld_transactions")
        .select(`
          area_name_en,
          actual_worth,
          meter_sale_price
        `)
        .eq("trans_group_en", type)
        .gt("actual_worth", 0)

      // Apply filters to aggregate query
      if (propertyType) aggQuery = aggQuery.eq("property_type_en", propertyType)
      if (minPrice) aggQuery = aggQuery.gte("actual_worth", parseFloat(minPrice))
      if (maxPrice) aggQuery = aggQuery.lte("actual_worth", parseFloat(maxPrice))
      if (fromDate) aggQuery = aggQuery.gte("instance_date", fromDate)
      if (toDate) aggQuery = aggQuery.lte("instance_date", toDate)
      if (area) aggQuery = aggQuery.ilike("area_name_en", `%${area}%`)

      const { data: transactions, error } = await aggQuery

      if (error) throw error

      // Get coordinates
      const { data: coords } = await supabase
        .from("dubai_area_coordinates")
        .select("area_name_en, latitude, longitude, area_type")

      const coordMap = new Map(coords?.map(c => [c.area_name_en, c]) || [])

      // Aggregate by area
      const areaStats: Record<string, {
        count: number
        totalValue: number
        totalPsm: number
        psmCount: number
      }> = {}

      for (const tx of transactions || []) {
        const area = tx.area_name_en || "Unknown"
        if (!areaStats[area]) {
          areaStats[area] = { count: 0, totalValue: 0, totalPsm: 0, psmCount: 0 }
        }
        areaStats[area].count++
        areaStats[area].totalValue += tx.actual_worth || 0
        if (tx.meter_sale_price) {
          areaStats[area].totalPsm += tx.meter_sale_price
          areaStats[area].psmCount++
        }
      }

      const features = Object.entries(areaStats)
        .map(([area, stats]) => {
          const coord = coordMap.get(area)
          if (!coord?.latitude || !coord?.longitude) return null

          return {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [coord.longitude, coord.latitude],
            },
            properties: {
              area_name: area,
              area_type: coord.area_type,
              transaction_count: stats.count,
              total_volume: Math.round(stats.totalValue),
              avg_price: Math.round(stats.totalValue / stats.count),
              avg_price_per_sqm: stats.psmCount > 0 
                ? Math.round(stats.totalPsm / stats.psmCount) 
                : null,
            },
          }
        })
        .filter(Boolean)

      return NextResponse.json({
        type: "FeatureCollection",
        metadata: {
          total_areas: features.length,
          total_transactions: transactions?.length || 0,
          filters: { type, minPrice, maxPrice, propertyType, area, fromDate, toDate },
        },
        features,
      })
    }

    // Return individual transactions with coordinates
    let query = supabase
      .from("dld_transactions")
      .select(`
        transaction_id,
        instance_date,
        area_name_en,
        property_type_en,
        building_name_en,
        project_name_en,
        rooms_en,
        procedure_area,
        actual_worth,
        meter_sale_price
      `)
      .eq("trans_group_en", type)
      .gt("actual_worth", 0)
      .order("actual_worth", { ascending: false })
      .limit(limit)

    if (minPrice) query = query.gte("actual_worth", parseFloat(minPrice))
    if (maxPrice) query = query.lte("actual_worth", parseFloat(maxPrice))
    if (propertyType) query = query.eq("property_type_en", propertyType)
    if (fromDate) query = query.gte("instance_date", fromDate)
    if (toDate) query = query.lte("instance_date", toDate)
    if (area) query = query.ilike("area_name_en", `%${area}%`)

    const { data: transactions, error } = await query

    if (error) throw error

    // Get coordinates for areas
    const areas = [...new Set(transactions?.map(t => t.area_name_en) || [])]
    const { data: coords } = await supabase
      .from("dubai_area_coordinates")
      .select("area_name_en, latitude, longitude, area_type")
      .in("area_name_en", areas)

    const coordMap = new Map(coords?.map(c => [c.area_name_en, c]) || [])

    // Build GeoJSON
    const features = (transactions || [])
      .map(tx => {
        const coord = coordMap.get(tx.area_name_en)
        if (!coord?.latitude || !coord?.longitude) return null

        // Add small random offset to spread markers in same area
        const jitter = 0.002
        const lat = coord.latitude + (Math.random() - 0.5) * jitter
        const lng = coord.longitude + (Math.random() - 0.5) * jitter

        return {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [lng, lat],
          },
          properties: {
            transaction_id: tx.transaction_id,
            date: tx.instance_date,
            area: tx.area_name_en,
            property_type: tx.property_type_en,
            building: tx.building_name_en,
            project: tx.project_name_en,
            rooms: tx.rooms_en,
            size_sqm: tx.procedure_area,
            price_aed: tx.actual_worth,
            price_per_sqm: tx.meter_sale_price,
          },
        }
      })
      .filter(Boolean)

    return NextResponse.json({
      type: "FeatureCollection",
      metadata: {
        total: features.length,
        filters: { type, minPrice, maxPrice, propertyType, fromDate, toDate },
      },
      features,
    })
  } catch (err) {
    console.error("DLD Map API error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}
