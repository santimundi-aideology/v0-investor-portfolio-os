import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"

/**
 * GET /api/dld/signals/[id] - Get detailed signal information with recent transactions
 * 
 * Works with `market_signal` table (main signals from DLD transactions).
 * Falls back to `dld_market_signals` for legacy signals.
 * For pricing_opportunity signals, also fetches the portal listing details.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getSupabaseAdminClient()

    // Try to get the signal from market_signal table first
    let signal: Record<string, unknown> | null = null
    let areaName: string | null = null

    const { data: marketSignal, error: msError } = await supabase
      .from("market_signal")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (marketSignal) {
      signal = marketSignal
      areaName = (marketSignal.geo_name as string) || (marketSignal.geo_id as string) || null
    } else {
      // Fallback to dld_signals_with_coords view (legacy)
      const { data: legacySignal, error: legacyError } = await supabase
        .from("dld_signals_with_coords")
        .select("*")
        .eq("id", id)
        .maybeSingle()

      if (legacySignal) {
        signal = legacySignal
        areaName = legacySignal.area_name_en as string
      }
    }

    if (!signal) {
      return NextResponse.json(
        { error: "Signal not found" },
        { status: 404 }
      )
    }

    // For pricing_opportunity signals, fetch the portal listing details
    let portalListing: Record<string, unknown> | null = null
    if (signal.type === "pricing_opportunity" && signal.evidence) {
      const evidence = signal.evidence as Record<string, unknown>
      const listingId = evidence.listing_id as string
      const portal = (evidence.portal as string) || "bayut"
      
      if (listingId) {
        const { data: listing } = await supabase
          .from("portal_listings")
          .select(`
            id, portal, listing_id, listing_url,
            area_name, building_name, project_name,
            property_type, bedrooms, bathrooms, size_sqm,
            asking_price, price_per_sqm, listing_type,
            is_active, listed_date, days_on_market,
            agent_name, agency_name,
            has_parking, furnished, amenities, photos,
            latitude, longitude, created_at, updated_at
          `)
          .eq("portal", portal)
          .eq("listing_id", listingId)
          .maybeSingle()
        
        if (listing) {
          portalListing = listing
        }
      }
    }

    // Get recent transactions for this area
    let recentTransactions: unknown[] = []
    let areaStats: unknown[] = []

    if (areaName) {
      const { data: txns } = await supabase
        .from("dld_transactions")
        .select(`
          transaction_id,
          instance_date,
          property_type_en,
          property_sub_type_en,
          building_name_en,
          project_name_en,
          master_project_en,
          rooms_en,
          has_parking,
          procedure_area,
          actual_worth,
          meter_sale_price,
          nearest_landmark_en,
          nearest_metro_en,
          nearest_mall_en
        `)
        .eq("area_name_en", areaName)
        .eq("trans_group_en", "Sales")
        .gt("actual_worth", 0)
        .order("instance_date", { ascending: false })
        .limit(10)

      recentTransactions = txns || []

      // Get area statistics (limit to avoid huge queries)
      const { data: stats } = await supabase
        .from("dld_transactions")
        .select("property_type_en, actual_worth, meter_sale_price, rooms_en")
        .eq("area_name_en", areaName)
        .eq("trans_group_en", "Sales")
        .gt("actual_worth", 0)
        .limit(5000)

      areaStats = stats || []
    }

    // Calculate statistics
    const stats = {
      total_transactions: areaStats.length,
      property_types: {} as Record<string, number>,
      room_distribution: {} as Record<string, number>,
      price_range: { min: Infinity, max: 0 },
      avg_price: 0,
      avg_price_per_sqm: 0,
    }

    let totalPrice = 0
    let totalPsm = 0
    let psmCount = 0

    for (const tx of areaStats as Array<{ property_type_en?: string; actual_worth?: number; meter_sale_price?: number; rooms_en?: string }>) {
      // Property types
      const ptype = tx.property_type_en || "Other"
      stats.property_types[ptype] = (stats.property_types[ptype] || 0) + 1

      // Room distribution
      if (tx.rooms_en) {
        stats.room_distribution[tx.rooms_en] = (stats.room_distribution[tx.rooms_en] || 0) + 1
      }

      // Price range
      if (tx.actual_worth) {
        stats.price_range.min = Math.min(stats.price_range.min, tx.actual_worth)
        stats.price_range.max = Math.max(stats.price_range.max, tx.actual_worth)
        totalPrice += tx.actual_worth
      }

      if (tx.meter_sale_price) {
        totalPsm += tx.meter_sale_price
        psmCount++
      }
    }

    stats.avg_price = stats.total_transactions > 0 ? Math.round(totalPrice / stats.total_transactions) : 0
    stats.avg_price_per_sqm = psmCount > 0 ? Math.round(totalPsm / psmCount) : 0
    if (stats.price_range.min === Infinity) stats.price_range.min = 0

    // Normalize signal output for frontend compatibility
    const normalizedSignal = {
      ...signal,
      area_name_en: areaName,
    }

    return NextResponse.json({
      signal: normalizedSignal,
      area_statistics: stats,
      recent_transactions: recentTransactions,
      portal_listing: portalListing,
    })
  } catch (err) {
    console.error("DLD Signal detail error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}
