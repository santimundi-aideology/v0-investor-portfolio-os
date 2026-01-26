/**
 * Context Compression Utilities
 * Compress full context data into token-efficient summaries
 */

import type { Investor, Property } from "@/lib/types"
import type {
  CompressedInvestorContext,
  CompressedPropertyContext,
  CompressedMarketContext,
} from "../cache/context-cache"
import { TOKEN_BUDGETS, estimateTokens } from "../config/token-budgets"

/**
 * Compress investor mandate into ultra-compact summary
 * Target: ~200 chars / ~50 tokens
 * 
 * Example output: "Core Plus, 8-12% yield, Marina/Downtown, AED 5-20M, medium risk"
 */
export function compressInvestorContext(investor: Investor): CompressedInvestorContext {
  const mandate = investor.mandate
  
  if (!mandate) {
    return {
      investorId: investor.id,
      summaryText: `${investor.name}: no mandate defined, opportunistic`,
      keyAreas: [],
      budgetRange: "flexible",
      yieldTarget: "market rate",
      riskLevel: "medium",
      strategy: "Opportunistic",
      computedAt: new Date().toISOString(),
    }
  }
  
  // Build compact parts
  const parts: string[] = []
  
  // Strategy
  const strategy = mandate.strategy ?? "Opportunistic"
  parts.push(strategy)
  
  // Yield target
  const yieldTarget = mandate.yieldTarget ?? "market"
  parts.push(`${yieldTarget} yield`)
  
  // Top 3 areas (abbreviated)
  const areas = mandate.preferredAreas?.slice(0, 3) ?? []
  if (areas.length > 0) {
    parts.push(areas.map(a => abbreviateArea(a)).join("/"))
  } else {
    parts.push("UAE-wide")
  }
  
  // Budget range
  const minM = mandate.minInvestment ? (mandate.minInvestment / 1e6).toFixed(0) : "0"
  const maxM = mandate.maxInvestment ? (mandate.maxInvestment / 1e6).toFixed(0) : "∞"
  parts.push(`AED ${minM}-${maxM}M`)
  
  // Risk
  const risk = mandate.riskTolerance ?? "medium"
  parts.push(`${risk} risk`)
  
  const summaryText = parts.join(", ")
  
  // Ensure within budget
  const maxChars = TOKEN_BUDGETS.context.maxInvestorContext
  const truncated = summaryText.length > maxChars
    ? summaryText.slice(0, maxChars - 3) + "..."
    : summaryText
  
  return {
    investorId: investor.id,
    summaryText: truncated,
    keyAreas: areas,
    budgetRange: `${mandate.minInvestment ?? 0}-${mandate.maxInvestment ?? Infinity}`,
    yieldTarget: mandate.yieldTarget ?? "market",
    riskLevel: mandate.riskTolerance ?? "medium",
    strategy,
    computedAt: new Date().toISOString(),
  }
}

/**
 * Abbreviate common Dubai area names
 */
function abbreviateArea(area: string): string {
  const abbreviations: Record<string, string> = {
    "Dubai Marina": "Marina",
    "Downtown Dubai": "Downtown",
    "Business Bay": "BizBay",
    "Palm Jumeirah": "Palm",
    "Dubai Creek Harbour": "Creek",
    "Jumeirah Village Circle": "JVC",
    "Dubai South": "South",
    "Bluewaters Island": "Bluewaters",
    "Dubai Hills Estate": "Hills",
    "Arabian Ranches": "Ranches",
  }
  return abbreviations[area] ?? area.split(" ")[0]
}

/**
 * Compress property into ultra-compact summary
 * Target: ~150 chars / ~40 tokens
 * 
 * Example output: "Marina 3BR, AED 4.2M, 2100sqft, 8.5% yield, +5% vs DLD"
 */
export function compressPropertyContext(
  property: Property,
  priceVsMarket?: number | null,
  competingCount?: number
): CompressedPropertyContext {
  const parts: string[] = []
  
  // Area + type shorthand
  const areaShort = abbreviateArea(property.area)
  const typeShort = property.bedrooms
    ? `${property.bedrooms}BR`
    : property.type === "commercial"
    ? "Comm"
    : property.type === "land"
    ? "Land"
    : "Res"
  parts.push(`${areaShort} ${typeShort}`)
  
  // Price
  const priceM = (property.price / 1e6).toFixed(1)
  parts.push(`AED ${priceM}M`)
  
  // Size
  if (property.size) {
    parts.push(`${property.size}sqft`)
  }
  
  // Yield
  if (property.roi) {
    parts.push(`${property.roi}% yield`)
  }
  
  // Price vs market
  let priceVsMarketLabel = "no DLD data"
  if (typeof priceVsMarket === "number" && Number.isFinite(priceVsMarket)) {
    const pct = Math.round(priceVsMarket * 100)
    priceVsMarketLabel = `${pct >= 0 ? "+" : ""}${pct}% vs DLD`
    parts.push(priceVsMarketLabel)
  }
  
  // Competition level
  const competitionLevel: CompressedPropertyContext["competitionLevel"] =
    (competingCount ?? 0) > 20 ? "high" :
    (competingCount ?? 0) > 10 ? "medium" : "low"
  
  const summaryText = parts.join(", ")
  
  // Ensure within budget
  const maxChars = TOKEN_BUDGETS.context.maxPropertyContext
  const truncated = summaryText.length > maxChars
    ? summaryText.slice(0, maxChars - 3) + "..."
    : summaryText
  
  return {
    propertyId: property.id,
    summaryText: truncated,
    priceVsMarket: priceVsMarketLabel,
    yieldEstimate: property.roi ? `${property.roi}%` : "unknown",
    competitionLevel,
    area: property.area,
    type: property.type,
    computedAt: new Date().toISOString(),
  }
}

/**
 * Compress market data into ultra-compact summary
 * Target: ~200 chars / ~50 tokens
 * 
 * Example output: "Marina: AED 2,450/psf median, +5% QoQ, bullish, Metro 2027"
 */
export function compressMarketContext(
  area: string,
  data: {
    medianPricePsf?: number | null
    priceChangeQoQ?: number | null
    sentiment?: string | null
    topNews?: string | null
    activeListings?: number | null
    grossYield?: number | null
  }
): CompressedMarketContext {
  const parts: string[] = []
  
  // Area name
  parts.push(`${abbreviateArea(area)}:`)
  
  // Median price
  if (data.medianPricePsf) {
    parts.push(`AED ${Math.round(data.medianPricePsf).toLocaleString()}/psf`)
  }
  
  // Price change
  let priceDirection: CompressedMarketContext["priceDirection"] = "stable"
  if (data.priceChangeQoQ) {
    const pct = Math.round(data.priceChangeQoQ * 100)
    if (pct > 3) {
      priceDirection = "rising"
      parts.push(`+${pct}% QoQ`)
    } else if (pct < -3) {
      priceDirection = "falling"
      parts.push(`${pct}% QoQ`)
    } else {
      parts.push("stable QoQ")
    }
  }
  
  // Yield if available
  if (data.grossYield) {
    parts.push(`${(data.grossYield * 100).toFixed(1)}% yield`)
  }
  
  // Sentiment
  const sentiment = normalizeSentiment(data.sentiment)
  parts.push(sentiment)
  
  // Top news (truncated)
  let topNews = ""
  if (data.topNews) {
    topNews = data.topNews.slice(0, 50)
    if (data.topNews.length > 50) topNews += "..."
  }
  
  const summaryText = parts.join(", ")
  
  // Ensure within budget
  const maxChars = TOKEN_BUDGETS.context.maxMarketContext
  const truncated = summaryText.length > maxChars
    ? summaryText.slice(0, maxChars - 3) + "..."
    : summaryText
  
  return {
    area,
    summaryText: truncated,
    priceDirection,
    sentiment,
    keySignal: data.priceChangeQoQ
      ? `price ${priceDirection} ${Math.abs(Math.round((data.priceChangeQoQ ?? 0) * 100))}%`
      : "stable",
    topNews,
    medianPricePsf: data.medianPricePsf ?? null,
    grossYield: data.grossYield ?? null,
    computedAt: new Date().toISOString(),
  }
}

function normalizeSentiment(sentiment: string | null | undefined): CompressedMarketContext["sentiment"] {
  const s = (sentiment ?? "").toLowerCase()
  if (s.includes("bull") || s.includes("positive") || s.includes("up")) return "bullish"
  if (s.includes("bear") || s.includes("negative") || s.includes("down")) return "bearish"
  return "neutral"
}

/**
 * Build combined context for AI scoring
 * Ensures total stays within token budget
 */
export function buildCombinedContext(
  investor: CompressedInvestorContext,
  properties: CompressedPropertyContext[],
  markets: Map<string, CompressedMarketContext>
): string {
  const sections: string[] = []
  
  // Investor section
  sections.push(`INVESTOR: ${investor.summaryText}`)
  
  // Properties section
  sections.push("")
  sections.push("PROPERTIES:")
  for (let i = 0; i < properties.length; i++) {
    const p = properties[i]
    const market = markets.get(p.area)
    const marketInfo = market ? ` | Market: ${market.sentiment}, ${market.priceDirection}` : ""
    sections.push(`${i + 1}. [${p.propertyId}] ${p.summaryText}${marketInfo}`)
  }
  
  // Check total length
  const combined = sections.join("\n")
  const estimatedTokens = estimateTokens(combined)
  
  if (estimatedTokens > TOKEN_BUDGETS.context.maxTotalContext) {
    console.warn(
      `[compress-context] Combined context exceeds budget: ${estimatedTokens} tokens ` +
      `(max: ${TOKEN_BUDGETS.context.maxTotalContext})`
    )
  }
  
  return combined
}
