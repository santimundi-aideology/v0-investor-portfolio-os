import "server-only"

import { getSupabaseAdminClient } from "@/lib/db/client"
import { getInvestorById } from "@/lib/db/investors"
import { getHoldingsByInvestor } from "@/lib/db/holdings"
import { listMarketSignalsFeed } from "@/lib/db/market-signals"
import { formatMarketSignalType, type MarketSignalItem } from "@/lib/mock-market-signals"

export type MarketContextOptions = {
  investorId: string
  tenantId: string
  limit?: number
}

export type MarketSignalWithImpact = MarketSignalItem & {
  portfolioImpact: "direct" | "mandate_area" | "related" | "none"
  impactReason?: string
}

export type MarketContext = {
  signals: MarketSignalWithImpact[]
  investorAreas: string[]
  portfolioAreas: string[]
  contextText: string
}

/**
 * Normalize area names for comparison
 * Handles variations like "Dubai Marina" vs "dubai-marina" vs "DUBAI MARINA"
 */
function normalizeArea(area: string): string {
  return area
    .toLowerCase()
    .replace(/[-_\s]+/g, " ")
    .trim()
}

/**
 * Check if two area names match (fuzzy comparison)
 */
function areasMatch(area1: string, area2: string): boolean {
  const norm1 = normalizeArea(area1)
  const norm2 = normalizeArea(area2)
  return norm1 === norm2 || norm1.includes(norm2) || norm2.includes(norm1)
}

/**
 * Get investor's preferred areas from their mandate
 */
function getInvestorPreferredAreas(mandate: Record<string, unknown> | undefined): string[] {
  if (!mandate) return []
  
  const areas: string[] = []
  
  // Check various mandate field names
  if (mandate.preferredAreas && Array.isArray(mandate.preferredAreas)) {
    areas.push(...(mandate.preferredAreas as string[]))
  }
  if (mandate.preferred_areas && Array.isArray(mandate.preferred_areas)) {
    areas.push(...(mandate.preferred_areas as string[]))
  }
  if (mandate.areas && Array.isArray(mandate.areas)) {
    areas.push(...(mandate.areas as string[]))
  }
  
  return areas.filter((a) => typeof a === "string" && a.trim())
}

/**
 * Get areas from investor's current holdings
 * This requires fetching holdings and their associated listing areas
 */
async function getPortfolioAreas(investorId: string, tenantId: string): Promise<string[]> {
  const supabase = getSupabaseAdminClient()
  
  try {
    const holdings = await getHoldingsByInvestor(investorId)
    if (holdings.length === 0) return []
    
    const listingIds = holdings.map((h) => h.listingId).filter(Boolean)
    if (listingIds.length === 0) return []
    
    const { data: listings, error } = await supabase
      .from("listings")
      .select("area")
      .in("id", listingIds)
    
    if (error) {
      console.warn("[market-context] Error fetching listing areas:", error.message)
      return []
    }
    
    const areas = (listings ?? [])
      .map((l: Record<string, unknown>) => l.area as string)
      .filter((a): a is string => typeof a === "string" && a.trim().length > 0)
    
    return [...new Set(areas)]
  } catch (err) {
    console.warn("[market-context] Error getting portfolio areas:", err)
    return []
  }
}

/**
 * Determine the impact level of a signal on the investor's portfolio
 */
function classifySignalImpact(
  signal: MarketSignalItem,
  portfolioAreas: string[],
  mandateAreas: string[]
): { impact: MarketSignalWithImpact["portfolioImpact"]; reason?: string } {
  const signalArea = signal.geoName || signal.geoId
  
  // Check if signal affects a portfolio holding area
  for (const area of portfolioAreas) {
    if (areasMatch(signalArea, area)) {
      return {
        impact: "direct",
        reason: `Directly affects your holding in ${area}`,
      }
    }
  }
  
  // Check if signal affects a mandate preferred area
  for (const area of mandateAreas) {
    if (areasMatch(signalArea, area)) {
      return {
        impact: "mandate_area",
        reason: `Affects ${area}, one of your target investment areas`,
      }
    }
  }
  
  // Check if signal is in a related/nearby area (same city or submarket)
  if (signal.geoType === "city" || signal.geoType === "submarket") {
    return {
      impact: "related",
      reason: `Market-wide signal for ${signalArea}`,
    }
  }
  
  return { impact: "none" }
}

/**
 * Build market context for an investor
 * Fetches relevant market signals and maps them to the investor's portfolio
 */
export async function buildMarketContext(options: MarketContextOptions): Promise<MarketContext> {
  const { investorId, tenantId, limit = 20 } = options
  
  // Fetch investor data
  const investor = await getInvestorById(investorId)
  const mandate = investor?.mandate as Record<string, unknown> | undefined
  
  // Get investor's areas of interest
  const mandateAreas = getInvestorPreferredAreas(mandate)
  const portfolioAreas = await getPortfolioAreas(investorId, tenantId)
  const allInvestorAreas = [...new Set([...mandateAreas, ...portfolioAreas])]
  
  // Fetch market signals
  let signals: MarketSignalItem[] = []
  try {
    signals = await listMarketSignalsFeed({ tenantId, limit: limit * 2 })
  } catch (err) {
    console.warn("[market-context] Error fetching signals:", err)
    signals = []
  }
  
  // Classify and filter signals by relevance
  const signalsWithImpact: MarketSignalWithImpact[] = signals.map((signal) => {
    const { impact, reason } = classifySignalImpact(signal, portfolioAreas, mandateAreas)
    return {
      ...signal,
      portfolioImpact: impact,
      impactReason: reason,
    }
  })
  
  // Sort by relevance: direct > mandate_area > related > none
  // Then by severity: urgent > watch > info
  // Then by recency
  const impactOrder: Record<MarketSignalWithImpact["portfolioImpact"], number> = {
    direct: 0,
    mandate_area: 1,
    related: 2,
    none: 3,
  }
  const severityOrder: Record<string, number> = {
    urgent: 0,
    watch: 1,
    info: 2,
  }
  
  const sortedSignals = signalsWithImpact.sort((a, b) => {
    // First by impact
    const impactDiff = impactOrder[a.portfolioImpact] - impactOrder[b.portfolioImpact]
    if (impactDiff !== 0) return impactDiff
    
    // Then by severity
    const sevDiff = (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3)
    if (sevDiff !== 0) return sevDiff
    
    // Then by recency
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
  
  // Take top N relevant signals
  const relevantSignals = sortedSignals.slice(0, limit)
  
  // Build context text
  const contextText = buildMarketContextText({
    signals: relevantSignals,
    investorAreas: allInvestorAreas,
    portfolioAreas,
    mandateAreas,
    investorName: investor?.name,
  })
  
  return {
    signals: relevantSignals,
    investorAreas: allInvestorAreas,
    portfolioAreas,
    contextText,
  }
}

/**
 * Build formatted market context text for AI agent
 */
function buildMarketContextText(data: {
  signals: MarketSignalWithImpact[]
  investorAreas: string[]
  portfolioAreas: string[]
  mandateAreas: string[]
  investorName?: string
}): string {
  const { signals, investorAreas, portfolioAreas, mandateAreas, investorName } = data
  const sections: string[] = []
  
  // Investor areas section
  sections.push("INVESTOR MARKET FOCUS:")
  if (portfolioAreas.length > 0) {
    sections.push(`- Portfolio Holdings Areas: ${portfolioAreas.join(", ")}`)
  }
  if (mandateAreas.length > 0) {
    sections.push(`- Investment Mandate Areas: ${mandateAreas.join(", ")}`)
  }
  if (investorAreas.length === 0) {
    sections.push("- No specific area preferences defined")
  }
  sections.push("")
  
  // Direct impact signals
  const directSignals = signals.filter((s) => s.portfolioImpact === "direct")
  if (directSignals.length > 0) {
    sections.push("SIGNALS AFFECTING PORTFOLIO HOLDINGS:")
    for (const signal of directSignals) {
      sections.push(formatSignalEntry(signal))
    }
    sections.push("")
  }
  
  // Mandate area signals
  const mandateSignals = signals.filter((s) => s.portfolioImpact === "mandate_area")
  if (mandateSignals.length > 0) {
    sections.push("SIGNALS IN TARGET INVESTMENT AREAS:")
    for (const signal of mandateSignals) {
      sections.push(formatSignalEntry(signal))
    }
    sections.push("")
  }
  
  // Related/market-wide signals
  const relatedSignals = signals.filter((s) => s.portfolioImpact === "related")
  if (relatedSignals.length > 0) {
    sections.push("BROADER MARKET SIGNALS:")
    for (const signal of relatedSignals.slice(0, 5)) {
      sections.push(formatSignalEntry(signal))
    }
    sections.push("")
  }
  
  // Summary statistics
  const urgentCount = signals.filter((s) => s.severity === "urgent").length
  const watchCount = signals.filter((s) => s.severity === "watch").length
  const infoCount = signals.filter((s) => s.severity === "info").length
  
  sections.push("SIGNAL SUMMARY:")
  sections.push(`- Total signals analyzed: ${signals.length}`)
  sections.push(`- Urgent signals: ${urgentCount}`)
  sections.push(`- Watch signals: ${watchCount}`)
  sections.push(`- Informational signals: ${infoCount}`)
  sections.push(`- Signals affecting portfolio: ${directSignals.length}`)
  sections.push(`- Signals in target areas: ${mandateSignals.length}`)
  sections.push("")
  
  // Instructions for the AI
  sections.push("ANALYSIS INSTRUCTIONS:")
  sections.push("- Prioritize signals that directly affect the investor's portfolio holdings")
  sections.push("- Explain what each signal means in practical terms")
  sections.push("- Connect signals to actionable recommendations")
  sections.push("- Consider the cumulative effect of multiple signals in the same area")
  sections.push("- Flag any concerning patterns or emerging opportunities")
  if (investorName) {
    sections.push(`- Address insights specifically to ${investorName}'s portfolio context`)
  }
  
  return sections.join("\n")
}

/**
 * Format a single signal entry for context text
 */
function formatSignalEntry(signal: MarketSignalWithImpact): string {
  const lines: string[] = []
  
  const typeLabel = formatMarketSignalType(signal.type)
  const severityEmoji = signal.severity === "urgent" ? "🔴" : signal.severity === "watch" ? "🟡" : "🔵"
  
  lines.push(`- ${severityEmoji} ${typeLabel} in ${signal.geoName || signal.geoId} (${signal.segment})`)
  lines.push(`    Source: ${signal.source} (${signal.sourceType}) | Timeframe: ${signal.timeframe}`)
  lines.push(`    Current: ${signal.currentValueLabel}`)
  
  if (signal.prevValueLabel && signal.deltaPct !== null) {
    const direction = (signal.deltaPct ?? 0) >= 0 ? "↑" : "↓"
    const pctChange = Math.abs((signal.deltaPct ?? 0) * 100).toFixed(1)
    lines.push(`    Previous: ${signal.prevValueLabel} | Change: ${direction}${pctChange}%`)
  }
  
  if (signal.confidenceScore) {
    lines.push(`    Confidence: ${(signal.confidenceScore * 100).toFixed(0)}%`)
  }
  
  if (signal.impactReason) {
    lines.push(`    Impact: ${signal.impactReason}`)
  }
  
  return lines.join("\n")
}

/**
 * Get signals filtered by specific areas
 */
export async function getSignalsForAreas(
  tenantId: string,
  areas: string[],
  options: { limit?: number; includeRelated?: boolean } = {}
): Promise<MarketSignalItem[]> {
  const { limit = 20, includeRelated = false } = options
  
  if (areas.length === 0) return []
  
  try {
    const allSignals = await listMarketSignalsFeed({ tenantId, limit: 100 })
    
    const filtered = allSignals.filter((signal) => {
      const signalArea = signal.geoName || signal.geoId
      
      // Check exact area match
      for (const area of areas) {
        if (areasMatch(signalArea, area)) return true
      }
      
      // Include related city/submarket signals if requested
      if (includeRelated && (signal.geoType === "city" || signal.geoType === "submarket")) {
        return true
      }
      
      return false
    })
    
    return filtered.slice(0, limit)
  } catch (err) {
    console.warn("[market-context] Error fetching signals for areas:", err)
    return []
  }
}

/**
 * Get a summary of signal activity for an area
 */
export async function getAreaSignalSummary(
  tenantId: string,
  area: string
): Promise<{
  totalSignals: number
  urgentSignals: number
  priceDirection: "up" | "down" | "stable" | "unknown"
  yieldTrend: "improving" | "declining" | "stable" | "unknown"
  supplyPressure: "high" | "normal" | "low" | "unknown"
}> {
  const signals = await getSignalsForAreas(tenantId, [area], { limit: 50 })
  
  const summary = {
    totalSignals: signals.length,
    urgentSignals: signals.filter((s) => s.severity === "urgent").length,
    priceDirection: "unknown" as const,
    yieldTrend: "unknown" as const,
    supplyPressure: "unknown" as const,
  }
  
  // Analyze price signals
  const priceSignals = signals.filter((s) => s.type === "price_change")
  if (priceSignals.length > 0) {
    const avgDelta = priceSignals.reduce((sum, s) => sum + (s.deltaPct ?? 0), 0) / priceSignals.length
    if (avgDelta > 0.02) summary.priceDirection = "up"
    else if (avgDelta < -0.02) summary.priceDirection = "down"
    else summary.priceDirection = "stable"
  }
  
  // Analyze yield signals
  const yieldSignals = signals.filter((s) => s.type === "yield_opportunity" || s.metric === "gross_yield")
  if (yieldSignals.length > 0) {
    const avgDelta = yieldSignals.reduce((sum, s) => sum + (s.deltaPct ?? 0), 0) / yieldSignals.length
    if (avgDelta > 0.01) summary.yieldTrend = "improving"
    else if (avgDelta < -0.01) summary.yieldTrend = "declining"
    else summary.yieldTrend = "stable"
  }
  
  // Analyze supply signals
  const supplySignals = signals.filter((s) => s.type === "supply_spike" || s.metric === "active_listings")
  if (supplySignals.length > 0) {
    const hasSpike = supplySignals.some((s) => s.type === "supply_spike" && s.severity === "urgent")
    if (hasSpike) summary.supplyPressure = "high"
    else summary.supplyPressure = "normal"
  }
  
  return summary
}

/**
 * Get real DLD market statistics for an area
 * Fetches actual transaction data from Dubai Land Department
 */
export async function getDLDAreaStats(area: string): Promise<{
  transactionCount: number
  avgPrice: number
  avgPricePerSqm: number
  yoyChangePct: number
  minPrice: number
  maxPrice: number
  hasData: boolean
}> {
  const supabase = getSupabaseAdminClient()
  
  try {
    const { data, error } = await supabase
      .from("dld_area_stats")
      .select("*")
      .ilike("area_name_en", `%${area}%`)
      .limit(1)
      .maybeSingle()
    
    if (error || !data) {
      return {
        transactionCount: 0,
        avgPrice: 0,
        avgPricePerSqm: 0,
        yoyChangePct: 0,
        minPrice: 0,
        maxPrice: 0,
        hasData: false,
      }
    }
    
    return {
      transactionCount: Number(data.transaction_count ?? 0),
      avgPrice: Number(data.avg_price ?? 0),
      avgPricePerSqm: Number(data.avg_price_per_sqm ?? 0),
      yoyChangePct: Number(data.yoy_change_pct ?? 0),
      minPrice: Number(data.min_price ?? 0),
      maxPrice: Number(data.max_price ?? 0),
      hasData: true,
    }
  } catch (err) {
    console.warn("[market-context] Error fetching DLD area stats:", err)
    return {
      transactionCount: 0,
      avgPrice: 0,
      avgPricePerSqm: 0,
      yoyChangePct: 0,
      minPrice: 0,
      maxPrice: 0,
      hasData: false,
    }
  }
}

/**
 * Get portal listing comparison for an area
 * Compares DLD transaction prices with current portal asking prices
 */
export async function getAreaPriceComparison(area: string): Promise<{
  dldAvgPrice: number
  portalAvgPrice: number
  premiumPct: number
  portalListingCount: number
  isOpportunity: boolean
  hasData: boolean
}> {
  const supabase = getSupabaseAdminClient()
  
  try {
    const { data, error } = await supabase
      .from("area_price_comparison")
      .select("*")
      .ilike("area_name", `%${area}%`)
      .limit(1)
      .maybeSingle()
    
    if (error || !data) {
      return {
        dldAvgPrice: 0,
        portalAvgPrice: 0,
        premiumPct: 0,
        portalListingCount: 0,
        isOpportunity: false,
        hasData: false,
      }
    }
    
    const premiumPct = Number(data.price_premium_pct ?? 0)
    
    return {
      dldAvgPrice: Number(data.dld_avg_price ?? 0),
      portalAvgPrice: Number(data.portal_avg_price ?? 0),
      premiumPct,
      portalListingCount: Number(data.portal_count ?? 0),
      isOpportunity: premiumPct < -5, // Asking price below market value
      hasData: true,
    }
  } catch (err) {
    console.warn("[market-context] Error fetching area price comparison:", err)
    return {
      dldAvgPrice: 0,
      portalAvgPrice: 0,
      premiumPct: 0,
      portalListingCount: 0,
      isOpportunity: false,
      hasData: false,
    }
  }
}

/**
 * Build comprehensive market intelligence for an area
 * Combines DLD stats, portal comparisons, and market signals
 */
export async function buildAreaMarketIntelligence(
  tenantId: string,
  area: string
): Promise<string> {
  const sections: string[] = []
  
  // Get DLD statistics
  const dldStats = await getDLDAreaStats(area)
  
  // Get portal comparison
  const comparison = await getAreaPriceComparison(area)
  
  // Get signal summary
  const signalSummary = await getAreaSignalSummary(tenantId, area)
  
  sections.push(`=== MARKET INTELLIGENCE: ${area.toUpperCase()} ===`)
  sections.push("")
  
  if (dldStats.hasData) {
    sections.push("DLD TRANSACTION DATA (Official Records):")
    sections.push(`- Transaction Count: ${dldStats.transactionCount.toLocaleString()}`)
    sections.push(`- Average Price: AED ${Math.round(dldStats.avgPrice).toLocaleString()}`)
    sections.push(`- Price Range: AED ${Math.round(dldStats.minPrice).toLocaleString()} - AED ${Math.round(dldStats.maxPrice).toLocaleString()}`)
    sections.push(`- Price per sqm: AED ${Math.round(dldStats.avgPricePerSqm).toLocaleString()}/sqm`)
    
    if (dldStats.yoyChangePct !== 0) {
      const direction = dldStats.yoyChangePct > 0 ? "↑" : "↓"
      sections.push(`- YoY Change: ${direction}${Math.abs(dldStats.yoyChangePct).toFixed(1)}%`)
    }
    sections.push("")
  }
  
  if (comparison.hasData) {
    sections.push("ASKING VS MARKET COMPARISON:")
    sections.push(`- Current Portal Listings: ${comparison.portalListingCount}`)
    sections.push(`- DLD Market Price: AED ${Math.round(comparison.dldAvgPrice).toLocaleString()}`)
    sections.push(`- Portal Asking Price: AED ${Math.round(comparison.portalAvgPrice).toLocaleString()}`)
    
    if (comparison.isOpportunity) {
      sections.push(`- 🟢 OPPORTUNITY: Asking ${Math.abs(comparison.premiumPct).toFixed(1)}% below market`)
    } else if (comparison.premiumPct > 5) {
      sections.push(`- 🔴 PREMIUM: Asking ${comparison.premiumPct.toFixed(1)}% above market`)
    } else {
      sections.push(`- ⚪ FAIR: Prices aligned with market (±5%)`)
    }
    sections.push("")
  }
  
  if (signalSummary.totalSignals > 0) {
    sections.push("MARKET SIGNALS:")
    sections.push(`- Total Signals: ${signalSummary.totalSignals}`)
    sections.push(`- Urgent Signals: ${signalSummary.urgentSignals}`)
    sections.push(`- Price Direction: ${signalSummary.priceDirection}`)
    sections.push(`- Yield Trend: ${signalSummary.yieldTrend}`)
    sections.push(`- Supply Pressure: ${signalSummary.supplyPressure}`)
    sections.push("")
  }
  
  // Investment recommendation
  sections.push("INVESTMENT ASSESSMENT:")
  const assessments: string[] = []
  
  if (comparison.isOpportunity) {
    assessments.push("Potential value opportunity - asking prices below recent transaction levels")
  }
  if (dldStats.yoyChangePct > 5) {
    assessments.push("Strong appreciation trend over past year")
  }
  if (signalSummary.priceDirection === "up" && signalSummary.yieldTrend === "improving") {
    assessments.push("Favorable market dynamics - rising prices with improving yields")
  }
  if (signalSummary.supplyPressure === "high") {
    assessments.push("High supply may create buying opportunities but impacts rental yields")
  }
  
  if (assessments.length > 0) {
    for (const assessment of assessments) {
      sections.push(`- ${assessment}`)
    }
  } else {
    sections.push("- Standard market conditions, evaluate specific properties for opportunities")
  }
  
  return sections.join("\n")
}
