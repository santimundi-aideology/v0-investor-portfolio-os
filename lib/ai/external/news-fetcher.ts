/**
 * News Fetcher with Rate Limiting
 * Fetches real-time news for areas with aggressive caching and rate limits
 * Uses Tavily API for web search when available, falls back to AI simulation
 */

import "server-only"

import OpenAI from "openai"
import { canFetchNews, recordUsage } from "../monitoring/token-monitor"
import { getCachedNews, setCachedNews } from "@/lib/db/news-cache"
import { TOKEN_BUDGETS, estimateTokens } from "../config/token-budgets"

// Types
export type NewsItem = {
  title: string
  summary: string
  source: string
  url?: string
  publishedDate?: string
  sentiment: "positive" | "neutral" | "negative"
  relevanceScore: number
  categories: string[]
}

export type AreaNewsContext = {
  area: string
  fetchedAt: string
  newsItems: NewsItem[]
  marketSentiment: "bullish" | "neutral" | "bearish"
  keyDevelopments: string[]
  risks: string[]
  opportunities: string[]
  summaryText: string
}

// Configuration
const NEWS_CONFIG = {
  maxItemsPerArea: 5,
  summaryMaxChars: 300,
  cacheDurationHours: 24,
  fallbackMessage: "No recent major developments. Market conditions normal.",
  tavilyApiKey: process.env.TAVILY_API_KEY,
}

// OpenAI client (lazy init)
let openaiClient: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return openaiClient
}

/**
 * Tavily web search response type
 */
interface TavilySearchResult {
  title: string
  url: string
  content: string
  score: number
  published_date?: string
}

interface TavilyResponse {
  results: TavilySearchResult[]
  query: string
}

/**
 * Get news for an area with caching and rate limiting
 * Returns compressed summary suitable for AI context
 */
export async function getNewsForArea(
  area: string,
  orgId?: string
): Promise<string> {
  // 1. Check cache first (FREE)
  const cached = await getCachedNews(area, NEWS_CONFIG.cacheDurationHours)
  if (cached) {
    return cached.summaryText
  }
  
  // 2. Check rate limit
  const rateCheck = canFetchNews()
  if (!rateCheck.allowed) {
    console.warn(`[news-fetcher] Rate limited for ${area}, retry in ${rateCheck.retryAfterMs}ms`)
    return buildFallbackSummary(area)
  }
  
  // 3. Fetch fresh news
  try {
    const newsContext = await fetchAndAnalyzeNews(area)
    
    // 4. Cache the result
    await setCachedNews(area, newsContext, orgId)
    
    return newsContext.summaryText
  } catch (error) {
    console.error(`[news-fetcher] Failed to fetch news for ${area}:`, error)
    return buildFallbackSummary(area)
  }
}

/**
 * Get full news context (for detailed views)
 */
export async function getFullNewsContext(
  area: string,
  orgId?: string
): Promise<AreaNewsContext> {
  // Check cache
  const cached = await getCachedNews(area, NEWS_CONFIG.cacheDurationHours)
  if (cached) {
    return cached
  }
  
  // Check rate limit
  const rateCheck = canFetchNews()
  if (!rateCheck.allowed) {
    return buildFallbackContext(area)
  }
  
  try {
    const newsContext = await fetchAndAnalyzeNews(area)
    await setCachedNews(area, newsContext, orgId)
    return newsContext
  } catch (error) {
    console.error(`[news-fetcher] Failed to fetch news for ${area}:`, error)
    return buildFallbackContext(area)
  }
}

/**
 * Search the web using Tavily API
 */
async function searchWithTavily(query: string): Promise<TavilySearchResult[]> {
  if (!NEWS_CONFIG.tavilyApiKey) {
    return []
  }
  
  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: NEWS_CONFIG.tavilyApiKey,
        query,
        search_depth: "basic",
        max_results: NEWS_CONFIG.maxItemsPerArea,
        include_domains: [
          "gulfnews.com",
          "arabianbusiness.com",
          "thenationalnews.com",
          "khaleejtimes.com",
          "zawya.com",
          "propertyfinder.ae",
          "bayut.com",
        ],
      }),
    })
    
    if (!response.ok) {
      console.warn(`[news-fetcher] Tavily API error: ${response.status}`)
      return []
    }
    
    const data = (await response.json()) as TavilyResponse
    return data.results ?? []
  } catch (error) {
    console.warn(`[news-fetcher] Tavily search failed:`, error)
    return []
  }
}

/**
 * Fetch news and analyze using AI
 * Uses Tavily web search when available, falls back to AI simulation
 */
async function fetchAndAnalyzeNews(area: string): Promise<AreaNewsContext> {
  const openai = getOpenAI()
  const startTime = Date.now()
  
  // Try real web search first
  const searchQuery = `${area} Dubai real estate market news developments 2026`
  const webResults = await searchWithTavily(searchQuery)
  
  // Build news items from web results
  const newsItems: NewsItem[] = webResults.map((result, idx) => ({
    title: result.title,
    summary: result.content.slice(0, 200),
    source: new URL(result.url).hostname.replace("www.", ""),
    url: result.url,
    publishedDate: result.published_date,
    sentiment: "neutral" as const, // Will be updated by AI analysis
    relevanceScore: result.score ?? (1 - idx * 0.1),
    categories: ["real_estate", "dubai"],
  }))
  
  // Build context for AI analysis
  const webContext = webResults.length > 0
    ? `Based on these recent news articles about ${area}, Dubai:\n\n${webResults.map((r, i) => 
        `${i + 1}. "${r.title}"\n   ${r.content.slice(0, 300)}...`
      ).join("\n\n")}`
    : ""
  
  const analysisPrompt = webContext
    ? `Analyze these real news articles about ${area}, Dubai real estate market and provide a market intelligence summary.

${webContext}

OUTPUT FORMAT (JSON):
{
  "marketSentiment": "bullish" | "neutral" | "bearish",
  "keyDevelopments": ["<max 3 items from the news, 15 words each>"],
  "risks": ["<max 2 items if mentioned, 15 words each>"],
  "opportunities": ["<max 2 items if mentioned, 15 words each>"],
  "summaryText": "<80 words max summarizing key market conditions based on the news>"
}

Focus on: price trends, new projects, infrastructure, supply/demand, regulatory changes.`
    : `You are a real estate market analyst. Generate a brief market intelligence summary for ${area}, Dubai based on typical current market conditions.

IMPORTANT: Keep the response very concise to minimize tokens.

OUTPUT FORMAT (JSON):
{
  "marketSentiment": "bullish" | "neutral" | "bearish",
  "keyDevelopments": ["<max 2 items, 15 words each>"],
  "risks": ["<max 1 item, 15 words>"],
  "opportunities": ["<max 1 item, 15 words>"],
  "summaryText": "<60 words max summarizing key market conditions>"
}

Focus on: infrastructure projects, price trends, supply/demand, regulatory changes.`
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a concise market analyst. Respond only in JSON." },
      { role: "user", content: analysisPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_tokens: 400,
  })
  
  const duration = Date.now() - startTime
  
  // Record usage
  const inputTokens = estimateTokens(analysisPrompt)
  const outputTokens = response.usage?.completion_tokens ?? 150
  recordUsage("news", inputTokens, outputTokens)
  
  console.log(`[news-fetcher] Fetched news for ${area} in ${duration}ms (${webResults.length} web results)`)
  
  // Parse response
  const content = response.choices[0].message.content ?? "{}"
  const parsed = JSON.parse(content) as {
    marketSentiment?: string
    keyDevelopments?: string[]
    risks?: string[]
    opportunities?: string[]
    summaryText?: string
  }
  
  // Build context
  const newsContext: AreaNewsContext = {
    area,
    fetchedAt: new Date().toISOString(),
    newsItems,
    marketSentiment: normalizeSentiment(parsed.marketSentiment),
    keyDevelopments: (parsed.keyDevelopments ?? []).slice(0, 3),
    risks: (parsed.risks ?? []).slice(0, 2),
    opportunities: (parsed.opportunities ?? []).slice(0, 2),
    summaryText: truncateSummary(
      parsed.summaryText ?? `${area}: Market conditions normal.`
    ),
  }
  
  return newsContext
}

function normalizeSentiment(s: string | undefined): AreaNewsContext["marketSentiment"] {
  const lower = (s ?? "").toLowerCase()
  if (lower.includes("bull") || lower === "positive") return "bullish"
  if (lower.includes("bear") || lower === "negative") return "bearish"
  return "neutral"
}

function truncateSummary(text: string): string {
  if (text.length <= NEWS_CONFIG.summaryMaxChars) return text
  return text.slice(0, NEWS_CONFIG.summaryMaxChars - 3) + "..."
}

function buildFallbackSummary(area: string): string {
  return `${area}: ${NEWS_CONFIG.fallbackMessage}`
}

function buildFallbackContext(area: string): AreaNewsContext {
  return {
    area,
    fetchedAt: new Date().toISOString(),
    newsItems: [],
    marketSentiment: "neutral",
    keyDevelopments: [],
    risks: [],
    opportunities: [],
    summaryText: buildFallbackSummary(area),
  }
}

/**
 * Batch fetch news for multiple areas
 * Respects rate limits and uses caching
 */
export async function getNewsBatch(
  areas: string[],
  orgId?: string
): Promise<Map<string, string>> {
  const results = new Map<string, string>()
  
  // Deduplicate
  const uniqueAreas = [...new Set(areas)]
  
  // Fetch in parallel (rate limiter will block excess)
  await Promise.all(
    uniqueAreas.map(async (area) => {
      const news = await getNewsForArea(area, orgId)
      results.set(area, news)
    })
  )
  
  return results
}
