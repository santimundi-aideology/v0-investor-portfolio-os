import "server-only"

import { getSupabaseAdminClient } from "@/lib/db/client"

/**
 * AI Summary Context Loader
 * -------------------------
 * Loads pre-aggregated context from AI summary tables.
 * This is the cost-controlled alternative to loading raw data.
 *
 * Benefits:
 * - Fixed, predictable token count (~2000 tokens max)
 * - Pre-formatted text ready for AI consumption
 * - No risk of loading unlimited raw data
 */

export interface AIMarketSummary {
  geoId: string
  geoName: string
  segment: string
  asOfDate: string
  medianDldPrice: number | null
  medianPricePerSqft: number | null
  medianRentAnnual: number | null
  grossYieldPct: number | null
  activeListingsCount: number
  priceTrend: string | null
  supplyTrend: string | null
  summaryText: string | null
}

export interface AIInvestorSummary {
  investorId: string
  name: string
  email: string | null
  mandateSummary: string | null
  preferredGeos: string[]
  preferredSegments: string[]
  yieldTarget: number | null
  budgetMin: number | null
  budgetMax: number | null
  budgetRange: string | null
  riskTolerance: string | null
  portfolioSummary: string | null
  holdingsCount: number
  portfolioValue: number
  avgYield: number | null
  activeSignalsCount: number
  topHoldings: Array<{
    id: string
    name: string
    value: number
    yield: number | null
  }>
}

export interface SummaryContext {
  market: AIMarketSummary[]
  investor: AIInvestorSummary | null
  contextText: string
  tokenEstimate: number
}

/**
 * Load AI-safe market summary for specified geos
 * Returns pre-aggregated market data with controlled size
 */
export async function loadAIMarketSummary(
  orgId: string,
  options?: {
    geoIds?: string[]
    segments?: string[]
    limit?: number
  }
): Promise<AIMarketSummary[]> {
  const supabase = getSupabaseAdminClient()
  const limit = options?.limit ?? 20
  
  try {
    let query = supabase
      .from("ai_market_summary")
      .select(`
        geo_id, geo_name, segment, as_of_date,
        median_dld_price, median_price_per_sqft, median_rent_annual,
        gross_yield_pct, active_listings_count, price_trend, supply_trend,
        summary_text
      `)
      .eq("org_id", orgId)
      .order("as_of_date", { ascending: false })
      .limit(limit)
    
    if (options?.geoIds?.length) {
      query = query.in("geo_id", options.geoIds)
    }
    
    if (options?.segments?.length) {
      query = query.in("segment", options.segments)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error("[loadAIMarketSummary] error:", error)
      return []
    }
    
    return ((data ?? []) as Array<Record<string, unknown>>).map(row => ({
      geoId: row.geo_id as string,
      geoName: row.geo_name as string,
      segment: row.segment as string,
      asOfDate: row.as_of_date as string,
      medianDldPrice: row.median_dld_price as number | null,
      medianPricePerSqft: row.median_price_per_sqft as number | null,
      medianRentAnnual: row.median_rent_annual as number | null,
      grossYieldPct: row.gross_yield_pct as number | null,
      activeListingsCount: (row.active_listings_count as number) ?? 0,
      priceTrend: row.price_trend as string | null,
      supplyTrend: row.supply_trend as string | null,
      summaryText: row.summary_text as string | null,
    }))
  } catch (error) {
    console.error("[loadAIMarketSummary] unexpected error:", error)
    return []
  }
}

/**
 * Load AI-safe investor summary
 * Returns pre-aggregated investor context
 */
export async function loadAIInvestorSummary(
  orgId: string,
  investorId: string
): Promise<AIInvestorSummary | null> {
  const supabase = getSupabaseAdminClient()
  
  try {
    const { data, error } = await supabase
      .from("ai_investor_summary")
      .select(`
        investor_id, name, email,
        mandate_summary, preferred_geos, preferred_segments,
        yield_target, budget_min, budget_max, budget_range,
        risk_tolerance, portfolio_summary, holdings_count,
        portfolio_value, avg_yield, active_signals_count,
        top_holdings_json
      `)
      .eq("org_id", orgId)
      .eq("investor_id", investorId)
      .maybeSingle()
    
    if (error) {
      console.error("[loadAIInvestorSummary] error:", error)
      return null
    }
    
    if (!data) {
      return null
    }
    
    const row = data as Record<string, unknown>
    
    return {
      investorId: row.investor_id as string,
      name: row.name as string,
      email: row.email as string | null,
      mandateSummary: row.mandate_summary as string | null,
      preferredGeos: (row.preferred_geos as string[]) ?? [],
      preferredSegments: (row.preferred_segments as string[]) ?? [],
      yieldTarget: row.yield_target as number | null,
      budgetMin: row.budget_min as number | null,
      budgetMax: row.budget_max as number | null,
      budgetRange: row.budget_range as string | null,
      riskTolerance: row.risk_tolerance as string | null,
      portfolioSummary: row.portfolio_summary as string | null,
      holdingsCount: (row.holdings_count as number) ?? 0,
      portfolioValue: (row.portfolio_value as number) ?? 0,
      avgYield: row.avg_yield as number | null,
      activeSignalsCount: (row.active_signals_count as number) ?? 0,
      topHoldings: (row.top_holdings_json as Array<{
        id: string
        name: string
        value: number
        yield: number | null
      }>) ?? [],
    }
  } catch (error) {
    console.error("[loadAIInvestorSummary] unexpected error:", error)
    return null
  }
}

/**
 * Build complete summary context for AI
 * Returns pre-formatted text with estimated token count
 */
export async function buildSummaryContext(options: {
  orgId: string
  investorId?: string
  geoIds?: string[]
  segments?: string[]
  maxMarketSummaries?: number
}): Promise<SummaryContext> {
  const {
    orgId,
    investorId,
    geoIds,
    segments,
    maxMarketSummaries = 15,
  } = options
  
  // Load market and investor summaries in parallel
  const [market, investor] = await Promise.all([
    loadAIMarketSummary(orgId, { geoIds, segments, limit: maxMarketSummaries }),
    investorId ? loadAIInvestorSummary(orgId, investorId) : Promise.resolve(null),
  ])
  
  // Build formatted context text
  const sections: string[] = []
  
  // Investor context (from pre-computed summary)
  if (investor) {
    sections.push("=== INVESTOR CONTEXT ===")
    sections.push(`Name: ${investor.name}`)
    if (investor.mandateSummary) {
      sections.push(`Mandate: ${investor.mandateSummary}`)
    }
    if (investor.portfolioSummary) {
      sections.push(`Portfolio: ${investor.portfolioSummary}`)
    }
    if (investor.activeSignalsCount > 0) {
      sections.push(`Active market signals: ${investor.activeSignalsCount}`)
    }
    sections.push("")
  }
  
  // Market context (from pre-computed summaries)
  if (market.length > 0) {
    sections.push("=== MARKET OVERVIEW ===")
    
    // Use pre-computed summary text where available
    const withText = market.filter(m => m.summaryText)
    const withoutText = market.filter(m => !m.summaryText)
    
    for (const m of withText.slice(0, 10)) {
      sections.push(`${m.geoName} ${m.segment}: ${m.summaryText}`)
    }
    
    // Generate summary for entries without pre-computed text
    for (const m of withoutText.slice(0, 5)) {
      const parts: string[] = [`${m.geoName} ${m.segment}:`]
      if (m.medianDldPrice) {
        parts.push(`median AED ${formatCompact(m.medianDldPrice)}`)
      }
      if (m.grossYieldPct) {
        parts.push(`${(m.grossYieldPct * 100).toFixed(1)}% yield`)
      }
      if (m.activeListingsCount > 0) {
        parts.push(`${m.activeListingsCount} listings`)
      }
      sections.push(parts.join(", "))
    }
    sections.push("")
  }
  
  const contextText = sections.join("\n")
  
  // Estimate tokens (rough: 1 token ≈ 4 chars)
  const tokenEstimate = Math.ceil(contextText.length / 4)
  
  return {
    market,
    investor,
    contextText,
    tokenEstimate,
  }
}

/**
 * Format large numbers compactly (e.g., 1.5M, 250K)
 */
function formatCompact(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K`
  }
  return String(Math.round(value))
}

/**
 * Truncate context text to a maximum character limit
 * Preserves complete lines where possible
 */
export function truncateContextText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text
  
  // Find a good break point (end of line before limit)
  const truncated = text.slice(0, maxChars)
  const lastNewline = truncated.lastIndexOf("\n")
  
  if (lastNewline > maxChars * 0.8) {
    return truncated.slice(0, lastNewline) + "\n[...context truncated...]"
  }
  
  return truncated + "\n[...context truncated...]"
}

/**
 * Estimate token count for text
 * Uses rough approximation: 1 token ≈ 4 characters
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Check if summary tables have data for the given org
 */
export async function hasSummaryData(orgId: string): Promise<{
  hasMarketData: boolean
  hasInvestorData: boolean
}> {
  const supabase = getSupabaseAdminClient()
  
  try {
    const [marketResult, investorResult] = await Promise.all([
      supabase
        .from("ai_market_summary")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .limit(1),
      supabase
        .from("ai_investor_summary")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .limit(1),
    ])
    
    return {
      hasMarketData: (marketResult.count ?? 0) > 0,
      hasInvestorData: (investorResult.count ?? 0) > 0,
    }
  } catch {
    return { hasMarketData: false, hasInvestorData: false }
  }
}
