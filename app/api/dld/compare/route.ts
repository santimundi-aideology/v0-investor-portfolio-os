import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"

/**
 * GET /api/dld/compare - Compare DLD transaction prices with portal listing prices
 * 
 * Query parameters:
 *   - area: Filter by area name
 *   - portal: Filter by portal ('bayut', 'property_finder')
 *   - property_type: Filter by property type
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const area = searchParams.get("area")
    const portal = searchParams.get("portal")
    const propertyType = searchParams.get("property_type")

    const supabase = getSupabaseAdminClient()

    // Get area-level comparison data - prioritize areas with both DLD and portal data
    let query = supabase
      .from("area_price_comparison")
      .select("*")
      .order("has_both", { ascending: false })
      .order("dld_count", { ascending: false, nullsFirst: false })

    if (area) query = query.ilike("area_name", `%${area}%`)

    const { data: comparison, error } = await query.limit(100)
    if (error) throw error

    // Get portal listings with coordinates for map
    let listingsQuery = supabase
      .from("portal_listings")
      .select(`
        id, portal, listing_id, property_type, bedrooms, bathrooms, size_sqm,
        area_name, building_name, project_name, asking_price, price_per_sqm,
        has_parking, furnished, listed_date, agency_name
      `)
      .eq("is_active", true)
      .eq("listing_type", "sale")
      .order("asking_price", { ascending: false })

    if (area) listingsQuery = listingsQuery.ilike("area_name", `%${area}%`)
    if (portal) listingsQuery = listingsQuery.eq("portal", portal)
    if (propertyType) listingsQuery = listingsQuery.ilike("property_type", `%${propertyType}%`)

    const { data: listings } = await listingsQuery.limit(50)

    // Add coordinates from our geocoding table
    const areas = [...new Set(listings?.map(l => l.area_name) || [])]
    const { data: coords } = await supabase
      .from("dubai_area_coordinates")
      .select("area_name_en, latitude, longitude")
      .in("area_name_en", areas)

    const coordMap = new Map(coords?.map(c => [c.area_name_en, c]) || [])

    // Enrich listings with coordinates
    const enrichedListings = (listings || []).map(l => {
      const coord = coordMap.get(l.area_name)
      return {
        ...l,
        latitude: coord?.latitude ? parseFloat(coord.latitude) : null,
        longitude: coord?.longitude ? parseFloat(coord.longitude) : null,
      }
    })

    // Calculate summary statistics
    const summary = {
      total_comparisons: comparison?.length || 0,
      total_listings: listings?.length || 0,
      avg_price_gap_pct: 0,
      areas_with_premium: 0,
      areas_with_discount: 0,
    }

    let gapSum = 0
    let gapCount = 0
    for (const c of comparison || []) {
      const premium = parseFloat(c.price_premium_pct)
      if (!isNaN(premium)) {
        gapSum += premium
        gapCount++
        if (premium > 0) summary.areas_with_premium++
        else summary.areas_with_discount++
      }
    }
    summary.avg_price_gap_pct = gapCount > 0 ? Math.round(gapSum / gapCount * 10) / 10 : 0

    return NextResponse.json({
      summary,
      comparison: comparison || [],
      listings: enrichedListings,
    })
  } catch (err) {
    console.error("Compare API error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}
