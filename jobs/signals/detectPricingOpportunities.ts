/**
 * Pricing Opportunity Detector
 * 
 * Compares Bayut listing prices against DLD historical transaction data
 * using price-per-sqm, tiered matching, yield analysis, and composite scoring.
 * 
 * Integrated into the signals pipeline (step 5).
 */

import { getSupabaseAdminClient } from "@/lib/db/client"

// Thresholds
const MIN_COMPOSITE_SCORE = 55 // "fair_deal" or better
const MIN_COMPARABLES = 3

// Score weights (matching deal-scorer.ts)
const WEIGHTS = {
  price: 0.30,
  yield: 0.20,
  matchQuality: 0.15,
  sentiment: 0.15,
  liquidity: 0.10,
  recency: 0.10,
}

// Types
interface PortalListing {
  id: string
  portal: string
  listing_id: string
  listing_url: string | null
  area_name: string
  building_name: string | null
  property_type: string
  bedrooms: number | null
  size_sqm: number | null
  asking_price: number
  price_per_sqm: number | null
  listed_date: string | null
}

interface ComparableResult {
  match_tier: number
  match_description: string
  confidence_score: number
  comparable_count: number
  median_price: number
  median_price_per_sqm: number
  time_weighted_avg_psm: number
  avg_size_sqm: number
  recency_score: number
  latest_date: string | null
  price_range_min: number
  price_range_max: number
}

interface YieldData {
  geo_name: string
  segment: string
  median_rent_annual: number | null
  gross_yield: number | null
}

interface LiquidityData {
  area_name: string
  property_type: string
  avg_days_on_market: number
  median_days_on_market: number
  stale_listings_count: number
  fresh_listings_count: number
  liquidity_score: number
  median_price_per_sqm: number
}

interface ScoreBreakdown {
  price: number
  yield: number
  matchQuality: number
  sentiment: number
  liquidity: number
  recency: number
}

type DealRating = "exceptional_opportunity" | "strong_buy" | "fair_deal" | "market_price" | "overpriced"

interface EnhancedSignal {
  org_id: string
  type: string
  source: string
  source_type: string
  geo_type: string
  geo_id: string
  geo_name: string
  segment: string
  timeframe: string
  metric: string
  current_value: number
  prev_value: number | null
  delta_pct: number | null
  confidence_score: number
  severity: string
  status: string
  signal_key: string
  evidence: Record<string, unknown>
}

export interface DetectPricingResult {
  created: number
  analyzed: number
  skipped: number
}

// Cache for yield and liquidity data
const yieldCache = new Map<string, YieldData | null>()
const liquidityCache = new Map<string, LiquidityData | null>()

/**
 * Fetch yield data from market_metric_snapshot
 */
async function getYieldData(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  areaName: string,
  segment: string
): Promise<YieldData | null> {
  const key = `${areaName}|${segment}`
  if (yieldCache.has(key)) return yieldCache.get(key) ?? null
  
  const { data, error } = await supabase
    .from("market_metric_snapshot")
    .select("geo_name, segment, metric, value")
    .ilike("geo_name", `%${areaName}%`)
    .in("metric", ["median_rent_annual", "gross_yield"])
    .order("created_at", { ascending: false })
    .limit(10)
  
  if (error || !data || data.length === 0) {
    yieldCache.set(key, null)
    return null
  }
  
  const rentMetric = data.find(d => d.metric === "median_rent_annual")
  const yieldMetric = data.find(d => d.metric === "gross_yield")
  
  const result: YieldData = {
    geo_name: areaName,
    segment,
    median_rent_annual: rentMetric?.value ?? null,
    gross_yield: yieldMetric?.value ?? null,
  }
  
  yieldCache.set(key, result)
  return result
}

/**
 * Fetch liquidity data from area_liquidity_metrics view
 */
async function getLiquidityData(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  areaName: string,
  propertyType: string
): Promise<LiquidityData | null> {
  const key = `${areaName}|${propertyType}`
  if (liquidityCache.has(key)) return liquidityCache.get(key) ?? null
  
  const { data, error } = await supabase
    .from("area_liquidity_metrics")
    .select("*")
    .ilike("area_name", `%${areaName}%`)
    .limit(1)
    .maybeSingle()
  
  if (error || !data) {
    liquidityCache.set(key, null)
    return null
  }
  
  liquidityCache.set(key, data as LiquidityData)
  return data as LiquidityData
}

/**
 * Find best comparables using the tiered matching function
 */
async function findBestComparables(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  listing: PortalListing
): Promise<ComparableResult | null> {
  let bedroomStr: string | null = null
  if (listing.bedrooms !== null) {
    if (listing.bedrooms === 0) bedroomStr = "Studio"
    else bedroomStr = `${listing.bedrooms}`
  }
  
  const { data, error } = await supabase.rpc("find_best_comparables", {
    p_area_name: listing.area_name,
    p_property_type: listing.property_type,
    p_bedrooms: bedroomStr,
    p_size_sqm: listing.size_sqm,
    p_building_name: listing.building_name,
  })
  
  if (error) {
    console.warn(`[detectPricingOpportunities] Error finding comparables for ${listing.area_name}:`, error.message)
    return null
  }
  
  if (!data || data.length === 0 || data[0].comparable_count < MIN_COMPARABLES) {
    return null
  }
  
  return data[0] as ComparableResult
}

/**
 * Calculate price score (0-1) based on PSM discount
 */
function calculatePriceScore(listingPsm: number, dldMedianPsm: number, twAvgPsm: number): number {
  if (!dldMedianPsm || dldMedianPsm <= 0) return 0.5
  
  const referencePsm = twAvgPsm > 0 ? twAvgPsm : dldMedianPsm
  const discountPct = ((referencePsm - listingPsm) / referencePsm) * 100
  
  if (discountPct >= 30) return 1.0
  if (discountPct >= 20) return 0.85 + (discountPct - 20) * 0.015
  if (discountPct >= 10) return 0.70 + (discountPct - 10) * 0.015
  if (discountPct >= 0) return 0.50 + discountPct * 0.02
  if (discountPct >= -10) return 0.25 + (discountPct + 10) * 0.025
  if (discountPct >= -20) return 0.10 + (discountPct + 20) * 0.015
  return 0.0
}

/**
 * Calculate yield score (0-1)
 */
function calculateYieldScore(yieldData: YieldData | null, askingPrice: number): { score: number; grossYield: number | null } {
  if (!yieldData?.median_rent_annual || !askingPrice) {
    return { score: 0.5, grossYield: null }
  }
  
  const grossYield = (yieldData.median_rent_annual / askingPrice) * 100
  const areaAvg = (yieldData.gross_yield ?? 5.5) * 100
  const premium = grossYield - areaAvg
  
  let score = 0.5
  if (premium >= 2) score = 1.0
  else if (premium >= 1) score = 0.7 + premium * 0.15
  else if (premium >= 0) score = 0.5 + premium * 0.2
  else if (premium >= -1) score = 0.5 + premium * 0.2
  else if (premium >= -2) score = 0.1 + (premium + 2) * 0.1
  else score = 0.1
  
  return { score, grossYield }
}

/**
 * Calculate match quality score (0-1)
 */
function calculateMatchQualityScore(comparable: ComparableResult): number {
  const tierScores: Record<number, number> = { 1: 0.95, 2: 0.80, 3: 0.60, 4: 0.40, 0: 0.10 }
  let score = tierScores[comparable.match_tier] ?? 0.5
  
  if (comparable.comparable_count >= 50) score += 0.05
  else if (comparable.comparable_count >= 20) score += 0.03
  else if (comparable.comparable_count >= 10) score += 0.01
  
  return Math.min(1.0, score)
}

/**
 * Calculate liquidity score (0-1)
 */
function calculateLiquidityScore(liquidity: LiquidityData | null): number {
  if (!liquidity) return 0.5
  return liquidity.liquidity_score ?? 0.5
}

/**
 * Determine severity from composite score
 */
function determineSeverity(score: number): string {
  if (score >= 85) return "urgent"
  if (score >= 70) return "high"
  if (score >= 55) return "normal"
  return "low"
}

/**
 * Determine deal rating
 */
function determineRating(score: number): DealRating {
  if (score >= 85) return "exceptional_opportunity"
  if (score >= 70) return "strong_buy"
  if (score >= 55) return "fair_deal"
  if (score >= 40) return "market_price"
  return "overpriced"
}

/**
 * Main detector function - integrated into the signals pipeline
 */
export async function detectPricingOpportunities(orgId: string): Promise<DetectPricingResult> {
  const supabase = getSupabaseAdminClient()
  
  // Clear caches for fresh run
  yieldCache.clear()
  liquidityCache.clear()
  
  console.log(`[detectPricingOpportunities] Fetching active portal listings...`)
  
  const { data: listings, error: listingsError } = await supabase
    .from("portal_listings")
    .select("id, portal, listing_id, listing_url, area_name, building_name, property_type, bedrooms, size_sqm, asking_price, price_per_sqm, listed_date")
    .eq("is_active", true)
    .eq("listing_type", "sale")
    .gt("asking_price", 0)
  
  if (listingsError || !listings) {
    console.error(`[detectPricingOpportunities] Error fetching listings:`, listingsError?.message)
    return { created: 0, analyzed: 0, skipped: 0 }
  }
  
  console.log(`[detectPricingOpportunities] Found ${listings.length} active listings to analyze`)
  
  const signals: EnhancedSignal[] = []
  let analyzed = 0
  let skipped = 0
  
  for (const listing of listings) {
    analyzed++
    
    if (analyzed % 50 === 0) {
      console.log(`[detectPricingOpportunities] Analyzed ${analyzed}/${listings.length}... (${signals.length} opportunities found)`)
    }
    
    // 1. Find best comparables using tiered matching
    const comparable = await findBestComparables(supabase, listing)
    if (!comparable) {
      skipped++
      continue
    }
    
    // 2. Get yield data
    const yieldData = await getYieldData(supabase, listing.area_name, listing.property_type)
    
    // 3. Get liquidity data
    const liquidityData = await getLiquidityData(supabase, listing.area_name, listing.property_type)
    
    // 4. Calculate listing PSM
    const listingPsm = listing.price_per_sqm ?? 
      (listing.size_sqm ? listing.asking_price / listing.size_sqm : 0)
    
    if (!listingPsm || listingPsm <= 0) {
      skipped++
      continue
    }
    
    // 5. Calculate individual scores
    const priceScore = calculatePriceScore(
      listingPsm,
      comparable.median_price_per_sqm,
      comparable.time_weighted_avg_psm
    )
    
    const { score: yieldScore, grossYield } = calculateYieldScore(yieldData, listing.asking_price)
    const matchQualityScore = calculateMatchQualityScore(comparable)
    const sentimentScore = 0.5 // Default neutral
    const liquidityScore = calculateLiquidityScore(liquidityData)
    const recencyScore = comparable.recency_score ?? 0.5
    
    // 6. Calculate composite score
    const compositeScore = Math.round(
      (priceScore * WEIGHTS.price +
       yieldScore * WEIGHTS.yield +
       matchQualityScore * WEIGHTS.matchQuality +
       sentimentScore * WEIGHTS.sentiment +
       liquidityScore * WEIGHTS.liquidity +
       recencyScore * WEIGHTS.recency) * 100
    )
    
    // 7. Skip if below threshold
    if (compositeScore < MIN_COMPOSITE_SCORE) {
      continue
    }
    
    // 8. Calculate PSM discount
    const referencePsm = comparable.time_weighted_avg_psm > 0 
      ? comparable.time_weighted_avg_psm 
      : comparable.median_price_per_sqm
    
    const psmDiscountPct = ((referencePsm - listingPsm) / referencePsm) * 100
    const priceDiscountPct = ((comparable.median_price - listing.asking_price) / comparable.median_price) * 100
    const savingsAed = comparable.median_price - listing.asking_price
    
    // 9. Build score breakdown
    const breakdown: ScoreBreakdown = {
      price: Math.round(priceScore * 100) / 100,
      yield: Math.round(yieldScore * 100) / 100,
      matchQuality: Math.round(matchQualityScore * 100) / 100,
      sentiment: Math.round(sentimentScore * 100) / 100,
      liquidity: Math.round(liquidityScore * 100) / 100,
      recency: Math.round(recencyScore * 100) / 100,
    }
    
    // 10. Build signal
    signals.push({
      org_id: orgId,
      type: "pricing_opportunity",
      source: "bayut",
      source_type: "portal",
      geo_type: "area",
      geo_id: listing.area_name?.toLowerCase().replace(/\s+/g, "_") || "unknown",
      geo_name: listing.area_name || "Unknown",
      segment: listing.property_type || "residential",
      timeframe: "current",
      metric: "price_per_sqm",
      current_value: listingPsm,
      prev_value: referencePsm,
      delta_pct: -psmDiscountPct,
      confidence_score: comparable.confidence_score,
      severity: determineSeverity(compositeScore),
      status: "new",
      signal_key: `portal|bayut|pricing_opportunity|area|${listing.area_name}|${listing.property_type}|listing|${listing.listing_id}`,
      evidence: {
        composite_score: compositeScore,
        rating: determineRating(compositeScore),
        score_breakdown: breakdown,
        
        listing_id: listing.listing_id,
        listing_url: listing.listing_url,
        portal: listing.portal,
        property_type: listing.property_type,
        bedrooms: listing.bedrooms,
        size_sqm: listing.size_sqm,
        asking_price: listing.asking_price,
        price_per_sqm: Math.round(listingPsm),
        listed_date: listing.listed_date,
        
        dld_median_psm: Math.round(comparable.median_price_per_sqm),
        dld_time_weighted_psm: Math.round(comparable.time_weighted_avg_psm),
        psm_discount_pct: Math.round(psmDiscountPct * 10) / 10,
        
        dld_median_price: Math.round(comparable.median_price),
        price_discount_pct: Math.round(priceDiscountPct * 10) / 10,
        savings_aed: Math.round(savingsAed),
        dld_price_range: {
          min: Math.round(comparable.price_range_min),
          max: Math.round(comparable.price_range_max),
        },
        
        match_tier: comparable.match_tier,
        match_description: comparable.match_description,
        comparable_count: comparable.comparable_count,
        latest_transaction_date: comparable.latest_date,
        
        yield_analysis: yieldData ? {
          estimated_annual_rent: yieldData.median_rent_annual,
          gross_yield_pct: grossYield ? Math.round(grossYield * 10) / 10 : null,
          area_avg_yield_pct: yieldData.gross_yield ? Math.round(yieldData.gross_yield * 1000) / 10 : null,
        } : null,
        
        liquidity_analysis: liquidityData ? {
          area_avg_dom: Math.round(liquidityData.avg_days_on_market),
          stale_listings: liquidityData.stale_listings_count,
          fresh_listings: liquidityData.fresh_listings_count,
          liquidity_score: liquidityData.liquidity_score,
        } : null,
        
        recency_score: recencyScore,
      },
    })
  }
  
  console.log(`[detectPricingOpportunities] Analysis complete: ${analyzed} analyzed, ${skipped} skipped, ${signals.length} opportunities`)
  
  // Upsert signals
  if (signals.length > 0) {
    const BATCH_SIZE = 50
    let created = 0
    
    for (let i = 0; i < signals.length; i += BATCH_SIZE) {
      const batch = signals.slice(i, i + BATCH_SIZE)
      
      const { error } = await supabase
        .from("market_signal")
        .upsert(batch, {
          onConflict: "signal_key",
          ignoreDuplicates: false,
        })
      
      if (error) {
        console.error(`[detectPricingOpportunities] Error upserting batch:`, error.message)
      } else {
        created += batch.length
      }
    }
    
    console.log(`[detectPricingOpportunities] Upserted ${created} signals`)
    return { created, analyzed, skipped }
  }
  
  return { created: 0, analyzed, skipped }
}
