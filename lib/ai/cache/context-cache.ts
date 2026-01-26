/**
 * Context Caching Layer
 * In-memory cache with database fallback for pre-computed AI contexts
 */

import { getSupabaseAdminClient } from "@/lib/db/client"
import { TOKEN_BUDGETS } from "../config/token-budgets"

// Types
export type CacheEntry<T> = {
  data: T
  expiresAt: number
  createdAt: number
}

export type CompressedMarketContext = {
  area: string
  summaryText: string
  priceDirection: "rising" | "stable" | "falling"
  sentiment: "bullish" | "neutral" | "bearish"
  keySignal: string
  topNews: string
  medianPricePsf: number | null
  grossYield: number | null
  computedAt: string
}

export type CompressedInvestorContext = {
  investorId: string
  summaryText: string
  keyAreas: string[]
  budgetRange: string
  yieldTarget: string
  riskLevel: string
  strategy: string
  computedAt: string
}

export type CompressedPropertyContext = {
  propertyId: string
  summaryText: string
  priceVsMarket: string
  yieldEstimate: string
  competitionLevel: "high" | "medium" | "low"
  area: string
  type: string
  computedAt: string
}

// In-memory cache store
const memoryCache = new Map<string, CacheEntry<unknown>>()

// Cache statistics for monitoring
let cacheStats = {
  hits: 0,
  misses: 0,
  evictions: 0,
}

/**
 * Get item from memory cache
 */
export function getFromMemoryCache<T>(key: string): T | null {
  const cached = memoryCache.get(key)
  
  if (!cached) {
    cacheStats.misses++
    return null
  }
  
  // Check expiration
  if (Date.now() > cached.expiresAt) {
    memoryCache.delete(key)
    cacheStats.evictions++
    cacheStats.misses++
    return null
  }
  
  cacheStats.hits++
  return cached.data as T
}

/**
 * Set item in memory cache
 */
export function setInMemoryCache<T>(key: string, data: T, ttlMs: number): void {
  const now = Date.now()
  memoryCache.set(key, {
    data,
    expiresAt: now + ttlMs,
    createdAt: now,
  })
}

/**
 * Clear expired entries from memory cache
 */
export function clearExpiredCache(): number {
  const now = Date.now()
  let cleared = 0
  
  for (const [key, entry] of memoryCache.entries()) {
    if (now > entry.expiresAt) {
      memoryCache.delete(key)
      cleared++
    }
  }
  
  cacheStats.evictions += cleared
  return cleared
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    ...cacheStats,
    size: memoryCache.size,
    hitRate: cacheStats.hits + cacheStats.misses > 0
      ? ((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100).toFixed(1) + "%"
      : "N/A",
  }
}

/**
 * Reset cache statistics
 */
export function resetCacheStats(): void {
  cacheStats = { hits: 0, misses: 0, evictions: 0 }
}

// ============================================
// Market Context Cache
// ============================================

const MARKET_CACHE_PREFIX = "market:"

export async function getCachedMarketContext(
  orgId: string,
  area: string
): Promise<CompressedMarketContext | null> {
  const memKey = `${MARKET_CACHE_PREFIX}${orgId}:${area}`
  
  // Check memory first
  const memCached = getFromMemoryCache<CompressedMarketContext>(memKey)
  if (memCached) return memCached
  
  // Check database
  try {
    const supabase = getSupabaseAdminClient()
    const { data } = await supabase
      .from("ai_market_summary")
      .select("*")
      .eq("org_id", orgId)
      .eq("geo_id", area)
      .order("as_of_date", { ascending: false })
      .limit(1)
      .maybeSingle()
    
    if (data) {
      const compressed: CompressedMarketContext = {
        area,
        summaryText: data.summary_text ?? `${area}: market data available`,
        priceDirection: determinePriceDirection(data.price_trend),
        sentiment: (data.market_sentiment as CompressedMarketContext["sentiment"]) ?? "neutral",
        keySignal: data.key_signal ?? "stable",
        topNews: data.top_news ?? "",
        medianPricePsf: data.median_price_per_sqft ?? null,
        grossYield: data.gross_yield_pct ?? null,
        computedAt: data.as_of_date,
      }
      
      // Cache in memory for 1 hour
      setInMemoryCache(memKey, compressed, 60 * 60 * 1000)
      
      return compressed
    }
  } catch (error) {
    console.warn(`[context-cache] Failed to fetch market context for ${area}:`, error)
  }
  
  return null
}

function determinePriceDirection(trend: unknown): CompressedMarketContext["priceDirection"] {
  if (typeof trend === "string") {
    if (trend.includes("rising") || trend.includes("up")) return "rising"
    if (trend.includes("falling") || trend.includes("down")) return "falling"
  }
  return "stable"
}

// ============================================
// Investor Context Cache
// ============================================

const INVESTOR_CACHE_PREFIX = "investor:"

export function getCachedInvestorContext(
  investorId: string
): CompressedInvestorContext | null {
  const memKey = `${INVESTOR_CACHE_PREFIX}${investorId}`
  return getFromMemoryCache<CompressedInvestorContext>(memKey)
}

export function setCachedInvestorContext(
  context: CompressedInvestorContext
): void {
  const memKey = `${INVESTOR_CACHE_PREFIX}${context.investorId}`
  const ttl = TOKEN_BUDGETS.cache.investorContextHours * 60 * 60 * 1000
  setInMemoryCache(memKey, context, ttl)
}

// ============================================
// Property Context Cache
// ============================================

const PROPERTY_CACHE_PREFIX = "property:"

export function getCachedPropertyContext(
  propertyId: string
): CompressedPropertyContext | null {
  const memKey = `${PROPERTY_CACHE_PREFIX}${propertyId}`
  return getFromMemoryCache<CompressedPropertyContext>(memKey)
}

export function setCachedPropertyContext(
  context: CompressedPropertyContext
): void {
  const memKey = `${PROPERTY_CACHE_PREFIX}${context.propertyId}`
  const ttl = TOKEN_BUDGETS.cache.propertyContextHours * 60 * 60 * 1000
  setInMemoryCache(memKey, context, ttl)
}

// ============================================
// Batch Operations
// ============================================

export async function getCachedMarketContextsBatch(
  orgId: string,
  areas: string[]
): Promise<Map<string, CompressedMarketContext>> {
  const results = new Map<string, CompressedMarketContext>()
  
  // Get all in parallel
  await Promise.all(
    areas.map(async (area) => {
      const cached = await getCachedMarketContext(orgId, area)
      if (cached) {
        results.set(area, cached)
      }
    })
  )
  
  return results
}
