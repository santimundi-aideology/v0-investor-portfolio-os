import "server-only"

import { getSupabaseAdminClient } from "@/lib/db/client"

/**
 * COMPUTE AI MARKET SUMMARIES
 * ---------------------------
 * Aggregates data from snapshot tables into AI-safe summary format.
 * This prevents the AI from consuming raw data and controls context costs.
 *
 * Inputs:
 *  - `market_metric_snapshot` (DLD/Ejari truth data)
 *  - `portal_listing_snapshot` (portal inventory data)
 *
 * Output:
 *  - `ai_market_summary` (one row per geo/segment/date)
 *
 * Schedule: Daily after signal pipeline completes
 */

export interface MarketSummaryResult {
  summariesCreated: number
  summariesUpdated: number
  errors: string[]
}

interface SnapshotMetric {
  geo_id: string
  geo_name: string | null
  segment: string
  metric: string
  value: number
  sample_size: number | null
}

interface PortalSnapshot {
  geo_id: string
  geo_name: string | null
  segment: string
  active_listings: number
  price_cuts_count: number
  stale_listings_count: number
}

function determineTrend(current: number | null, previous: number | null): 'rising' | 'stable' | 'falling' | null {
  if (current === null || previous === null || previous === 0) return null
  const change = (current - previous) / previous
  if (change > 0.03) return 'rising'
  if (change < -0.03) return 'falling'
  return 'stable'
}

function generateSummaryText(data: {
  geoName: string
  segment: string
  medianDldPrice: number | null
  medianAskingPrice: number | null
  priceVsTruthPct: number | null
  activeListings: number | null
  avgDaysOnMarket: number | null
  grossYield: number | null
  priceTrend: string | null
  supplyTrend: string | null
}): string {
  const parts: string[] = []
  
  // Opening
  parts.push(`${data.geoName} ${data.segment} market:`)
  
  // Price info
  if (data.medianDldPrice) {
    const priceStr = data.medianDldPrice >= 1_000_000 
      ? `AED ${(data.medianDldPrice / 1_000_000).toFixed(1)}M`
      : `AED ${Math.round(data.medianDldPrice).toLocaleString()}`
    parts.push(`median price ${priceStr}`)
  }
  
  // Price vs truth
  if (data.priceVsTruthPct !== null) {
    const pct = Math.abs(data.priceVsTruthPct * 100).toFixed(0)
    if (data.priceVsTruthPct > 0.1) {
      parts.push(`asking prices ${pct}% above market`)
    } else if (data.priceVsTruthPct < -0.1) {
      parts.push(`asking prices ${pct}% below market`)
    } else {
      parts.push('asking prices aligned with market')
    }
  }
  
  // Inventory
  if (data.activeListings) {
    parts.push(`${data.activeListings} active listings`)
  }
  
  // Yield
  if (data.grossYield) {
    parts.push(`${(data.grossYield * 100).toFixed(1)}% gross yield`)
  }
  
  // Trends
  if (data.priceTrend) {
    parts.push(`prices ${data.priceTrend}`)
  }
  if (data.supplyTrend) {
    parts.push(`supply ${data.supplyTrend}`)
  }
  
  return parts.join('. ') + '.'
}

export async function computeAIMarketSummaries(orgId: string): Promise<MarketSummaryResult> {
  const supabase = getSupabaseAdminClient()
  const started = Date.now()
  const errors: string[] = []
  
  const today = new Date().toISOString().slice(0, 10)
  
  try {
    // Get latest market metric snapshots (grouped by geo/segment)
    const { data: truthSnapshots, error: truthError } = await supabase
      .from("market_metric_snapshot")
      .select("geo_id, geo_name, segment, metric, value, sample_size, window_end")
      .eq("org_id", orgId)
      .order("window_end", { ascending: false })
    
    if (truthError) {
      errors.push(`Truth snapshot error: ${truthError.message}`)
    }
    
    // Get latest portal snapshots
    const { data: portalSnapshots, error: portalError } = await supabase
      .from("portal_listing_snapshot")
      .select("geo_id, geo_name, segment, active_listings, price_cuts_count, stale_listings_count, as_of_date")
      .eq("org_id", orgId)
      .order("as_of_date", { ascending: false })
    
    if (portalError) {
      errors.push(`Portal snapshot error: ${portalError.message}`)
    }
    
    // Build a map of latest metrics per geo/segment
    const metricsMap = new Map<string, {
      geo_id: string
      geo_name: string
      segment: string
      median_price_psf: number | null
      median_rent_annual: number | null
      gross_yield: number | null
      sample_size_sales: number | null
      sample_size_rentals: number | null
    }>()
    
    for (const row of (truthSnapshots ?? []) as SnapshotMetric[]) {
      const key = `${row.geo_id}|${row.segment}`
      if (!metricsMap.has(key)) {
        metricsMap.set(key, {
          geo_id: row.geo_id,
          geo_name: row.geo_name ?? row.geo_id,
          segment: row.segment,
          median_price_psf: null,
          median_rent_annual: null,
          gross_yield: null,
          sample_size_sales: null,
          sample_size_rentals: null,
        })
      }
      const entry = metricsMap.get(key)!
      if (row.metric === "median_price_psf") {
        entry.median_price_psf = row.value
        entry.sample_size_sales = row.sample_size
      } else if (row.metric === "median_rent_annual") {
        entry.median_rent_annual = row.value
        entry.sample_size_rentals = row.sample_size
      } else if (row.metric === "gross_yield") {
        entry.gross_yield = row.value
      }
    }
    
    // Build a map of latest portal data per geo/segment
    const portalMap = new Map<string, {
      active_listings: number
      price_cuts_count: number
      stale_listings_count: number
    }>()
    
    for (const row of (portalSnapshots ?? []) as PortalSnapshot[]) {
      const key = `${row.geo_id}|${row.segment}`
      if (!portalMap.has(key)) {
        portalMap.set(key, {
          active_listings: row.active_listings,
          price_cuts_count: row.price_cuts_count,
          stale_listings_count: row.stale_listings_count,
        })
      }
    }
    
    // Combine all unique geo/segment combinations
    const allKeys = new Set([...metricsMap.keys(), ...portalMap.keys()])
    
    if (allKeys.size === 0) {
      console.log(`[computeAIMarketSummaries] orgId=${orgId} no data found; skipping`)
      return { summariesCreated: 0, summariesUpdated: 0, errors }
    }
    
    // Build summary rows
    const summaryRows: Array<Record<string, unknown>> = []
    
    for (const key of allKeys) {
      const [geo_id, segment] = key.split("|")
      const truth = metricsMap.get(key)
      const portal = portalMap.get(key)
      
      // Estimate median price from price per sqft (assuming avg 1000 sqft for simplicity)
      // In production, this would come from actual median prices
      const medianDldPrice = truth?.median_price_psf ? truth.median_price_psf * 1000 : null
      
      // Calculate price vs truth (we'd need portal asking prices for this)
      // For now, set to null until we have portal price data
      const priceVsTruthPct = null
      
      // Calculate price cut rate
      const priceCutRate = portal?.active_listings && portal.active_listings > 0
        ? portal.price_cuts_count / portal.active_listings
        : null
      
      const geoName = truth?.geo_name ?? geo_id ?? 'Unknown'
      
      const summaryText = generateSummaryText({
        geoName,
        segment: segment ?? 'Unknown',
        medianDldPrice,
        medianAskingPrice: null, // Will be populated when portal prices are available
        priceVsTruthPct,
        activeListings: portal?.active_listings ?? null,
        avgDaysOnMarket: null, // Will be populated when we compute this
        grossYield: truth?.gross_yield ?? null,
        priceTrend: null, // Will be populated from historical comparison
        supplyTrend: null,
      })
      
      summaryRows.push({
        org_id: orgId,
        geo_id,
        geo_name: geoName,
        segment,
        as_of_date: today,
        median_dld_price: medianDldPrice,
        median_price_per_sqft: truth?.median_price_psf ?? null,
        median_rent_annual: truth?.median_rent_annual ?? null,
        gross_yield_pct: truth?.gross_yield ?? null,
        active_listings_count: portal?.active_listings ?? 0,
        price_cut_rate_pct: priceCutRate,
        stale_listings_count: portal?.stale_listings_count ?? 0,
        sample_size_sales: truth?.sample_size_sales ?? null,
        sample_size_rentals: truth?.sample_size_rentals ?? null,
        sample_size_listings: portal?.active_listings ?? null,
        summary_text: summaryText,
      })
    }
    
    // Upsert summaries
    const { data: upserted, error: upsertError } = await supabase
      .from("ai_market_summary")
      .upsert(summaryRows, {
        onConflict: "org_id,geo_id,segment,as_of_date",
      })
      .select("id")
    
    if (upsertError) {
      errors.push(`Upsert error: ${upsertError.message}`)
      console.error(`[computeAIMarketSummaries] upsert error:`, upsertError)
    }
    
    const duration = Date.now() - started
    console.log(
      `[computeAIMarketSummaries] orgId=${orgId} created/updated=${upserted?.length ?? 0} in ${duration}ms`
    )
    
    return {
      summariesCreated: upserted?.length ?? 0,
      summariesUpdated: 0,
      errors,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    errors.push(`Unexpected error: ${msg}`)
    console.error(`[computeAIMarketSummaries] error:`, error)
    return { summariesCreated: 0, summariesUpdated: 0, errors }
  }
}
