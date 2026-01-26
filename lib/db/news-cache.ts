/**
 * News Cache Database Operations
 * Persistent storage for area news context
 */

import "server-only"

import { getSupabaseAdminClient } from "./client"
import type { AreaNewsContext } from "@/lib/ai/external/news-fetcher"

// In-memory fallback cache (for when DB table doesn't exist yet)
const memoryNewsCache = new Map<string, { data: AreaNewsContext; expiresAt: number }>()

/**
 * Get cached news for an area
 */
export async function getCachedNews(
  area: string,
  maxAgeHours: number = 24
): Promise<AreaNewsContext | null> {
  // Check memory cache first
  const memCached = memoryNewsCache.get(area)
  if (memCached && Date.now() < memCached.expiresAt) {
    return memCached.data
  }
  
  // Try database
  try {
    const supabase = getSupabaseAdminClient()
    const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000).toISOString()
    
    const { data, error } = await supabase
      .from("area_news_cache")
      .select("*")
      .eq("area", area)
      .gt("fetched_at", cutoff)
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    
    if (error) {
      // Table might not exist yet - use memory cache
      if (error.code === "42P01") {
        console.warn("[news-cache] Table area_news_cache does not exist, using memory cache")
        return null
      }
      throw error
    }
    
    if (data) {
      const context: AreaNewsContext = {
        area: data.area,
        fetchedAt: data.fetched_at,
        newsItems: (data.news_items as AreaNewsContext["newsItems"]) ?? [],
        marketSentiment: data.market_sentiment ?? "neutral",
        keyDevelopments: (data.key_developments as string[]) ?? [],
        risks: (data.risks as string[]) ?? [],
        opportunities: (data.opportunities as string[]) ?? [],
        summaryText: data.summary_text ?? `${area}: No recent data`,
      }
      
      // Also cache in memory
      memoryNewsCache.set(area, {
        data: context,
        expiresAt: Date.now() + maxAgeHours * 60 * 60 * 1000,
      })
      
      return context
    }
  } catch (error) {
    console.warn(`[news-cache] Failed to read from DB for ${area}:`, error)
  }
  
  return null
}

/**
 * Cache news for an area
 */
export async function setCachedNews(
  area: string,
  context: AreaNewsContext,
  orgId?: string
): Promise<void> {
  // Always update memory cache
  memoryNewsCache.set(area, {
    data: context,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  })
  
  // Try to write to database
  try {
    const supabase = getSupabaseAdminClient()
    
    const row = {
      area: context.area,
      org_id: orgId ?? null,
      fetched_at: context.fetchedAt,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      market_sentiment: context.marketSentiment,
      key_developments: context.keyDevelopments,
      risks: context.risks,
      opportunities: context.opportunities,
      news_items: context.newsItems,
      summary_text: context.summaryText,
    }
    
    const { error } = await supabase
      .from("area_news_cache")
      .upsert(row, {
        onConflict: orgId ? "org_id,area" : "area",
      })
    
    if (error) {
      // Table might not exist yet
      if (error.code === "42P01") {
        console.warn("[news-cache] Table area_news_cache does not exist, using memory cache only")
        return
      }
      throw error
    }
  } catch (error) {
    console.warn(`[news-cache] Failed to write to DB for ${area}:`, error)
  }
}

/**
 * Clear expired news cache entries
 */
export async function clearExpiredNewsCache(): Promise<number> {
  // Clear memory cache
  const now = Date.now()
  let cleared = 0
  
  for (const [area, entry] of memoryNewsCache.entries()) {
    if (now > entry.expiresAt) {
      memoryNewsCache.delete(area)
      cleared++
    }
  }
  
  // Clear database cache
  try {
    const supabase = getSupabaseAdminClient()
    
    const { data, error } = await supabase
      .from("area_news_cache")
      .delete()
      .lt("expires_at", new Date().toISOString())
      .select("id")
    
    if (!error && data) {
      cleared += data.length
    }
  } catch (error) {
    console.warn("[news-cache] Failed to clear expired DB entries:", error)
  }
  
  return cleared
}

/**
 * Get all cached areas (for debugging/admin)
 */
export function getCachedAreas(): string[] {
  return Array.from(memoryNewsCache.keys())
}
