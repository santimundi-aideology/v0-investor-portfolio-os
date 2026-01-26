/**
 * Deal Scorer - Composite scoring model for real estate deals
 * 
 * Combines multiple factors to produce a single deal score:
 * - Price score (30%): PSM discount vs DLD median
 * - Yield score (20%): Yield vs area average
 * - Match quality (15%): How well comparables match the listing
 * - Sentiment (15%): Market context from news
 * - Liquidity (10%): Days on market and demand signals
 * - Recency (10%): How fresh the comparison data is
 */

// Score weights
const WEIGHTS = {
  price: 0.30,
  yield: 0.20,
  matchQuality: 0.15,
  sentiment: 0.15,
  liquidity: 0.10,
  recency: 0.10,
} as const

// Types
export interface ComparableData {
  matchTier: number
  matchDescription: string
  confidenceScore: number
  comparableCount: number
  medianPrice: number
  medianPricePerSqm: number
  timeWeightedAvgPsm: number
  avgSizeSqm: number
  recencyScore: number
  latestDate: string | null
  priceRangeMin: number
  priceRangeMax: number
}

export interface YieldData {
  estimatedAnnualRent: number | null
  grossYieldPct: number | null
  areaAvgYieldPct: number | null
  yieldPremiumPct: number | null
}

export interface LiquidityData {
  daysOnMarket: number | null
  areaAvgDom: number | null
  staleListingsCount: number
  freshListingsCount: number
  liquidityScore: number
}

export interface MarketContext {
  sentiment: "bullish" | "neutral" | "bearish"
  keyDevelopments: string[]
  risks: string[]
  opportunities: string[]
  newsFreshnessDays: number
}

export interface ListingData {
  askingPrice: number
  pricePerSqm: number
  sizeSqm: number
  bedrooms: number | null
  propertyType: string
  areaName: string
  listedDate: string | null
}

export interface ScoreBreakdown {
  price: number
  yield: number
  matchQuality: number
  sentiment: number
  liquidity: number
  recency: number
}

export type DealRating = 
  | "exceptional_opportunity"
  | "strong_buy"
  | "fair_deal"
  | "market_price"
  | "overpriced"

export interface DealScore {
  compositeScore: number
  rating: DealRating
  breakdown: ScoreBreakdown
  confidence: number
  analysis: {
    priceDiscountPct: number
    psmDiscountPct: number
    savingsAed: number
    yieldAnalysis: YieldData
    marketContext: MarketContext
    liquidityAnalysis: LiquidityData
    matchTier: number
    matchDescription: string
    comparableCount: number
    dataRecency: string
  }
}

/**
 * Calculate the price score (0-1)
 * Based on PSM discount vs DLD median
 */
function calculatePriceScore(
  listingPsm: number,
  dldMedianPsm: number,
  dldTimeWeightedPsm: number
): number {
  if (!dldMedianPsm || dldMedianPsm <= 0) return 0.5

  // Use time-weighted PSM if available, otherwise use median
  const referencePsm = dldTimeWeightedPsm > 0 ? dldTimeWeightedPsm : dldMedianPsm
  
  // Calculate discount percentage (positive = listing is cheaper)
  const discountPct = ((referencePsm - listingPsm) / referencePsm) * 100

  // Score mapping:
  // >= 30% discount = 1.0 (exceptional)
  // 20% discount = 0.9
  // 10% discount = 0.75
  // 0% (at market) = 0.5
  // -10% (overpriced) = 0.25
  // -20% or worse = 0.0
  
  if (discountPct >= 30) return 1.0
  if (discountPct >= 20) return 0.85 + (discountPct - 20) * 0.015
  if (discountPct >= 10) return 0.70 + (discountPct - 10) * 0.015
  if (discountPct >= 0) return 0.50 + discountPct * 0.02
  if (discountPct >= -10) return 0.25 + (discountPct + 10) * 0.025
  if (discountPct >= -20) return 0.10 + (discountPct + 20) * 0.015
  return 0.0
}

/**
 * Calculate the yield score (0-1)
 * Based on yield vs area average
 */
function calculateYieldScore(yieldData: YieldData): number {
  if (!yieldData.grossYieldPct) return 0.5 // Neutral if no data
  
  const grossYield = yieldData.grossYieldPct
  const areaAvg = yieldData.areaAvgYieldPct ?? 5.5 // Default 5.5% if unknown
  const premium = grossYield - areaAvg

  // Score mapping:
  // >= 2% above average = 1.0
  // 1% above = 0.8
  // At average = 0.5
  // 1% below = 0.3
  // 2% or more below = 0.1
  
  if (premium >= 2) return 1.0
  if (premium >= 1) return 0.7 + premium * 0.15
  if (premium >= 0) return 0.5 + premium * 0.2
  if (premium >= -1) return 0.5 + premium * 0.2
  if (premium >= -2) return 0.1 + (premium + 2) * 0.1
  return 0.1
}

/**
 * Calculate match quality score (0-1)
 * Based on comparable matching tier
 */
function calculateMatchQualityScore(comparable: ComparableData): number {
  // Direct mapping from match tier
  const tierScores: Record<number, number> = {
    1: 0.95, // Same building
    2: 0.80, // Same area + type + bedrooms + size
    3: 0.60, // Same area + type
    4: 0.40, // Same area only
    0: 0.10, // No comparables
  }
  
  const tierScore = tierScores[comparable.matchTier] ?? 0.5
  
  // Boost based on comparable count
  let countBoost = 0
  if (comparable.comparableCount >= 50) countBoost = 0.05
  else if (comparable.comparableCount >= 20) countBoost = 0.03
  else if (comparable.comparableCount >= 10) countBoost = 0.01
  
  return Math.min(1.0, tierScore + countBoost)
}

/**
 * Calculate sentiment score (0-1)
 * Based on market news context
 */
function calculateSentimentScore(context: MarketContext): number {
  // Base score from sentiment
  let score = 0.5
  if (context.sentiment === "bullish") score = 0.8
  else if (context.sentiment === "bearish") score = 0.3
  
  // Adjust for specific factors
  const devCount = context.keyDevelopments.length
  const riskCount = context.risks.length
  const oppCount = context.opportunities.length
  
  // Positive developments boost score
  score += Math.min(0.1, devCount * 0.05)
  
  // Opportunities boost
  score += Math.min(0.1, oppCount * 0.05)
  
  // Risks reduce score
  score -= Math.min(0.15, riskCount * 0.05)
  
  // Stale news penalty
  if (context.newsFreshnessDays > 30) score -= 0.1
  else if (context.newsFreshnessDays > 7) score -= 0.05
  
  return Math.max(0, Math.min(1, score))
}

/**
 * Calculate liquidity score (0-1)
 * Based on days on market and market activity
 */
function calculateLiquidityScore(liquidity: LiquidityData, listing: ListingData): number {
  // If we have a pre-calculated liquidity score, use it as base
  let score = liquidity.liquidityScore ?? 0.5
  
  // Adjust based on listing's DOM vs area average
  if (listing.listedDate && liquidity.areaAvgDom) {
    const listingAge = Math.floor(
      (Date.now() - new Date(listing.listedDate).getTime()) / (1000 * 60 * 60 * 24)
    )
    
    if (listingAge < liquidity.areaAvgDom * 0.5) {
      // Fresh listing - positive signal
      score = Math.min(1, score + 0.1)
    } else if (listingAge > liquidity.areaAvgDom * 1.5) {
      // Stale listing - may indicate issues OR motivated seller
      score = Math.max(0, score - 0.1)
    }
  }
  
  // High ratio of stale listings = lower liquidity
  if (liquidity.staleListingsCount > liquidity.freshListingsCount * 2) {
    score = Math.max(0, score - 0.1)
  }
  
  return score
}

/**
 * Calculate recency score (0-1)
 * Based on how fresh the comparison data is
 */
function calculateRecencyScore(comparable: ComparableData): number {
  // Use the recency score from the database directly
  return comparable.recencyScore ?? 0.5
}

/**
 * Determine the deal rating based on composite score
 */
function determineRating(score: number): DealRating {
  if (score >= 85) return "exceptional_opportunity"
  if (score >= 70) return "strong_buy"
  if (score >= 55) return "fair_deal"
  if (score >= 40) return "market_price"
  return "overpriced"
}

/**
 * Main scoring function - calculates composite deal score
 */
export function calculateDealScore(
  listing: ListingData,
  comparable: ComparableData,
  yieldData: YieldData,
  marketContext: MarketContext,
  liquidity: LiquidityData
): DealScore {
  // Calculate individual scores
  const priceScore = calculatePriceScore(
    listing.pricePerSqm,
    comparable.medianPricePerSqm,
    comparable.timeWeightedAvgPsm
  )
  
  const yieldScore = calculateYieldScore(yieldData)
  const matchQualityScore = calculateMatchQualityScore(comparable)
  const sentimentScore = calculateSentimentScore(marketContext)
  const liquidityScore = calculateLiquidityScore(liquidity, listing)
  const recencyScore = calculateRecencyScore(comparable)
  
  // Build breakdown
  const breakdown: ScoreBreakdown = {
    price: Math.round(priceScore * 100) / 100,
    yield: Math.round(yieldScore * 100) / 100,
    matchQuality: Math.round(matchQualityScore * 100) / 100,
    sentiment: Math.round(sentimentScore * 100) / 100,
    liquidity: Math.round(liquidityScore * 100) / 100,
    recency: Math.round(recencyScore * 100) / 100,
  }
  
  // Calculate weighted composite score
  const compositeScore = Math.round(
    (priceScore * WEIGHTS.price +
     yieldScore * WEIGHTS.yield +
     matchQualityScore * WEIGHTS.matchQuality +
     sentimentScore * WEIGHTS.sentiment +
     liquidityScore * WEIGHTS.liquidity +
     recencyScore * WEIGHTS.recency) * 100
  )
  
  // Calculate confidence (based on match quality and data availability)
  const confidence = Math.round(
    (comparable.confidenceScore * 0.6 +
     (yieldData.grossYieldPct ? 0.2 : 0) +
     (marketContext.sentiment !== "neutral" ? 0.1 : 0.05) +
     (liquidity.areaAvgDom ? 0.1 : 0)) * 100
  ) / 100
  
  // Calculate discounts
  const referencePsm = comparable.timeWeightedAvgPsm > 0 
    ? comparable.timeWeightedAvgPsm 
    : comparable.medianPricePerSqm
  
  const psmDiscountPct = referencePsm > 0
    ? ((referencePsm - listing.pricePerSqm) / referencePsm) * 100
    : 0
  
  const priceDiscountPct = comparable.medianPrice > 0
    ? ((comparable.medianPrice - listing.askingPrice) / comparable.medianPrice) * 100
    : 0
  
  const savingsAed = comparable.medianPrice - listing.askingPrice
  
  return {
    compositeScore,
    rating: determineRating(compositeScore),
    breakdown,
    confidence,
    analysis: {
      priceDiscountPct: Math.round(priceDiscountPct * 10) / 10,
      psmDiscountPct: Math.round(psmDiscountPct * 10) / 10,
      savingsAed: Math.round(savingsAed),
      yieldAnalysis: yieldData,
      marketContext,
      liquidityAnalysis: liquidity,
      matchTier: comparable.matchTier,
      matchDescription: comparable.matchDescription,
      comparableCount: comparable.comparableCount,
      dataRecency: comparable.latestDate ?? "unknown",
    },
  }
}

/**
 * Create default/fallback data structures
 */
export function createDefaultYieldData(): YieldData {
  return {
    estimatedAnnualRent: null,
    grossYieldPct: null,
    areaAvgYieldPct: null,
    yieldPremiumPct: null,
  }
}

export function createDefaultMarketContext(): MarketContext {
  return {
    sentiment: "neutral",
    keyDevelopments: [],
    risks: [],
    opportunities: [],
    newsFreshnessDays: 999,
  }
}

export function createDefaultLiquidity(): LiquidityData {
  return {
    daysOnMarket: null,
    areaAvgDom: null,
    staleListingsCount: 0,
    freshListingsCount: 0,
    liquidityScore: 0.5,
  }
}
