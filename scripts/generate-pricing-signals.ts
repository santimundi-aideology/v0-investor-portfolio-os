/**
 * Enhanced Pricing Opportunity Signal Generator
 * 
 * Compares Bayut listing prices against DLD historical transaction data
 * using price-per-sqm, tiered matching, yield analysis, and composite scoring.
 * 
 * Usage:
 *   npx tsx scripts/generate-pricing-signals.ts [--min-score=N] [--min-comparables=N]
 * 
 * Examples:
 *   npx tsx scripts/generate-pricing-signals.ts --min-score=55
 *   npx tsx scripts/generate-pricing-signals.ts --min-score=40 --min-comparables=5
 */

import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Parse command line args
const args = process.argv.slice(2)
const minScoreArg = args.find(a => a.startsWith("--min-score="))?.split("=")[1]
const minComparablesArg = args.find(a => a.startsWith("--min-comparables="))?.split("=")[1]

const MIN_COMPOSITE_SCORE = minScoreArg ? parseFloat(minScoreArg) : 55 // Default: "fair_deal" or better
const MIN_COMPARABLES = minComparablesArg ? parseInt(minComparablesArg, 10) : 3

// Tenant ID for signals
const DEFAULT_TENANT_ID = "11111111-1111-1111-1111-111111111111"

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

// Cache for yield and liquidity data
const yieldCache = new Map<string, YieldData | null>()
const liquidityCache = new Map<string, LiquidityData | null>()

/**
 * Fetch yield data from market_metric_snapshot
 */
async function getYieldData(areaName: string, segment: string): Promise<YieldData | null> {
  const key = `${areaName}|${segment}`
  if (yieldCache.has(key)) return yieldCache.get(key) ?? null
  
  // Try to find rental data for this area/segment
  const { data, error } = await supabase
    .from("market_metric_snapshot")
    .select("geo_name, segment, metric, value")
    .ilike("geo_name", `%${areaName}%`)
    .in("metric", ["median_rent_annual", "gross_yield"])
    .order("computed_at", { ascending: false })
    .limit(10)
  
  if (error || !data || data.length === 0) {
    yieldCache.set(key, null)
    return null
  }
  
  // Find rent and yield metrics
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
async function getLiquidityData(areaName: string, propertyType: string): Promise<LiquidityData | null> {
  const key = `${areaName}|${propertyType}`
  if (liquidityCache.has(key)) return liquidityCache.get(key) ?? null
  
  const { data, error } = await supabase
    .from("area_liquidity_metrics")
    .select("*")
    .ilike("area_name", `%${areaName}%`)
    .limit(1)
    .single()
  
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
async function findBestComparables(listing: PortalListing): Promise<ComparableResult | null> {
  // Parse bedrooms for DLD matching
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
    console.warn(`Error finding comparables for ${listing.area_name}:`, error.message)
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
 * Generate enhanced pricing signals
 */
async function generatePricingSignals(): Promise<EnhancedSignal[]> {
  console.log("Fetching active portal listings...")
  
  const { data: listings, error: listingsError } = await supabase
    .from("portal_listings")
    .select("id, portal, listing_id, listing_url, area_name, building_name, property_type, bedrooms, size_sqm, asking_price, price_per_sqm, listed_date")
    .eq("is_active", true)
    .eq("listing_type", "sale")
    .gt("asking_price", 0)
  
  if (listingsError || !listings) {
    console.error("Error fetching listings:", listingsError?.message)
    return []
  }
  
  console.log(`Found ${listings.length} active listings to analyze`)
  
  const signals: EnhancedSignal[] = []
  let analyzed = 0
  let opportunities = 0
  let skipped = 0
  
  for (const listing of listings) {
    analyzed++
    
    if (analyzed % 25 === 0) {
      console.log(`  Analyzed ${analyzed}/${listings.length}... (${opportunities} opportunities found)`)
    }
    
    // 1. Find best comparables using tiered matching
    const comparable = await findBestComparables(listing)
    if (!comparable) {
      skipped++
      continue
    }
    
    // 2. Get yield data
    const yieldData = await getYieldData(listing.area_name, listing.property_type)
    
    // 3. Get liquidity data
    const liquidityData = await getLiquidityData(listing.area_name, listing.property_type)
    
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
    const sentimentScore = 0.5 // Default neutral (would be fetched from news cache)
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
    
    opportunities++
    
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
      org_id: DEFAULT_TENANT_ID,
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
      delta_pct: -psmDiscountPct, // Negative = below market
      confidence_score: comparable.confidence_score,
      severity: determineSeverity(compositeScore),
      status: "new",
      signal_key: `portal|bayut|pricing_opportunity|area|${listing.area_name}|${listing.property_type}|listing|${listing.listing_id}`,
      evidence: {
        // Composite scoring
        composite_score: compositeScore,
        rating: determineRating(compositeScore),
        score_breakdown: breakdown,
        
        // Listing details
        listing_id: listing.listing_id,
        listing_url: listing.listing_url,
        portal: listing.portal,
        property_type: listing.property_type,
        bedrooms: listing.bedrooms,
        size_sqm: listing.size_sqm,
        asking_price: listing.asking_price,
        price_per_sqm: Math.round(listingPsm),
        listed_date: listing.listed_date,
        
        // Price analysis (PSM-based)
        dld_median_psm: Math.round(comparable.median_price_per_sqm),
        dld_time_weighted_psm: Math.round(comparable.time_weighted_avg_psm),
        psm_discount_pct: Math.round(psmDiscountPct * 10) / 10,
        
        // Price analysis (total price)
        dld_median_price: Math.round(comparable.median_price),
        price_discount_pct: Math.round(priceDiscountPct * 10) / 10,
        savings_aed: Math.round(savingsAed),
        dld_price_range: {
          min: Math.round(comparable.price_range_min),
          max: Math.round(comparable.price_range_max),
        },
        
        // Comparable quality
        match_tier: comparable.match_tier,
        match_description: comparable.match_description,
        comparable_count: comparable.comparable_count,
        latest_transaction_date: comparable.latest_date,
        
        // Yield analysis
        yield_analysis: yieldData ? {
          estimated_annual_rent: yieldData.median_rent_annual,
          gross_yield_pct: grossYield ? Math.round(grossYield * 10) / 10 : null,
          area_avg_yield_pct: yieldData.gross_yield ? Math.round(yieldData.gross_yield * 1000) / 10 : null,
        } : null,
        
        // Liquidity analysis
        liquidity_analysis: liquidityData ? {
          area_avg_dom: Math.round(liquidityData.avg_days_on_market),
          stale_listings: liquidityData.stale_listings_count,
          fresh_listings: liquidityData.fresh_listings_count,
          liquidity_score: liquidityData.liquidity_score,
        } : null,
        
        // Recency
        recency_score: recencyScore,
      },
    })
  }
  
  console.log(`\nAnalysis complete:`)
  console.log(`  - Analyzed: ${analyzed}`)
  console.log(`  - Skipped (insufficient data): ${skipped}`)
  console.log(`  - Opportunities found: ${opportunities}`)
  
  return signals
}

/**
 * Upsert signals to database
 */
async function upsertSignals(signals: EnhancedSignal[]): Promise<number> {
  if (signals.length === 0) return 0
  
  console.log(`\nUpserting ${signals.length} pricing opportunity signals...`)
  
  const BATCH_SIZE = 50
  let upserted = 0
  
  for (let i = 0; i < signals.length; i += BATCH_SIZE) {
    const batch = signals.slice(i, i + BATCH_SIZE)
    
    const { error } = await supabase
      .from("market_signal")
      .upsert(batch, {
        onConflict: "signal_key",
        ignoreDuplicates: false,
      })
    
    if (error) {
      console.error(`Error upserting batch ${i / BATCH_SIZE + 1}:`, error.message)
    } else {
      upserted += batch.length
      console.log(`  Batch ${i / BATCH_SIZE + 1}: ${batch.length} signals`)
    }
  }
  
  return upserted
}

/**
 * Display summary of generated signals
 */
function displaySummary(signals: EnhancedSignal[]) {
  if (signals.length === 0) {
    console.log("\nNo pricing opportunities found.")
    return
  }
  
  console.log("\n--- Top Pricing Opportunities (by Composite Score) ---\n")
  
  // Sort by composite score
  const sorted = [...signals].sort((a, b) => {
    const scoreA = (a.evidence as Record<string, number>).composite_score ?? 0
    const scoreB = (b.evidence as Record<string, number>).composite_score ?? 0
    return scoreB - scoreA
  })
  
  console.log("Best deals:")
  console.log("-".repeat(120))
  console.log(
    "Area".padEnd(22) + " | " +
    "Type".padEnd(12) + " | " +
    "Score".padStart(5) + " | " +
    "Rating".padEnd(18) + " | " +
    "PSM Disc".padStart(8) + " | " +
    "Tier".padStart(4) + " | " +
    "Comps".padStart(5) + " | " +
    "Ask PSM".padStart(10) + " | " +
    "DLD PSM".padStart(10)
  )
  console.log("-".repeat(120))
  
  for (const signal of sorted.slice(0, 20)) {
    const ev = signal.evidence as Record<string, unknown>
    const score = ev.composite_score as number
    const rating = ev.rating as string
    const psmDisc = ev.psm_discount_pct as number
    const tier = ev.match_tier as number
    const comps = ev.comparable_count as number
    const askPsm = ev.price_per_sqm as number
    const dldPsm = ev.dld_time_weighted_psm as number
    
    console.log(
      signal.geo_name.slice(0, 21).padEnd(22) + " | " +
      (signal.segment || "").slice(0, 11).padEnd(12) + " | " +
      score.toString().padStart(5) + " | " +
      rating.replace("_", " ").padEnd(18) + " | " +
      `${psmDisc.toFixed(1)}%`.padStart(8) + " | " +
      `T${tier}`.padStart(4) + " | " +
      comps.toString().padStart(5) + " | " +
      Math.round(askPsm).toLocaleString().padStart(10) + " | " +
      Math.round(dldPsm).toLocaleString().padStart(10)
    )
  }
  
  console.log("-".repeat(120))
  
  // Summary by rating
  const byRating = new Map<string, number>()
  for (const s of signals) {
    const rating = (s.evidence as Record<string, string>).rating ?? "unknown"
    byRating.set(rating, (byRating.get(rating) || 0) + 1)
  }
  
  console.log("\nBy rating:")
  for (const [rating, count] of byRating.entries()) {
    console.log(`  ${rating.replace(/_/g, " ").padEnd(25)}: ${count}`)
  }
  
  // Summary by match tier
  const byTier = new Map<number, number>()
  for (const s of signals) {
    const tier = (s.evidence as Record<string, number>).match_tier ?? 0
    byTier.set(tier, (byTier.get(tier) || 0) + 1)
  }
  
  console.log("\nBy match tier:")
  for (const [tier, count] of [...byTier.entries()].sort((a, b) => a[0] - b[0])) {
    const desc = tier === 1 ? "Same building" : tier === 2 ? "Area+type+beds+size" : tier === 3 ? "Area+type" : "Area only"
    console.log(`  Tier ${tier} (${desc.padEnd(20)}): ${count}`)
  }
}

async function main() {
  console.log("=== Enhanced Pricing Opportunity Signal Generator ===\n")
  console.log(`Minimum composite score: ${MIN_COMPOSITE_SCORE}`)
  console.log(`Minimum comparables: ${MIN_COMPARABLES}`)
  console.log(`Score weights: Price=${WEIGHTS.price*100}%, Yield=${WEIGHTS.yield*100}%, Match=${WEIGHTS.matchQuality*100}%, Sentiment=${WEIGHTS.sentiment*100}%, Liquidity=${WEIGHTS.liquidity*100}%, Recency=${WEIGHTS.recency*100}%`)
  console.log()
  
  // Generate signals
  const signals = await generatePricingSignals()
  
  // Display summary
  displaySummary(signals)
  
  // Upsert to database
  const count = await upsertSignals(signals)
  console.log(`\n✓ Upserted ${count} signals to market_signal`)
  
  console.log("\n✓ Done")
}

main().catch(console.error)
