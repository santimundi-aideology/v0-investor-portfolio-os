import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError } from "@/lib/security/rbac"
import { cmaRequestSchema } from "@/lib/validation/schemas"
import { validateRequest } from "@/lib/validation/helpers"

/**
 * POST /api/property-intake/cma
 * Generate a Comparative Market Analysis from real DLD transaction data
 */

interface DLDComparable {
  transactionId: string
  buildingName: string
  projectName: string
  date: string
  price: number
  pricePsf: number
  sizeSqft: number
  rooms: string
  type: string
  matchTier: number
  matchDescription: string
}

interface CMAResult {
  area: string
  propertyType: string
  comparableCount: number
  confidence: "high" | "medium" | "low" | "insufficient"
  medianPrice: number | null
  medianPricePerSqft: number | null
  avgPrice: number | null
  avgPricePerSqft: number | null
  priceRange: { min: number; max: number } | null
  askingPriceVsMedian: number | null // percentage
  isGoodDeal: boolean
  comparables: DLDComparable[]
  monthlyTrends: { month: string; avgPrice: number; avgPsf: number; count: number }[]
  areaStats: {
    totalTransactions: number
    avgPrice: number
    avgPricePerSqm: number
    latestTransaction: string | null
  } | null
  tieredAnalysis: {
    tier: number
    description: string
    confidence: number
    count: number
    medianPrice: number
    medianPsf: number
  }[]
}

// Convert sqft to sqm
function sqftToSqm(sqft: number): number {
  return sqft * 0.092903
}

// Convert sqm to sqft
function sqmToSqft(sqm: number): number {
  return sqm / 0.092903
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthContext(req)
    // CMA can be used by authenticated users (agents/realtors)
    // If not authenticated, still allow but log for audit
    
    const validation = await validateRequest(req, cmaRequestSchema)
    if (!validation.success) {
      return validation.error
    }

    const { area, propertyType, bedrooms, sizeSqft, askingPrice, buildingName } = validation.data

    const supabase = getSupabaseAdminClient()
    const sizeSqm = sizeSqft ? sqftToSqm(sizeSqft) : null

    // Map property types to DLD terminology
    const dldPropertyType = propertyType?.toLowerCase().includes("villa") ? "Villa"
      : propertyType?.toLowerCase().includes("townhouse") ? "Villa"
      : propertyType?.toLowerCase().includes("land") ? "Land"
      : "Unit"

    // ---------- Resolve Bayut community name to DLD area name ----------
    // Bayut uses marketing/community names (e.g. "Majan", "Dubai Marina")
    // while DLD uses official area names (e.g. "Wadi Al Safa 3", "Marsa Dubai").
    // The master_project_en column in dld_transactions contains the community names.
    let resolvedAreaName = area
    try {
      // First check if the area name directly exists in dld_area_stats
      const { data: directMatch } = await supabase
        .from("dld_area_stats")
        .select("area_name_en")
        .eq("area_name_en", area)
        .limit(1)

      if (!directMatch || directMatch.length === 0) {
        // No direct match — try resolving via master_project_en
        const { data: resolved } = await supabase.rpc("resolve_area_name", {
          p_community_name: area,
        }).maybeSingle()

        if (resolved && resolved.dld_area_name) {
          console.log(`[cma] Resolved "${area}" → "${resolved.dld_area_name}" (${resolved.transaction_count} txns)`)
          resolvedAreaName = resolved.dld_area_name
        } else {
          // Fallback: direct SQL query on dld_transactions
          const { data: fallback } = await supabase
            .from("dld_transactions")
            .select("area_name_en")
            .ilike("master_project_en", area)
            .eq("trans_group_en", "Sales")
            .limit(1)

          if (fallback && fallback.length > 0) {
            resolvedAreaName = fallback[0].area_name_en
            console.log(`[cma] Resolved "${area}" → "${resolvedAreaName}" via fallback`)
          }
        }
      }
    } catch (err) {
      console.warn("[cma] Area resolution failed, using original:", err)
    }

    // 1. Area stats (fetched first because used by later sections)
    let areaStats: CMAResult["areaStats"] = null
    try {
      const { data: stats } = await supabase
        .from("dld_area_stats")
        .select("*")
        .eq("area_name_en", resolvedAreaName)
        .eq("property_type_en", dldPropertyType)
        .maybeSingle()

      if (stats) {
        areaStats = {
          totalTransactions: Number(stats.transaction_count),
          avgPrice: Number(stats.avg_price),
          avgPricePerSqm: Number(stats.avg_price_per_sqm),
          latestTransaction: stats.latest_transaction as string | null,
        }
      }
    } catch (err) {
      console.warn("[cma] Area stats not available:", err)
    }

    // 2. Run tiered comparable analysis
    let tieredAnalysis: CMAResult["tieredAnalysis"] = []
    try {
      const { data: tiers } = await supabase.rpc("find_best_comparables", {
        p_area_name: area,
        p_property_type: dldPropertyType,
        p_bedrooms: bedrooms ? String(bedrooms) : null,
        p_size_sqm: sizeSqm,
        p_building_name: buildingName || null,
      })

      if (tiers && tiers.length > 0) {
        tieredAnalysis = tiers.map((t: Record<string, unknown>) => ({
          tier: Number(t.match_tier),
          description: t.match_description as string,
          confidence: Number(t.confidence_score),
          count: Number(t.comparable_count),
          medianPrice: Number(t.median_price),
          medianPsf: Number(t.median_price_per_sqm) * 0.092903, // sqm to sqft conversion
        }))
      }
    } catch (err) {
      console.warn("[cma] Tiered analysis not available:", err)
    }

    // 3. Run simple comparison
    let comparisonResult: {
      comparableCount: number
      dldMedianPrice: number | null
      dldMedianPsm: number | null
      priceDiscountPct: number | null
      isGoodDeal: boolean
      confidence: string
    } = {
      comparableCount: 0,
      dldMedianPrice: null,
      dldMedianPsm: null,
      priceDiscountPct: null,
      isGoodDeal: false,
      confidence: "insufficient",
    }

    try {
      const { data: compData } = await supabase.rpc("compare_listing_to_dld", {
        p_area_name: area,
        p_property_type: dldPropertyType,
        p_size_sqm: sizeSqm,
        p_asking_price: askingPrice,
      })

      if (compData && compData.length > 0) {
        const comp = compData[0]
        comparisonResult = {
          comparableCount: Number(comp.comparable_count),
          dldMedianPrice: Number(comp.dld_median_price),
          dldMedianPsm: Number(comp.dld_median_psm),
          priceDiscountPct: comp.price_discount_pct ? Number(comp.price_discount_pct) : null,
          isGoodDeal: comp.is_good_deal === true,
          confidence: comp.confidence as string,
        }
      }
    } catch (err) {
      console.warn("[cma] Comparison not available:", err)
    }

    // 4. Use pre-computed area stats view
    let comparables: DLDComparable[] = []
    let precomputedMedianPrice: number | null = null
    let precomputedMedianPsm: number | null = null
    let precomputedPriceRange: { min: number; max: number } | null = null
    
    if (areaStats) {
      const avgPrice = areaStats.avgPrice
      const avgPsm = areaStats.avgPricePerSqm
      const txnCount = areaStats.totalTransactions
      const latestDate = areaStats.latestTransaction || new Date().toISOString().split("T")[0]
      
      // Create synthetic comparables from the aggregated stats
      comparables = [
        {
          transactionId: `agg-avg-${area}`,
          buildingName: `${area} - Market Average`,
          projectName: area,
          date: latestDate,
          price: avgPrice,
          pricePsf: Math.round(avgPsm * 0.092903), // sqm to sqft
          sizeSqft: sizeSqft || (avgPrice > 0 && avgPsm > 0 ? Math.round(sqmToSqft(avgPrice / avgPsm)) : 1000),
          rooms: bedrooms ? `${bedrooms} BR` : "All configs",
          type: dldPropertyType,
          matchTier: 1,
          matchDescription: `Market average (${txnCount} transactions)`,
        },
      ]
      
      // Use the average as a proxy for median when we don't have it
      precomputedMedianPrice = avgPrice
      precomputedMedianPsm = avgPsm
    }

    // 5. Monthly trends for the area
    let monthlyTrends: CMAResult["monthlyTrends"] = []
    try {
      const { data: trends } = await supabase
        .from("dld_monthly_trends")
        .select("month, avg_price, avg_price_per_sqm, transaction_count")
        .eq("area_name_en", resolvedAreaName)
        .order("month", { ascending: false })
        .limit(12)

      if (trends && trends.length > 0) {
        monthlyTrends = trends.reverse().map((t: Record<string, unknown>) => ({
          month: t.month as string,
          avgPrice: Number(t.avg_price),
          avgPsf: Number(t.avg_price_per_sqm) * 0.092903,
          count: Number(t.transaction_count),
        }))
      }
    } catch (err) {
      console.warn("[cma] Trends not available:", err)
    }

    // Use pre-computed data if available, otherwise fall back to comparison result
    const prices = comparables.map((c) => c.price).filter((p) => p > 0)
    const psfValues = comparables.map((c) => c.pricePsf).filter((p) => p > 0)

    // Prioritize: precomputed > comparison result > calculated from comparables
    const medianPrice = precomputedMedianPrice 
      || comparisonResult.dldMedianPrice 
      || (prices.length > 0 ? prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)] : null)
    
    const medianPsf = precomputedMedianPsm
      ? precomputedMedianPsm * 0.092903
      : comparisonResult.dldMedianPsm
      ? comparisonResult.dldMedianPsm * 0.092903
      : (psfValues.length > 0 ? psfValues.sort((a, b) => a - b)[Math.floor(psfValues.length / 2)] : null)

    const askingVsMedian = medianPrice
      ? ((askingPrice - medianPrice) / medianPrice) * 100
      : null

    const cma: CMAResult = {
      area,
      propertyType: dldPropertyType,
      comparableCount: comparisonResult.comparableCount || comparables.length,
      confidence: (comparisonResult.confidence as CMAResult["confidence"]) || "insufficient",
      medianPrice,
      medianPricePerSqft: medianPsf ? Math.round(medianPsf) : null,
      avgPrice: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null,
      avgPricePerSqft: psfValues.length > 0 ? Math.round(psfValues.reduce((a, b) => a + b, 0) / psfValues.length) : null,
      priceRange: precomputedPriceRange || (prices.length > 0 ? { min: Math.min(...prices), max: Math.max(...prices) } : null),
      askingPriceVsMedian: askingVsMedian ? Math.round(askingVsMedian * 10) / 10 : null,
      isGoodDeal: comparisonResult.isGoodDeal,
      comparables: comparables.slice(0, 10),
      monthlyTrends,
      areaStats,
      tieredAnalysis,
    }

    return NextResponse.json({ cma })
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[cma] Error:", err)
    return NextResponse.json(
      { error: "Failed to generate CMA" },
      { status: 500 }
    )
  }
}
