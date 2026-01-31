/**
 * Opportunity Tool Executor
 * Executes tool calls from the Opportunity Finder agent
 */

import "server-only"

import { getSupabaseAdminClient } from "@/lib/db/client"
import type { Investor, Property } from "@/lib/types"
import { scoreOpportunitiesForInvestor, quickScoreOpportunities } from "../scoring/opportunity-scorer"
import { getExternalDataForProperty } from "../external/external-data-context"
import { getFullNewsContext, getNewsForArea } from "../external/news-fetcher"
import { compressInvestorContext } from "../compression/compress-context"
import { HOT_OPPORTUNITIES } from "@/lib/demo/hot-opportunities"
import type {
  SearchOpportunitiesInput,
  GetAreaMarketDataInput,
  GetAreaNewsInput,
  ComparePropertiesInput,
  GetPropertyDetailsInput,
  GetPortfolioSummaryInput,
  AnalyzeHoldingInput,
  GetMarketSignalsInput,
  CompareAreasInput,
} from "./opportunity-tools"
import { getPortfolioSummary, getHoldingProperty, calcYieldPct, calcAppreciationPct, formatAED } from "@/lib/real-estate"

// Context passed to all tool executions
export type ToolExecutionContext = {
  investorId?: string
  investor?: Investor
  orgId: string
}

/**
 * Execute a tool call and return the result
 */
export async function executeOpportunityTool(
  toolName: string,
  args: Record<string, unknown>,
  context: ToolExecutionContext
): Promise<unknown> {
  switch (toolName) {
    case "search_opportunities":
      return await executeSearchOpportunities(args as SearchOpportunitiesInput, context)
    
    case "get_area_market_data":
      return await executeGetAreaMarketData(args as GetAreaMarketDataInput, context)
    
    case "get_area_news":
      return await executeGetAreaNews(args as GetAreaNewsInput, context)
    
    case "compare_properties":
      return await executeCompareProperties(args as ComparePropertiesInput, context)
    
    case "get_property_details":
      return await executeGetPropertyDetails(args as GetPropertyDetailsInput, context)
    
    case "get_investor_mandate":
      return executeGetInvestorMandate(context)
    
    // Portfolio Advisor tools
    case "get_portfolio_summary":
      return await executeGetPortfolioSummary(args as GetPortfolioSummaryInput, context)
    
    case "analyze_holding":
      return await executeAnalyzeHolding(args as AnalyzeHoldingInput, context)
    
    // Market Intelligence tools
    case "get_market_signals":
      return await executeGetMarketSignals(args as GetMarketSignalsInput, context)
    
    case "compare_areas":
      return await executeCompareAreas(args as CompareAreasInput, context)
    
    default:
      // Try new agent tools
      return await executeNewAgentTool(toolName, args, context)
  }
}

// ============================================
// Tool Implementations
// ============================================

async function executeSearchOpportunities(
  args: SearchOpportunitiesInput,
  context: ToolExecutionContext
) {
  const { investor, orgId } = context
  
  if (!investor) {
    return { error: "No investor context available" }
  }
  
  const limit = Math.min(args.limit ?? 5, 10)
  
  // Use the full scoring pipeline
  const result = await scoreOpportunitiesForInvestor({
    investor,
    orgId,
    filters: {
      areas: args.areas,
      propertyTypes: args.propertyTypes,
      minPrice: args.minPrice,
      maxPrice: args.maxPrice,
      minYield: args.minYield,
      status: "available",
    },
    maxToScore: limit,
    includeNews: false, // Keep costs down
  })
  
  // Include hot demo opportunities if no real results or for enhanced demo
  const hotOpportunities = getFilteredHotOpportunities(args, investor)
  
  // Combine scored opportunities with hot opportunities
  const scoredOpps = result.opportunities.slice(0, limit).map(o => ({
    id: o.property.id,
    title: o.property.title,
    area: o.property.area,
    type: o.property.type,
    price: o.property.price,
    priceFormatted: formatPrice(o.property.price),
    yield: o.property.roi,
    bedrooms: o.property.bedrooms,
    size: o.property.size,
    // Scoring
    score: o.combinedScore,
    tier: o.tier,
    // AI insights
    headline: o.aiScore?.headline ?? null,
    reasoning: o.aiScore?.reasoning ?? null,
    keyStrengths: o.aiScore?.keyStrengths ?? o.ruleReasons.slice(0, 2),
    considerations: o.aiScore?.considerations ?? [],
  }))
  
  // If we have fewer than limit results, add hot opportunities
  const combinedOpps = [...scoredOpps]
  if (scoredOpps.length < limit && hotOpportunities.length > 0) {
    const hotToAdd = hotOpportunities.slice(0, limit - scoredOpps.length)
    combinedOpps.push(...hotToAdd.map(h => ({
      id: h.id,
      title: h.title,
      area: h.area,
      type: h.type,
      price: h.price,
      priceFormatted: h.priceFormatted,
      yield: h.yield,
      bedrooms: h.bedrooms,
      size: h.size,
      score: h.score,
      tier: "ai" as const, // Hot deals are treated as AI-scored opportunities
      headline: h.headline,
      reasoning: h.story,
      keyStrengths: h.keyStrengths,
      considerations: [],
      tag: h.tag,
      whyNow: h.whyNow,
      vsMarket: h.vsMarket,
    })))
  }
  
  // Format for AI consumption
  return {
    totalFound: Math.max(result.totalCandidates, combinedOpps.length),
    resultsReturned: combinedOpps.length,
    opportunities: combinedOpps,
    tiers: result.tiers,
    hasHotOpportunities: hotOpportunities.length > 0,
  }
}

/**
 * Filter hot opportunities based on search criteria
 */
function getFilteredHotOpportunities(
  args: SearchOpportunitiesInput,
  investor: Investor
) {
  return HOT_OPPORTUNITIES.filter(h => {
    // Filter by area if specified
    if (args.areas && args.areas.length > 0) {
      const matchesArea = args.areas.some(a => 
        h.area.toLowerCase().includes(a.toLowerCase()) ||
        a.toLowerCase().includes(h.area.toLowerCase())
      )
      if (!matchesArea) return false
    }
    
    // Filter by price range
    if (args.minPrice && h.price < args.minPrice) return false
    if (args.maxPrice && h.price > args.maxPrice) return false
    
    // Filter by yield
    if (args.minYield && h.yield < args.minYield) return false
    
    // Filter by property type
    if (args.propertyTypes && args.propertyTypes.length > 0) {
      const matchesType = args.propertyTypes.some(t => 
        h.type.toLowerCase().includes(t.toLowerCase())
      )
      if (!matchesType) return false
    }
    
    // Check against investor mandate if available
    if (investor.mandate) {
      if (investor.mandate.minInvestment && h.price < investor.mandate.minInvestment) return false
      if (investor.mandate.maxInvestment && h.price > investor.mandate.maxInvestment) return false
    }
    
    return true
  }).sort((a, b) => b.score - a.score)
}

async function executeGetAreaMarketData(
  args: GetAreaMarketDataInput,
  context: ToolExecutionContext
) {
  const { orgId } = context
  const supabase = getSupabaseAdminClient()
  
  // Get DLD truth data
  const { data: dldData } = await supabase
    .from("market_metric_snapshot")
    .select("*")
    .eq("org_id", orgId)
    .eq("geo_id", args.area)
    .order("window_end", { ascending: false })
    .limit(5)
  
  // Get portal data
  const { data: portalData } = await supabase
    .from("portal_listing_snapshot")
    .select("*")
    .eq("org_id", orgId)
    .eq("geo_id", args.area)
    .order("as_of_date", { ascending: false })
    .limit(1)
  
  // Get recent signals
  const { data: signals } = await supabase
    .from("market_signal")
    .select("*")
    .eq("org_id", orgId)
    .eq("geo_id", args.area)
    .order("created_at", { ascending: false })
    .limit(3)
  
  // Find relevant metrics
  const pricePsf = dldData?.find(d => d.metric === "median_price_psf")
  const rentAnnual = dldData?.find(d => d.metric === "median_rent_annual")
  const grossYield = dldData?.find(d => d.metric === "gross_yield")
  const portal = portalData?.[0]
  
  return {
    area: args.area,
    dldData: pricePsf ? {
      medianPricePsf: pricePsf.value,
      medianPricePsfFormatted: `AED ${Math.round(pricePsf.value).toLocaleString()}/psf`,
      sampleSize: pricePsf.sample_size,
      quarter: pricePsf.window_end,
      source: "Dubai Land Department",
    } : null,
    ejariData: rentAnnual ? {
      medianRentAnnual: rentAnnual.value,
      medianRentFormatted: `AED ${Math.round(rentAnnual.value).toLocaleString()}/year`,
      sampleSize: rentAnnual.sample_size,
    } : null,
    derivedMetrics: grossYield ? {
      grossYield: grossYield.value,
      grossYieldFormatted: `${(grossYield.value * 100).toFixed(1)}%`,
    } : null,
    portalData: portal ? {
      activeListings: portal.active_listings,
      priceCuts: portal.price_cuts_count,
      staleListings: portal.stale_listings_count,
      priceCutRate: portal.active_listings > 0
        ? `${((portal.price_cuts_count / portal.active_listings) * 100).toFixed(0)}%`
        : "0%",
      asOfDate: portal.as_of_date,
    } : null,
    recentSignals: (signals ?? []).map(s => ({
      type: s.type,
      severity: s.severity,
      metric: s.metric,
      delta: s.delta_pct ? `${(s.delta_pct * 100).toFixed(0)}%` : null,
      date: s.created_at,
    })),
    summary: buildMarketSummary(args.area, pricePsf, rentAnnual, grossYield, portal),
  }
}

async function executeGetAreaNews(
  args: GetAreaNewsInput,
  context: ToolExecutionContext
) {
  const newsContext = await getFullNewsContext(args.area, context.orgId)
  
  return {
    area: args.area,
    fetchedAt: newsContext.fetchedAt,
    marketSentiment: newsContext.marketSentiment,
    keyDevelopments: newsContext.keyDevelopments,
    opportunities: newsContext.opportunities,
    risks: newsContext.risks,
    summary: newsContext.summaryText,
  }
}

async function executeCompareProperties(
  args: ComparePropertiesInput,
  context: ToolExecutionContext
) {
  const { orgId, investor } = context
  const supabase = getSupabaseAdminClient()
  
  // Limit to 5 properties
  const propertyIds = args.propertyIds.slice(0, 5)
  
  // Get properties
  const { data: properties } = await supabase
    .from("listings")
    .select("*")
    .in("id", propertyIds)
  
  if (!properties?.length) {
    return { error: "No properties found" }
  }
  
  // Get external data for each
  const comparisons = await Promise.all(
    (properties as Property[]).map(async (property) => {
      const externalData = await getExternalDataForProperty({
        property,
        orgId,
        includeNews: false,
      })
      
      // Calculate score if investor available
      let score = null
      if (investor) {
        const scored = quickScoreOpportunities(investor, [property])
        score = scored[0]?.score ?? null
      }
      
      return {
        id: property.id,
        title: property.title,
        area: property.area,
        type: property.type,
        price: property.price,
        priceFormatted: formatPrice(property.price),
        pricePsf: property.size ? Math.round(property.price / property.size) : null,
        yield: property.roi,
        size: property.size,
        bedrooms: property.bedrooms,
        // Market comparison
        dldMedianPsf: externalData.dld.medianPricePsf,
        priceVsMarket: externalData.derived.priceVsMarket,
        priceVsMarketLabel: formatPriceVsMarket(externalData.derived.priceVsMarket),
        assessment: externalData.derived.assessment,
        // Competition
        competingListings: externalData.portal.competingProperties,
        // Score
        mandateScore: score,
      }
    })
  )
  
  return {
    propertiesCompared: comparisons.length,
    properties: comparisons,
    recommendation: generateComparisonRecommendation(comparisons),
  }
}

async function executeGetPropertyDetails(
  args: GetPropertyDetailsInput,
  context: ToolExecutionContext
) {
  const { orgId, investor } = context
  const supabase = getSupabaseAdminClient()
  
  // Get property
  const { data: property } = await supabase
    .from("listings")
    .select("*")
    .eq("id", args.propertyId)
    .maybeSingle()
  
  if (!property) {
    return { error: "Property not found" }
  }
  
  const prop = property as Property
  
  // Get external data
  const externalData = args.includeMarketData !== false
    ? await getExternalDataForProperty({
        property: prop,
        orgId,
        includeNews: true,
      })
    : null
  
  // Calculate score if investor available
  let score = null
  let scoreReasons: string[] = []
  if (investor) {
    const scored = quickScoreOpportunities(investor, [prop])
    if (scored[0]) {
      score = scored[0].score
      scoreReasons = scored[0].reasons
    }
  }
  
  return {
    property: {
      id: prop.id,
      title: prop.title,
      address: prop.address,
      area: prop.area,
      type: prop.type,
      status: prop.status,
      price: prop.price,
      priceFormatted: formatPrice(prop.price),
      size: prop.size,
      bedrooms: prop.bedrooms,
      bathrooms: prop.bathrooms,
      yield: prop.roi,
      trustScore: prop.trustScore,
      features: prop.features,
      description: prop.description,
    },
    marketData: externalData ? {
      dld: externalData.dld,
      ejari: externalData.ejari,
      derived: externalData.derived,
      portal: externalData.portal,
      signals: externalData.signals,
      news: externalData.news,
    } : null,
    mandateAnalysis: investor ? {
      score,
      reasons: scoreReasons,
      investorName: investor.name,
    } : null,
    summary: externalData?.summaryText ?? null,
  }
}

function executeGetInvestorMandate(context: ToolExecutionContext) {
  const { investor } = context
  
  if (!investor) {
    return { error: "No investor context available" }
  }
  
  const compressed = compressInvestorContext(investor)
  
  return {
    investorId: investor.id,
    investorName: investor.name,
    company: investor.company,
    mandate: investor.mandate ? {
      strategy: investor.mandate.strategy,
      investmentHorizon: investor.mandate.investmentHorizon,
      yieldTarget: investor.mandate.yieldTarget,
      riskTolerance: investor.mandate.riskTolerance,
      preferredAreas: investor.mandate.preferredAreas,
      propertyTypes: investor.mandate.propertyTypes,
      minInvestment: investor.mandate.minInvestment,
      maxInvestment: investor.mandate.maxInvestment,
      budgetFormatted: `AED ${(investor.mandate.minInvestment / 1e6).toFixed(0)}-${(investor.mandate.maxInvestment / 1e6).toFixed(0)}M`,
      notes: investor.mandate.notes,
    } : null,
    summary: compressed.summaryText,
  }
}

// ============================================
// Helper Functions
// ============================================

function formatPrice(price: number): string {
  if (price >= 1_000_000) {
    return `AED ${(price / 1_000_000).toFixed(1)}M`
  }
  return `AED ${price.toLocaleString()}`
}

function formatPriceVsMarket(pct: number | null): string | null {
  if (pct === null) return null
  const formatted = Math.round(pct * 100)
  return `${formatted >= 0 ? "+" : ""}${formatted}% vs market`
}

function buildMarketSummary(
  area: string,
  pricePsf: Record<string, unknown> | null | undefined,
  rentAnnual: Record<string, unknown> | null | undefined,
  grossYield: Record<string, unknown> | null | undefined,
  portal: Record<string, unknown> | null | undefined
): string {
  const parts = [`${area}:`]
  
  if (pricePsf?.value) {
    parts.push(`median AED ${Math.round(pricePsf.value as number)}/psf`)
  }
  
  if (grossYield?.value) {
    parts.push(`${((grossYield.value as number) * 100).toFixed(1)}% yield`)
  }
  
  if (portal?.active_listings) {
    parts.push(`${portal.active_listings} active listings`)
  }
  
  return parts.join(", ")
}

function generateComparisonRecommendation(
  comparisons: Array<{
    title: string
    assessment: string
    mandateScore: number | null
    priceVsMarket: number | null
  }>
): string {
  // Find best scoring property
  const withScores = comparisons.filter(c => c.mandateScore !== null)
  if (withScores.length === 0) {
    return "Unable to generate recommendation without investor mandate."
  }
  
  const best = withScores.reduce((a, b) => 
    (a.mandateScore ?? 0) > (b.mandateScore ?? 0) ? a : b
  )
  
  // Find best value
  const underpriced = comparisons.filter(c => c.assessment === "underpriced")
  
  let rec = `Based on mandate fit, "${best.title}" scores highest.`
  
  if (underpriced.length > 0 && underpriced[0].title !== best.title) {
    rec += ` "${underpriced[0].title}" is underpriced relative to market.`
  }
  
  return rec
}

// ============================================
// Portfolio Advisor Tool Implementations
// ============================================

async function executeGetPortfolioSummary(
  args: GetPortfolioSummaryInput,
  context: ToolExecutionContext
) {
  const { investor } = context
  
  if (!investor) {
    return { error: "No investor context available" }
  }
  
  const summary = getPortfolioSummary(investor.id)
  
  const holdings = summary.holdings.map((h) => {
    const property = getHoldingProperty(h)
    return {
      id: h.id,
      propertyId: h.propertyId,
      title: property?.title ?? h.propertyId,
      area: property?.area ?? "Unknown",
      type: property?.type ?? "Unknown",
      currentValue: h.currentValue,
      currentValueFormatted: formatPrice(h.currentValue),
      purchasePrice: h.purchasePrice,
      yield: calcYieldPct(h),
      appreciation: calcAppreciationPct(h),
      occupancy: h.occupancyRate,
    }
  })
  
  return {
    investorId: investor.id,
    investorName: investor.name,
    summary: {
      propertyCount: summary.propertyCount,
      totalPortfolioValue: summary.totalPortfolioValue,
      totalPortfolioValueFormatted: formatPrice(summary.totalPortfolioValue),
      totalMonthlyRental: summary.totalMonthlyRental,
      totalMonthlyRentalFormatted: formatPrice(summary.totalMonthlyRental),
      avgYieldPct: summary.avgYieldPct,
      appreciationPct: summary.appreciationPct,
      occupancyPct: summary.occupancyPct,
    },
    holdings,
    insights: generatePortfolioInsights(summary, holdings),
  }
}

function generatePortfolioInsights(
  summary: ReturnType<typeof getPortfolioSummary>,
  holdings: Array<{ yield: number; appreciation: number; area: string }>
): string[] {
  const insights: string[] = []
  
  if (summary.avgYieldPct >= 7) {
    insights.push(`Strong average yield of ${summary.avgYieldPct.toFixed(1)}%`)
  } else if (summary.avgYieldPct < 5) {
    insights.push(`Below-average yield of ${summary.avgYieldPct.toFixed(1)}% - consider higher-yield opportunities`)
  }
  
  if (summary.appreciationPct >= 5) {
    insights.push(`Excellent appreciation of +${summary.appreciationPct.toFixed(1)}%`)
  }
  
  if (summary.occupancyPct >= 95) {
    insights.push(`Very high occupancy at ${summary.occupancyPct.toFixed(0)}%`)
  } else if (summary.occupancyPct < 80) {
    insights.push(`Low occupancy at ${summary.occupancyPct.toFixed(0)}% - review tenant strategy`)
  }
  
  // Area concentration
  const areaCounts = new Map<string, number>()
  for (const h of holdings) {
    areaCounts.set(h.area, (areaCounts.get(h.area) ?? 0) + 1)
  }
  const topArea = Array.from(areaCounts.entries()).sort((a, b) => b[1] - a[1])[0]
  if (topArea && topArea[1] >= 2) {
    insights.push(`Concentrated in ${topArea[0]} (${topArea[1]} properties)`)
  }
  
  return insights
}

async function executeAnalyzeHolding(
  args: AnalyzeHoldingInput,
  context: ToolExecutionContext
) {
  const { investor, orgId } = context
  
  if (!investor) {
    return { error: "No investor context available" }
  }
  
  const summary = getPortfolioSummary(investor.id)
  const holding = summary.holdings.find(h => h.id === args.holdingId)
  
  if (!holding) {
    return { error: `Holding ${args.holdingId} not found` }
  }
  
  const property = getHoldingProperty(holding)
  const yieldPct = calcYieldPct(holding)
  const appreciationPct = calcAppreciationPct(holding)
  
  // Get market data if requested
  let marketComparison = null
  if (args.includeMarketComparison !== false && property) {
    const externalData = await getExternalDataForProperty({
      property,
      orgId,
      includeNews: false,
    })
    
    marketComparison = {
      assessment: externalData.derived.assessment,
      priceVsMarket: externalData.derived.priceVsMarket,
    }
  }
  
  return {
    holding: {
      id: holding.id,
      propertyId: holding.propertyId,
      title: property?.title ?? holding.propertyId,
      area: property?.area ?? "Unknown",
      type: property?.type ?? "Unknown",
      purchasePrice: holding.purchasePrice,
      purchaseDate: holding.purchaseDate,
      currentValue: holding.currentValue,
      currentValueFormatted: formatPrice(holding.currentValue),
      monthlyRent: holding.monthlyRent,
      occupancyRate: holding.occupancyRate,
    },
    performance: {
      yieldPct,
      yieldFormatted: `${yieldPct.toFixed(2)}%`,
      appreciationPct,
      appreciationFormatted: `${appreciationPct >= 0 ? '+' : ''}${appreciationPct.toFixed(1)}%`,
      totalReturn: appreciationPct + yieldPct,
    },
    marketComparison,
    recommendation: generateHoldingRecommendation(yieldPct, appreciationPct, marketComparison),
  }
}

function generateHoldingRecommendation(
  yieldPct: number,
  appreciationPct: number,
  marketComparison: { assessment: string; priceVsMarket: number | null } | null
): string {
  const parts: string[] = []
  
  if (yieldPct >= 8) {
    parts.push("Strong yield performer - hold for income")
  } else if (yieldPct < 5) {
    parts.push("Below-market yield - consider reviewing rent or exit")
  }
  
  if (appreciationPct >= 10) {
    parts.push("significant capital gains")
  } else if (appreciationPct < 0) {
    parts.push("negative appreciation - monitor market conditions")
  }
  
  if (marketComparison?.assessment === "underpriced") {
    parts.push("Currently underpriced vs market - hold")
  } else if (marketComparison?.assessment === "overpriced") {
    parts.push("Priced above market - good time to consider exit")
  }
  
  return parts.length > 0 ? parts.join(". ") + "." : "Performance in line with expectations."
}

// ============================================
// Market Intelligence Tool Implementations
// ============================================

async function executeGetMarketSignals(
  args: GetMarketSignalsInput,
  context: ToolExecutionContext
) {
  const { orgId } = context
  const supabase = getSupabaseAdminClient()
  const limit = Math.min(args.limit ?? 10, 20)
  
  let query = supabase
    .from("market_signal")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit)
  
  if (args.area) {
    query = query.eq("geo_name", args.area)
  }
  
  if (args.signalType) {
    query = query.eq("type", args.signalType)
  }
  
  if (args.severity) {
    query = query.eq("severity", args.severity)
  }
  
  const { data: signals, error } = await query
  
  if (error) {
    return { error: `Failed to fetch signals: ${error.message}` }
  }
  
  return {
    signalsReturned: signals?.length ?? 0,
    signals: (signals ?? []).map(s => ({
      id: s.id,
      type: s.type,
      severity: s.severity,
      area: s.geo_name,
      segment: s.segment,
      metric: s.metric,
      currentValue: s.current_value,
      previousValue: s.prev_value,
      deltaPct: s.delta_pct ? `${(s.delta_pct * 100).toFixed(1)}%` : null,
      timeframe: s.timeframe,
      source: s.source,
      createdAt: s.created_at,
    })),
    summary: generateSignalsSummary(signals ?? []),
  }
}

function generateSignalsSummary(signals: Array<{ type: string; severity: string; geo_name: string }>): string {
  if (signals.length === 0) {
    return "No market signals detected in the selected period."
  }
  
  const urgentCount = signals.filter(s => s.severity === "urgent").length
  const typeCounts = new Map<string, number>()
  for (const s of signals) {
    typeCounts.set(s.type, (typeCounts.get(s.type) ?? 0) + 1)
  }
  
  const parts = [`${signals.length} signals detected`]
  
  if (urgentCount > 0) {
    parts.push(`${urgentCount} urgent`)
  }
  
  const topTypes = Array.from(typeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([type, count]) => `${count} ${type.replace('_', ' ')}`)
  
  if (topTypes.length > 0) {
    parts.push(topTypes.join(", "))
  }
  
  return parts.join(". ")
}

async function executeCompareAreas(
  args: CompareAreasInput,
  context: ToolExecutionContext
) {
  const { orgId } = context
  const supabase = getSupabaseAdminClient()
  
  // Limit to 5 areas
  const areas = args.areas.slice(0, 5)
  
  if (areas.length < 2) {
    return { error: "Please provide at least 2 areas to compare" }
  }
  
  // Get market data for each area
  const comparisons = await Promise.all(
    areas.map(async (areaName) => {
      // Normalize area name to geo_id
      const geoId = areaName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      
      const { data: snapshots } = await supabase
        .from("market_metric_snapshot")
        .select("*")
        .eq("org_id", orgId)
        .eq("geo_id", geoId)
        .order("window_end", { ascending: false })
        .limit(5)
      
      const pricePsf = snapshots?.find(s => s.metric === "median_price_psf")
      const yieldMetric = snapshots?.find(s => s.metric === "gross_yield")
      
      const { data: portalData } = await supabase
        .from("portal_listing_snapshot")
        .select("*")
        .eq("org_id", orgId)
        .eq("geo_id", geoId)
        .order("as_of_date", { ascending: false })
        .limit(1)
      
      const portal = portalData?.[0]
      
      return {
        area: areaName,
        geoId,
        medianPricePsf: pricePsf?.value ? Math.round(pricePsf.value) : null,
        medianPricePsfFormatted: pricePsf?.value ? `AED ${Math.round(pricePsf.value)}/psf` : "—",
        grossYield: yieldMetric?.value ? (yieldMetric.value * 100).toFixed(1) + "%" : "—",
        sampleSize: pricePsf?.sample_size ?? 0,
        activeListings: portal?.active_listings ?? 0,
        priceCuts: portal?.price_cuts_count ?? 0,
        staleListings: portal?.stale_listings_count ?? 0,
      }
    })
  )
  
  // Generate recommendation
  const withPrices = comparisons.filter(c => c.medianPricePsf !== null)
  const cheapest = withPrices.length > 0 
    ? withPrices.reduce((a, b) => (a.medianPricePsf ?? 0) < (b.medianPricePsf ?? 0) ? a : b)
    : null
  
  const withYields = comparisons.filter(c => c.grossYield !== "—")
  const highestYield = withYields.length > 0
    ? withYields.reduce((a, b) => parseFloat(a.grossYield) > parseFloat(b.grossYield) ? a : b)
    : null
  
  return {
    areasCompared: comparisons.length,
    comparisons,
    insights: {
      lowestPricePsf: cheapest?.area ?? null,
      highestYield: highestYield?.area ?? null,
    },
    recommendation: generateAreaComparisonRecommendation(comparisons, cheapest, highestYield),
  }
}

function generateAreaComparisonRecommendation(
  comparisons: Array<{ area: string; medianPricePsf: number | null; grossYield: string }>,
  cheapest: { area: string } | null,
  highestYield: { area: string; grossYield: string } | null
): string {
  const parts: string[] = []
  
  if (cheapest) {
    parts.push(`${cheapest.area} offers the lowest price per sqft`)
  }
  
  if (highestYield && highestYield.area !== cheapest?.area) {
    parts.push(`${highestYield.area} has the highest yield at ${highestYield.grossYield}`)
  }
  
  return parts.length > 0 ? parts.join(". ") + "." : "Insufficient data to make a recommendation."
}

// ============================================
// VALUATION SENSE-CHECK TOOL IMPLEMENTATIONS
// ============================================

import type {
  CheckValuationInput,
  GetPriceCompsInput,
  DetectPricingAnomaliesInput,
  SuggestOfferRangeInput,
  MatchPropertyToInvestorsInput,
  ScoreMandateFitInput,
  GetInvestorMandatesInput as GetInvestorMandatesInputType,
  FindMandateGapsInput,
  RouteSignalToInvestorsInput,
  AssessPropertyRiskInput,
  AssessPortfolioConcentrationInput,
  GetAreaRiskFactorsInput,
  StressTestDealInput,
  GenerateRiskMitigationsInput,
  GenerateDDChecklistInput,
  VerifyPropertyDataInput,
  GetDDStatusInput,
  FlagDDIssuesInput,
  GenerateSellerQuestionsInput,
  GenerateCMAInput,
  GetComparableSalesInput,
  CalculateAdjustmentsInput,
  GetValuationRangeInput,
  AnalyzeRentalPerformanceInput,
  GetEjariBenchmarksInput,
  SuggestOptimalRentInput,
  AnalyzeFurnishingROIInput,
  PredictVacancyInput,
  AssessChurnRiskInput,
  ForecastPricesInput,
  GetLeadingIndicatorsInput,
  IdentifyEmergingHotspotsInput,
  AnalyzeSupplyPipelineInput,
  RunScenarioAnalysisInput,
} from "./opportunity-tools"

/**
 * Execute tools for new agents
 */
export async function executeNewAgentTool(
  toolName: string,
  args: Record<string, unknown>,
  context: ToolExecutionContext
): Promise<unknown> {
  switch (toolName) {
    // Valuation Sense-Check tools
    case "check_valuation":
      return await executeCheckValuation(args as CheckValuationInput, context)
    case "get_price_comps":
      return await executeGetPriceComps(args as GetPriceCompsInput, context)
    case "detect_pricing_anomalies":
      return await executeDetectPricingAnomalies(args as DetectPricingAnomaliesInput, context)
    case "suggest_offer_range":
      return await executeSuggestOfferRange(args as SuggestOfferRangeInput, context)
    
    // Investor Matching tools
    case "match_property_to_investors":
      return await executeMatchPropertyToInvestors(args as MatchPropertyToInvestorsInput, context)
    case "score_mandate_fit":
      return await executeScoreMandateFit(args as ScoreMandateFitInput, context)
    case "get_investor_mandates":
      return await executeGetInvestorMandates(args as GetInvestorMandatesInputType, context)
    case "find_mandate_gaps":
      return await executeFindMandateGaps(args as FindMandateGapsInput, context)
    case "route_signal_to_investors":
      return await executeRouteSignalToInvestors(args as RouteSignalToInvestorsInput, context)
    
    // Risk Assessment tools
    case "assess_property_risk":
      return await executeAssessPropertyRisk(args as AssessPropertyRiskInput, context)
    case "assess_portfolio_concentration":
      return await executeAssessPortfolioConcentration(args as AssessPortfolioConcentrationInput, context)
    case "get_area_risk_factors":
      return await executeGetAreaRiskFactors(args as GetAreaRiskFactorsInput, context)
    case "stress_test_deal":
      return await executeStressTestDeal(args as StressTestDealInput, context)
    case "generate_risk_mitigations":
      return await executeGenerateRiskMitigations(args as GenerateRiskMitigationsInput, context)
    
    // Due Diligence tools
    case "generate_dd_checklist":
      return await executeGenerateDDChecklist(args as GenerateDDChecklistInput, context)
    case "verify_property_data":
      return await executeVerifyPropertyData(args as VerifyPropertyDataInput, context)
    case "get_dd_status":
      return await executeGetDDStatus(args as GetDDStatusInput, context)
    case "flag_dd_issues":
      return await executeFlagDDIssues(args as FlagDDIssuesInput, context)
    case "generate_seller_questions":
      return await executeGenerateSellerQuestions(args as GenerateSellerQuestionsInput, context)
    
    // CMA Analyst tools
    case "generate_cma":
      return await executeGenerateCMA(args as GenerateCMAInput, context)
    case "get_comparable_sales":
      return await executeGetComparableSales(args as GetComparableSalesInput, context)
    case "calculate_adjustments":
      return await executeCalculateAdjustments(args as CalculateAdjustmentsInput, context)
    case "get_valuation_range":
      return await executeGetValuationRange(args as GetValuationRangeInput, context)
    
    // Rental Optimizer tools
    case "analyze_rental_performance":
      return await executeAnalyzeRentalPerformance(args as AnalyzeRentalPerformanceInput, context)
    case "get_ejari_benchmarks":
      return await executeGetEjariBenchmarks(args as GetEjariBenchmarksInput, context)
    case "suggest_optimal_rent":
      return await executeSuggestOptimalRent(args as SuggestOptimalRentInput, context)
    case "analyze_furnishing_roi":
      return await executeAnalyzeFurnishingROI(args as AnalyzeFurnishingROIInput, context)
    case "predict_vacancy":
      return await executePredictVacancy(args as PredictVacancyInput, context)
    case "assess_churn_risk":
      return await executeAssessChurnRisk(args as AssessChurnRiskInput, context)
    
    // Market Forecaster tools
    case "forecast_prices":
      return await executeForecastPrices(args as ForecastPricesInput, context)
    case "get_leading_indicators":
      return await executeGetLeadingIndicators(args as GetLeadingIndicatorsInput, context)
    case "identify_emerging_hotspots":
      return await executeIdentifyEmergingHotspots(args as IdentifyEmergingHotspotsInput, context)
    case "analyze_supply_pipeline":
      return await executeAnalyzeSupplyPipeline(args as AnalyzeSupplyPipelineInput, context)
    case "run_scenario_analysis":
      return await executeRunScenarioAnalysis(args as RunScenarioAnalysisInput, context)
    case "get_external_factors":
      return await executeGetExternalFactors(context)
    
    default:
      return { error: `Unknown tool: ${toolName}` }
  }
}

// ============================================
// Valuation Sense-Check Implementations
// ============================================

async function executeCheckValuation(
  args: CheckValuationInput,
  context: ToolExecutionContext
) {
  const { orgId } = context
  const supabase = getSupabaseAdminClient()
  
  let property: Property | null = null
  let askingPrice = args.askingPrice
  
  // Get property if ID provided
  if (args.propertyId) {
    const { data } = await supabase
      .from("listings")
      .select("*")
      .eq("id", args.propertyId)
      .maybeSingle()
    
    property = data as Property | null
    if (property && !askingPrice) {
      askingPrice = property.price
    }
  }
  
  if (!property || !askingPrice) {
    return { error: "Property ID or asking price required" }
  }
  
  // Get DLD market data
  const geoId = property.area?.toLowerCase().replace(/[^a-z0-9]+/g, '-') ?? ''
  const { data: dldData } = await supabase
    .from("market_metric_snapshot")
    .select("*")
    .eq("org_id", orgId)
    .eq("geo_id", geoId)
    .eq("metric", "median_price_psf")
    .order("window_end", { ascending: false })
    .limit(1)
  
  const dldMedianPsf = dldData?.[0]?.value ?? null
  const askingPsf = property.size ? Math.round(askingPrice / property.size) : null
  
  // Calculate variance
  let variance = null
  let verdict = "unknown"
  
  if (askingPsf && dldMedianPsf) {
    variance = ((askingPsf - dldMedianPsf) / dldMedianPsf) * 100
    
    if (variance <= -15) {
      verdict = "underpriced"
    } else if (variance <= -5) {
      verdict = "fair_below"
    } else if (variance <= 5) {
      verdict = "fair"
    } else if (variance <= 15) {
      verdict = "fair_above"
    } else {
      verdict = "overpriced"
    }
  }
  
  // Generate offer range
  const suggestedMin = dldMedianPsf && property.size 
    ? Math.round((dldMedianPsf * 0.92) * property.size) 
    : null
  const suggestedMax = dldMedianPsf && property.size 
    ? Math.round((dldMedianPsf * 1.02) * property.size) 
    : null
  
  return {
    property: {
      id: property.id,
      title: property.title,
      area: property.area,
      size: property.size,
    },
    asking: {
      price: askingPrice,
      priceFormatted: formatPrice(askingPrice),
      pricePsf: askingPsf,
      pricePsfFormatted: askingPsf ? `AED ${askingPsf.toLocaleString()}/sqft` : null,
    },
    market: {
      dldMedianPsf,
      dldMedianPsfFormatted: dldMedianPsf ? `AED ${Math.round(dldMedianPsf).toLocaleString()}/sqft` : null,
      sampleSize: dldData?.[0]?.sample_size ?? 0,
      asOf: dldData?.[0]?.window_end ?? null,
    },
    analysis: {
      variancePct: variance !== null ? Math.round(variance * 10) / 10 : null,
      varianceLabel: variance !== null ? `${variance >= 0 ? '+' : ''}${Math.round(variance)}% vs market` : null,
      verdict,
      verdictEmoji: verdict === "underpriced" ? "🟢" : verdict === "overpriced" ? "🔴" : verdict === "fair" ? "🟡" : "⚪",
    },
    suggestedRange: suggestedMin && suggestedMax ? {
      min: suggestedMin,
      max: suggestedMax,
      minFormatted: formatPrice(suggestedMin),
      maxFormatted: formatPrice(suggestedMax),
      confidence: dldData?.[0]?.sample_size >= 10 ? "high" : dldData?.[0]?.sample_size >= 5 ? "medium" : "low",
    } : null,
  }
}

async function executeGetPriceComps(
  args: GetPriceCompsInput,
  context: ToolExecutionContext
) {
  const { orgId } = context
  const supabase = getSupabaseAdminClient()
  const limit = Math.min(args.limit ?? 10, 20)
  
  const geoId = args.area.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  
  // Get recent transactions
  const { data: transactions } = await supabase
    .from("dld_transaction")
    .select("*")
    .eq("org_id", orgId)
    .eq("geo_id", geoId)
    .order("transaction_date", { ascending: false })
    .limit(limit)
  
  const comps = (transactions ?? []).map((t: Record<string, unknown>) => ({
    id: t.id,
    address: t.address ?? t.project_name ?? "Unknown",
    transactionDate: t.transaction_date,
    price: t.price,
    priceFormatted: formatPrice(t.price as number),
    size: t.size_sqft,
    pricePsf: t.size_sqft ? Math.round((t.price as number) / (t.size_sqft as number)) : null,
    bedrooms: t.bedrooms,
    propertyType: t.property_type,
  }))
  
  // Calculate stats
  const prices = comps.filter(c => c.pricePsf).map(c => c.pricePsf as number)
  const medianPsf = prices.length > 0 ? prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)] : null
  const minPsf = prices.length > 0 ? Math.min(...prices) : null
  const maxPsf = prices.length > 0 ? Math.max(...prices) : null
  
  return {
    area: args.area,
    segment: args.segment ?? "All",
    compsFound: comps.length,
    comps,
    statistics: {
      medianPsf,
      medianPsfFormatted: medianPsf ? `AED ${medianPsf.toLocaleString()}/sqft` : null,
      rangePsf: minPsf && maxPsf ? `AED ${minPsf.toLocaleString()} - ${maxPsf.toLocaleString()}/sqft` : null,
      minPsf,
      maxPsf,
    },
  }
}

async function executeDetectPricingAnomalies(
  args: DetectPricingAnomaliesInput,
  context: ToolExecutionContext
) {
  const { orgId } = context
  const supabase = getSupabaseAdminClient()
  
  const { data: property } = await supabase
    .from("listings")
    .select("*")
    .eq("id", args.propertyId)
    .maybeSingle()
  
  if (!property) {
    return { error: "Property not found" }
  }
  
  const prop = property as Property
  const anomalies: Array<{ type: string; severity: string; description: string }> = []
  
  // Check for common anomalies
  const pricePsf = prop.size ? Math.round(prop.price / prop.size) : null
  
  // Unusually low price per sqft
  if (pricePsf && pricePsf < 500) {
    anomalies.push({
      type: "low_psf",
      severity: "high",
      description: `Price per sqft (AED ${pricePsf}) is unusually low - verify size is correct`,
    })
  }
  
  // Unusually high price per sqft
  if (pricePsf && pricePsf > 10000) {
    anomalies.push({
      type: "high_psf",
      severity: "medium",
      description: `Price per sqft (AED ${pricePsf}) is very high - verify property details`,
    })
  }
  
  // Size doesn't match bedroom count
  const expectedMinSize: Record<number, number> = { 0: 300, 1: 500, 2: 800, 3: 1200, 4: 1800, 5: 2500 }
  const minSize = expectedMinSize[prop.bedrooms ?? 0] ?? 300
  if (prop.size && prop.size < minSize * 0.6) {
    anomalies.push({
      type: "size_mismatch",
      severity: "medium",
      description: `Size (${prop.size} sqft) seems small for ${prop.bedrooms ?? 0}BR - verify`,
    })
  }
  
  // Price ends in unusual digits (potential data entry error)
  const priceStr = prop.price.toString()
  if (priceStr.length > 6 && priceStr.slice(-5) === "00000") {
    anomalies.push({
      type: "round_price",
      severity: "info",
      description: "Price is a round number - may be asking price vs actual",
    })
  }
  
  return {
    propertyId: args.propertyId,
    title: prop.title,
    anomaliesFound: anomalies.length,
    anomalies,
    overallRisk: anomalies.some(a => a.severity === "high") ? "high" 
      : anomalies.some(a => a.severity === "medium") ? "medium" 
      : "low",
  }
}

async function executeSuggestOfferRange(
  args: SuggestOfferRangeInput,
  context: ToolExecutionContext
) {
  // Get valuation first
  const valuation = await executeCheckValuation({ propertyId: args.propertyId }, context)
  
  if ('error' in valuation) {
    return valuation
  }
  
  const val = valuation as {
    property: { title: string }
    asking: { price: number }
    market: { dldMedianPsf: number | null }
    analysis: { verdict: string }
    suggestedRange: { min: number; max: number; confidence: string } | null
  }
  
  const riskTolerance = args.investorRiskTolerance ?? "medium"
  
  // Adjust range based on risk tolerance
  let discountPct = 0.05 // 5% default
  if (riskTolerance === "high") {
    discountPct = 0.10 // Aggressive 10% discount ask
  } else if (riskTolerance === "low") {
    discountPct = 0.02 // Conservative 2% discount
  }
  
  const askingPrice = val.asking.price
  const suggestedOffer = Math.round(askingPrice * (1 - discountPct))
  const walkAwayPrice = Math.round(askingPrice * 1.02) // 2% above asking max
  
  return {
    property: val.property.title,
    askingPrice: askingPrice,
    askingPriceFormatted: formatPrice(askingPrice),
    riskTolerance,
    recommendation: {
      openingOffer: suggestedOffer,
      openingOfferFormatted: formatPrice(suggestedOffer),
      openingDiscountPct: Math.round(discountPct * 100),
      targetPrice: Math.round(askingPrice * (1 - discountPct / 2)),
      targetPriceFormatted: formatPrice(Math.round(askingPrice * (1 - discountPct / 2))),
      walkAwayAbove: walkAwayPrice,
      walkAwayAboveFormatted: formatPrice(walkAwayPrice),
    },
    marketContext: val.analysis.verdict,
    confidence: val.suggestedRange?.confidence ?? "low",
    negotiationTips: [
      val.analysis.verdict === "overpriced" 
        ? "Property is above market - strong negotiating position"
        : val.analysis.verdict === "underpriced"
        ? "Property is below market - may face competition"
        : "Property is at fair value - standard negotiation room",
    ],
  }
}

// ============================================
// Investor Matching Implementations
// ============================================

async function executeMatchPropertyToInvestors(
  args: MatchPropertyToInvestorsInput,
  context: ToolExecutionContext
) {
  const { orgId } = context
  const supabase = getSupabaseAdminClient()
  const limit = Math.min(args.limit ?? 5, 10)
  
  // Get property
  const { data: property } = await supabase
    .from("listings")
    .select("*")
    .eq("id", args.propertyId)
    .maybeSingle()
  
  if (!property) {
    return { error: "Property not found" }
  }
  
  const prop = property as Property
  
  // Get all active investors
  const { data: investors } = await supabase
    .from("investors")
    .select("*")
    .eq("org_id", orgId)
    .eq("status", "active")
  
  if (!investors?.length) {
    return { error: "No active investors found" }
  }
  
  // Score each investor
  const scored = (investors as Investor[]).map(investor => {
    let score = 0
    const reasons: string[] = []
    const concerns: string[] = []
    
    const mandate = investor.mandate
    if (!mandate) {
      return { investor, score: 0, reasons: ["No mandate defined"], concerns: [] }
    }
    
    // Budget fit (30 points)
    if (mandate.minInvestment && mandate.maxInvestment) {
      if (prop.price >= mandate.minInvestment && prop.price <= mandate.maxInvestment) {
        score += 30
        reasons.push("Within budget range")
      } else if (prop.price < mandate.minInvestment) {
        score += 10
        concerns.push("Below minimum investment threshold")
      } else {
        concerns.push("Exceeds maximum budget")
      }
    }
    
    // Area match (25 points)
    if (mandate.preferredAreas?.length) {
      const areaMatch = mandate.preferredAreas.some(a => 
        prop.area?.toLowerCase().includes(a.toLowerCase()) ||
        a.toLowerCase().includes(prop.area?.toLowerCase() ?? '')
      )
      if (areaMatch) {
        score += 25
        reasons.push(`Matches preferred area: ${prop.area}`)
      }
    }
    
    // Property type (15 points)
    if (mandate.propertyTypes?.length) {
      const typeMatch = mandate.propertyTypes.some(t => 
        prop.type?.toLowerCase().includes(t.toLowerCase())
      )
      if (typeMatch) {
        score += 15
        reasons.push("Matches property type preference")
      }
    }
    
    // Yield target (20 points)
    if (mandate.yieldTarget && prop.roi) {
      const targetYield = parseFloat(mandate.yieldTarget.replace(/[^0-9.]/g, ''))
      if (prop.roi >= targetYield) {
        score += 20
        reasons.push(`Meets yield target (${prop.roi}% >= ${targetYield}%)`)
      } else if (prop.roi >= targetYield * 0.8) {
        score += 10
        concerns.push(`Yield slightly below target (${prop.roi}% vs ${targetYield}%)`)
      }
    }
    
    // Risk tolerance (10 points)
    if (mandate.riskTolerance) {
      score += 10 // Default points for having risk preference defined
    }
    
    return { investor, score, reasons, concerns }
  })
  
  // Sort and return top matches
  const topMatches = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
  
  return {
    property: {
      id: prop.id,
      title: prop.title,
      area: prop.area,
      price: prop.price,
      priceFormatted: formatPrice(prop.price),
    },
    matchesFound: topMatches.length,
    matches: topMatches.map((m, idx) => ({
      rank: idx + 1,
      investorId: m.investor.id,
      investorName: m.investor.name,
      company: m.investor.company,
      score: m.score,
      scoreLabel: m.score >= 80 ? "Excellent" : m.score >= 60 ? "Good" : m.score >= 40 ? "Fair" : "Weak",
      reasons: m.reasons,
      concerns: m.concerns,
    })),
    recommendation: topMatches.length > 0 && topMatches[0].score >= 60
      ? `Recommend routing to ${topMatches[0].investor.name} (${topMatches[0].score}/100 fit)`
      : "No strong matches found - consider adjusting property or expanding investor base",
  }
}

async function executeScoreMandateFit(
  args: ScoreMandateFitInput,
  context: ToolExecutionContext
) {
  const { orgId } = context
  const supabase = getSupabaseAdminClient()
  
  // Get both entities
  const [{ data: investor }, { data: property }] = await Promise.all([
    supabase.from("investors").select("*").eq("id", args.investorId).maybeSingle(),
    supabase.from("listings").select("*").eq("id", args.propertyId).maybeSingle(),
  ])
  
  if (!investor || !property) {
    return { error: "Investor or property not found" }
  }
  
  const inv = investor as Investor
  const prop = property as Property
  const mandate = inv.mandate
  
  // Detailed scoring breakdown
  const scores = {
    budget: { score: 0, max: 25, details: "" },
    location: { score: 0, max: 25, details: "" },
    type: { score: 0, max: 15, details: "" },
    yield: { score: 0, max: 20, details: "" },
    risk: { score: 0, max: 15, details: "" },
  }
  
  if (mandate) {
    // Budget
    if (mandate.minInvestment && mandate.maxInvestment) {
      if (prop.price >= mandate.minInvestment && prop.price <= mandate.maxInvestment) {
        scores.budget.score = 25
        scores.budget.details = "Perfect budget fit"
      } else if (prop.price >= mandate.minInvestment * 0.8 && prop.price <= mandate.maxInvestment * 1.2) {
        scores.budget.score = 15
        scores.budget.details = "Slightly outside budget"
      } else {
        scores.budget.details = "Outside budget range"
      }
    }
    
    // Location
    if (mandate.preferredAreas?.some(a => prop.area?.toLowerCase().includes(a.toLowerCase()))) {
      scores.location.score = 25
      scores.location.details = "Primary target area"
    }
    
    // Type
    if (mandate.propertyTypes?.some(t => prop.type?.toLowerCase().includes(t.toLowerCase()))) {
      scores.type.score = 15
      scores.type.details = "Matches type preference"
    }
    
    // Yield
    if (mandate.yieldTarget && prop.roi) {
      const target = parseFloat(mandate.yieldTarget.replace(/[^0-9.]/g, ''))
      if (prop.roi >= target) {
        scores.yield.score = 20
        scores.yield.details = `Exceeds ${target}% target`
      } else if (prop.roi >= target * 0.9) {
        scores.yield.score = 15
        scores.yield.details = `Close to ${target}% target`
      }
    }
    
    // Risk
    scores.risk.score = 10 // Default
    scores.risk.details = "Risk profile acceptable"
  }
  
  const totalScore = Object.values(scores).reduce((sum, s) => sum + s.score, 0)
  const maxScore = Object.values(scores).reduce((sum, s) => sum + s.max, 0)
  
  return {
    investor: { id: inv.id, name: inv.name },
    property: { id: prop.id, title: prop.title },
    overallScore: totalScore,
    maxScore,
    scoreBreakdown: scores,
    recommendation: totalScore >= 80 ? "Strong fit - prioritize" 
      : totalScore >= 60 ? "Good fit - consider"
      : totalScore >= 40 ? "Partial fit - discuss with investor"
      : "Weak fit - likely not suitable",
  }
}

async function executeGetInvestorMandates(
  args: GetInvestorMandatesInputType,
  context: ToolExecutionContext
) {
  const { orgId } = context
  const supabase = getSupabaseAdminClient()
  
  let query = supabase
    .from("investors")
    .select("*")
    .eq("org_id", orgId)
    .eq("status", "active")
  
  if (args.segment) {
    query = query.eq("segment", args.segment)
  }
  
  const { data: investors } = await query
  
  let filtered = (investors ?? []) as Investor[]
  
  // Apply filters
  if (args.minBudget) {
    filtered = filtered.filter(i => 
      i.mandate?.maxInvestment && i.mandate.maxInvestment >= args.minBudget!
    )
  }
  
  if (args.areas?.length) {
    filtered = filtered.filter(i => 
      i.mandate?.preferredAreas?.some(a => 
        args.areas!.some(target => a.toLowerCase().includes(target.toLowerCase()))
      )
    )
  }
  
  return {
    investorsFound: filtered.length,
    mandates: filtered.map(i => ({
      investorId: i.id,
      investorName: i.name,
      company: i.company,
      segment: i.segment,
      mandate: i.mandate ? {
        strategy: i.mandate.strategy,
        budgetRange: i.mandate.minInvestment && i.mandate.maxInvestment
          ? `AED ${formatPrice(i.mandate.minInvestment)} - ${formatPrice(i.mandate.maxInvestment)}`
          : null,
        preferredAreas: i.mandate.preferredAreas,
        propertyTypes: i.mandate.propertyTypes,
        yieldTarget: i.mandate.yieldTarget,
        riskTolerance: i.mandate.riskTolerance,
      } : null,
    })),
  }
}

async function executeFindMandateGaps(
  args: FindMandateGapsInput,
  context: ToolExecutionContext
) {
  const { orgId } = context
  const supabase = getSupabaseAdminClient()
  
  // Get mandates
  let investorQuery = supabase
    .from("investors")
    .select("*")
    .eq("org_id", orgId)
    .eq("status", "active")
  
  if (args.investorId) {
    investorQuery = investorQuery.eq("id", args.investorId)
  }
  
  const { data: investors } = await investorQuery
  
  // Get available properties
  const { data: properties } = await supabase
    .from("listings")
    .select("*")
    .eq("org_id", orgId)
    .eq("status", "available")
  
  const props = (properties ?? []) as Property[]
  const invs = (investors ?? []) as Investor[]
  
  // Analyze gaps
  const gaps: Array<{ type: string; details: string; affectedInvestors: string[] }> = []
  
  // Check for unmet area preferences
  const wantedAreas = new Set<string>()
  const availableAreas = new Set(props.map(p => p.area?.toLowerCase()).filter(Boolean))
  
  for (const inv of invs) {
    for (const area of inv.mandate?.preferredAreas ?? []) {
      const normalized = area.toLowerCase()
      if (!availableAreas.has(normalized)) {
        wantedAreas.add(area)
      }
    }
  }
  
  if (wantedAreas.size > 0) {
    gaps.push({
      type: "area_gap",
      details: `No properties in: ${Array.from(wantedAreas).slice(0, 5).join(", ")}`,
      affectedInvestors: invs
        .filter(i => i.mandate?.preferredAreas?.some(a => wantedAreas.has(a)))
        .map(i => i.name)
        .slice(0, 5),
    })
  }
  
  // Check for yield gaps
  const highYieldInvestors = invs.filter(i => {
    const target = parseFloat(i.mandate?.yieldTarget?.replace(/[^0-9.]/g, '') ?? '0')
    return target >= 8
  })
  
  const highYieldProps = props.filter(p => (p.roi ?? 0) >= 8)
  
  if (highYieldInvestors.length > 0 && highYieldProps.length < highYieldInvestors.length) {
    gaps.push({
      type: "yield_gap",
      details: `${highYieldInvestors.length} investors want 8%+ yield, only ${highYieldProps.length} properties available`,
      affectedInvestors: highYieldInvestors.map(i => i.name).slice(0, 5),
    })
  }
  
  return {
    gapsIdentified: gaps.length,
    gaps,
    recommendation: gaps.length > 0 
      ? "Consider sourcing properties in underserved areas or yield brackets"
      : "Current inventory covers active mandates well",
  }
}

async function executeRouteSignalToInvestors(
  args: RouteSignalToInvestorsInput,
  context: ToolExecutionContext
) {
  const { orgId } = context
  const supabase = getSupabaseAdminClient()
  
  // Get signal
  const { data: signal } = await supabase
    .from("market_signal")
    .select("*")
    .eq("id", args.signalId)
    .maybeSingle()
  
  if (!signal) {
    return { error: "Signal not found" }
  }
  
  // Get investors with matching areas in mandate
  const { data: investors } = await supabase
    .from("investors")
    .select("*")
    .eq("org_id", orgId)
    .eq("status", "active")
  
  const signalArea = (signal.geo_name as string)?.toLowerCase() ?? ''
  
  const relevant = (investors as Investor[] ?? []).filter(inv => {
    // Check if investor has holdings or mandate in this area
    const mandateAreas = inv.mandate?.preferredAreas?.map(a => a.toLowerCase()) ?? []
    return mandateAreas.some(a => a.includes(signalArea) || signalArea.includes(a))
  })
  
  return {
    signal: {
      id: signal.id,
      type: signal.type,
      area: signal.geo_name,
      severity: signal.severity,
    },
    routeTo: relevant.map(inv => ({
      investorId: inv.id,
      investorName: inv.name,
      relevance: inv.mandate?.preferredAreas?.some(a => 
        a.toLowerCase() === signalArea
      ) ? "direct" : "related",
    })),
    totalToNotify: relevant.length,
  }
}

// ============================================
// Risk Assessment Implementations
// ============================================

async function executeAssessPropertyRisk(
  args: AssessPropertyRiskInput,
  context: ToolExecutionContext
) {
  const { orgId } = context
  const supabase = getSupabaseAdminClient()
  
  const { data: property } = await supabase
    .from("listings")
    .select("*")
    .eq("id", args.propertyId)
    .maybeSingle()
  
  if (!property) {
    return { error: "Property not found" }
  }
  
  const prop = property as Property
  
  // Assess various risk factors
  const risks: Array<{
    factor: string
    category: string
    severity: number
    likelihood: number
    score: number
    mitigation: string
  }> = []
  
  // Pricing risk
  const pricePsf = prop.size ? prop.price / prop.size : 0
  if (pricePsf > 3000) {
    risks.push({
      factor: "Premium pricing",
      category: "Market",
      severity: 3,
      likelihood: 3,
      score: 9,
      mitigation: "Negotiate harder, ensure comparable support",
    })
  }
  
  // Vacancy risk
  if ((prop.roi ?? 0) > 10) {
    risks.push({
      factor: "High yield may indicate vacancy risk",
      category: "Tenant",
      severity: 3,
      likelihood: 2,
      score: 6,
      mitigation: "Verify current tenancy status and history",
    })
  }
  
  // Trust score risk
  if ((prop.trustScore ?? 100) < 70) {
    risks.push({
      factor: "Low trust score",
      category: "Verification",
      severity: 4,
      likelihood: 3,
      score: 12,
      mitigation: "Complete full due diligence before proceeding",
    })
  }
  
  // Off-plan risk (if applicable) - check for signs of off-plan property
  // Off-plan properties often have paymentPlan or no yearBuilt
  const isLikelyOffPlan = prop.paymentPlan || (prop.yearBuilt && prop.yearBuilt > new Date().getFullYear())
  if (isLikelyOffPlan) {
    risks.push({
      factor: "Off-plan completion risk",
      category: "Completion",
      severity: 4,
      likelihood: 2,
      score: 8,
      mitigation: "Verify developer track record and escrow",
    })
  }
  
  const overallScore = risks.reduce((sum, r) => sum + r.score, 0)
  
  return {
    property: {
      id: prop.id,
      title: prop.title,
      area: prop.area,
    },
    overallRiskScore: overallScore,
    overallRating: overallScore <= 10 ? "Low" : overallScore <= 25 ? "Medium" : overallScore <= 40 ? "High" : "Very High",
    riskFactors: risks,
    summary: `${risks.length} risk factors identified with total score of ${overallScore}`,
  }
}

async function executeAssessPortfolioConcentration(
  args: AssessPortfolioConcentrationInput,
  context: ToolExecutionContext
) {
  const { investor } = context
  
  if (!investor) {
    return { error: "No investor context" }
  }
  
  const summary = getPortfolioSummary(args.investorId)
  
  // Analyze concentration
  const areaConcentration = new Map<string, number>()
  const typeConcentration = new Map<string, number>()
  
  for (const h of summary.holdings) {
    const property = getHoldingProperty(h)
    if (property?.area) {
      const current = areaConcentration.get(property.area) ?? 0
      areaConcentration.set(property.area, current + h.currentValue)
    }
    if (property?.type) {
      const current = typeConcentration.get(property.type) ?? 0
      typeConcentration.set(property.type, current + h.currentValue)
    }
  }
  
  // Calculate concentration percentages
  const totalValue = summary.totalPortfolioValue
  const areaBreakdown = Array.from(areaConcentration.entries())
    .map(([area, value]) => ({
      area,
      value,
      percentage: Math.round((value / totalValue) * 100),
    }))
    .sort((a, b) => b.percentage - a.percentage)
  
  const typeBreakdown = Array.from(typeConcentration.entries())
    .map(([type, value]) => ({
      type,
      value,
      percentage: Math.round((value / totalValue) * 100),
    }))
    .sort((a, b) => b.percentage - a.percentage)
  
  // Flag concentration risks
  const concentrationRisks: string[] = []
  
  const topArea = areaBreakdown[0]
  if (topArea && topArea.percentage > 50) {
    concentrationRisks.push(`${topArea.percentage}% concentrated in ${topArea.area}`)
  }
  
  const topType = typeBreakdown[0]
  if (topType && topType.percentage > 70) {
    concentrationRisks.push(`${topType.percentage}% in ${topType.type} properties`)
  }
  
  return {
    investorId: args.investorId,
    totalValue: summary.totalPortfolioValue,
    propertyCount: summary.propertyCount,
    concentration: {
      byArea: areaBreakdown,
      byType: typeBreakdown,
    },
    risks: concentrationRisks,
    diversificationScore: concentrationRisks.length === 0 ? "Good" 
      : concentrationRisks.length === 1 ? "Fair" 
      : "Poor",
    recommendation: concentrationRisks.length > 0 
      ? "Consider diversifying into other areas or property types"
      : "Portfolio is well diversified",
  }
}

async function executeGetAreaRiskFactors(
  args: GetAreaRiskFactorsInput,
  context: ToolExecutionContext
) {
  const { orgId } = context
  const supabase = getSupabaseAdminClient()
  
  const geoId = args.area.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  
  // Get supply data
  const { data: portalData } = await supabase
    .from("portal_listing_snapshot")
    .select("*")
    .eq("org_id", orgId)
    .eq("geo_id", geoId)
    .order("as_of_date", { ascending: false })
    .limit(1)
  
  // Get recent signals
  const { data: signals } = await supabase
    .from("market_signal")
    .select("*")
    .eq("org_id", orgId)
    .eq("geo_id", geoId)
    .order("created_at", { ascending: false })
    .limit(5)
  
  const riskFactors: Array<{ factor: string; level: string; details: string }> = []
  
  const portal = portalData?.[0]
  if (portal) {
    // High supply risk
    if ((portal.active_listings as number) > 500) {
      riskFactors.push({
        factor: "High supply",
        level: "Medium",
        details: `${portal.active_listings} active listings may pressure prices`,
      })
    }
    
    // Price cutting
    const priceCutRate = portal.active_listings 
      ? (portal.price_cuts_count as number) / (portal.active_listings as number) * 100 
      : 0
    if (priceCutRate > 20) {
      riskFactors.push({
        factor: "Seller stress",
        level: "High",
        details: `${Math.round(priceCutRate)}% of listings have cut prices`,
      })
    }
  }
  
  // Check for negative signals
  const negativeSignals = (signals ?? []).filter(s => 
    s.type === "price_decline" || s.severity === "urgent"
  )
  
  if (negativeSignals.length > 0) {
    riskFactors.push({
      factor: "Recent negative signals",
      level: "Medium",
      details: `${negativeSignals.length} concerning market signals detected`,
    })
  }
  
  return {
    area: args.area,
    segment: args.segment ?? "All",
    riskFactors,
    overallRiskLevel: riskFactors.some(r => r.level === "High") ? "High"
      : riskFactors.some(r => r.level === "Medium") ? "Medium"
      : "Low",
    dataFreshness: portal?.as_of_date ?? "Unknown",
  }
}

async function executeStressTestDeal(
  args: StressTestDealInput,
  context: ToolExecutionContext
) {
  const { orgId } = context
  const supabase = getSupabaseAdminClient()
  
  const { data: property } = await supabase
    .from("listings")
    .select("*")
    .eq("id", args.propertyId)
    .maybeSingle()
  
  if (!property) {
    return { error: "Property not found" }
  }
  
  const prop = property as Property
  const scenarios = args.scenarios ?? ["vacancy_spike", "rent_decline", "price_correction"]
  
  const results: Array<{
    scenario: string
    assumption: string
    impactOnYield: string
    impactOnValue: string
    breakEvenPoint: string
  }> = []
  
  const baseYield = prop.roi ?? 6
  const baseValue = prop.price
  
  for (const scenario of scenarios) {
    switch (scenario) {
      case "vacancy_spike":
        results.push({
          scenario: "Vacancy Spike",
          assumption: "3 months vacancy (25% occupancy loss)",
          impactOnYield: `${(baseYield * 0.75).toFixed(1)}% (was ${baseYield}%)`,
          impactOnValue: "Minimal short-term impact",
          breakEvenPoint: "6 months to recover if re-leased",
        })
        break
      case "rent_decline":
        results.push({
          scenario: "Rent Decline",
          assumption: "15% rent reduction on renewal",
          impactOnYield: `${(baseYield * 0.85).toFixed(1)}% (was ${baseYield}%)`,
          impactOnValue: `Value may decline ~10% if cap rates hold`,
          breakEvenPoint: "Market recovery or tenant upgrade",
        })
        break
      case "price_correction":
        results.push({
          scenario: "Market Correction",
          assumption: "20% price decline",
          impactOnYield: `${(baseYield * 1.25).toFixed(1)}% (yield increases on lower basis)`,
          impactOnValue: formatPrice(Math.round(baseValue * 0.8)),
          breakEvenPoint: "Hold for 3-5 years for recovery",
        })
        break
      case "rate_increase":
        results.push({
          scenario: "Interest Rate Rise",
          assumption: "+200bps mortgage rate increase",
          impactOnYield: "Cash flow reduced if leveraged",
          impactOnValue: "Cap rates may expand, reducing value 5-10%",
          breakEvenPoint: "Refinance when rates normalize",
        })
        break
    }
  }
  
  return {
    property: {
      id: prop.id,
      title: prop.title,
      price: formatPrice(prop.price),
      currentYield: `${baseYield}%`,
    },
    stressTests: results,
    worstCase: "Combined adverse scenarios could reduce value 20-30% and yield 40%",
    recommendation: "Maintain adequate reserves and avoid over-leveraging",
  }
}

async function executeGenerateRiskMitigations(
  args: GenerateRiskMitigationsInput,
  context: ToolExecutionContext
) {
  // Get risk assessment first
  const riskAssessment = await executeAssessPropertyRisk(
    { propertyId: args.propertyId },
    context
  )
  
  if ('error' in riskAssessment) {
    return riskAssessment
  }
  
  const assessment = riskAssessment as {
    property: { title: string }
    riskFactors: Array<{ factor: string; mitigation: string }>
  }
  
  // Generate detailed mitigations
  const mitigations = assessment.riskFactors.map(risk => ({
    risk: risk.factor,
    mitigation: risk.mitigation,
    implementation: getImplementationSteps(risk.factor),
    cost: getEstimatedCost(risk.factor),
    timeline: getTimeline(risk.factor),
  }))
  
  return {
    property: assessment.property.title,
    mitigations,
    prioritizedActions: mitigations
      .slice(0, 3)
      .map((m, i) => `${i + 1}. ${m.mitigation}`),
  }
}

function getImplementationSteps(riskFactor: string): string[] {
  const stepMap: Record<string, string[]> = {
    "Premium pricing": [
      "Obtain 3-5 comparable sales",
      "Commission independent valuation",
      "Negotiate based on evidence",
    ],
    "Low trust score": [
      "Request full document pack",
      "Verify with DLD directly",
      "Conduct site inspection",
    ],
    "Off-plan completion risk": [
      "Check developer RERA registration",
      "Verify escrow account status",
      "Review construction progress",
    ],
  }
  return stepMap[riskFactor] ?? ["Consult with advisor", "Complete due diligence"]
}

function getEstimatedCost(riskFactor: string): string {
  if (riskFactor.includes("valuation")) return "AED 2,000-5,000"
  if (riskFactor.includes("inspection")) return "AED 1,000-2,000"
  return "Minimal/Internal"
}

function getTimeline(riskFactor: string): string {
  if (riskFactor.includes("valuation")) return "3-5 business days"
  if (riskFactor.includes("legal")) return "1-2 weeks"
  return "1-3 business days"
}

// ============================================
// Due Diligence Implementations
// ============================================

async function executeGenerateDDChecklist(
  args: GenerateDDChecklistInput,
  context: ToolExecutionContext
) {
  const { orgId } = context
  const supabase = getSupabaseAdminClient()
  
  const { data: property } = await supabase
    .from("listings")
    .select("*")
    .eq("id", args.propertyId)
    .maybeSingle()
  
  if (!property) {
    return { error: "Property not found" }
  }
  
  const prop = property as Property
  const dealType = args.dealType ?? "ready"
  const complexity = args.complexity ?? "standard"
  
  // Generate checklist based on deal type
  const checklist: Array<{
    id: string
    item: string
    category: string
    priority: string
    status: string
    estimatedDays: number
  }> = []
  
  // Legal items (always required)
  checklist.push(
    { id: "dd-1", item: "Title deed verification", category: "Legal", priority: "Critical", status: "pending", estimatedDays: 2 },
    { id: "dd-2", item: "Encumbrance check (mortgages/liens)", category: "Legal", priority: "Critical", status: "pending", estimatedDays: 2 },
    { id: "dd-3", item: "Seller identity verification", category: "Legal", priority: "High", status: "pending", estimatedDays: 1 },
  )
  
  // Financial items
  checklist.push(
    { id: "dd-4", item: "Price validation vs market", category: "Financial", priority: "High", status: "pending", estimatedDays: 1 },
    { id: "dd-5", item: "Service charge verification", category: "Financial", priority: "Medium", status: "pending", estimatedDays: 1 },
    { id: "dd-6", item: "Outstanding bills check", category: "Financial", priority: "Medium", status: "pending", estimatedDays: 1 },
  )
  
  // Physical inspection
  checklist.push(
    { id: "dd-7", item: "Property inspection", category: "Physical", priority: "High", status: "pending", estimatedDays: 1 },
    { id: "dd-8", item: "Condition assessment", category: "Physical", priority: "Medium", status: "pending", estimatedDays: 1 },
  )
  
  // Off-plan specific
  if (dealType === "off_plan") {
    checklist.push(
      { id: "dd-9", item: "Developer RERA registration", category: "Developer", priority: "Critical", status: "pending", estimatedDays: 1 },
      { id: "dd-10", item: "Escrow account verification", category: "Developer", priority: "Critical", status: "pending", estimatedDays: 2 },
      { id: "dd-11", item: "Construction progress check", category: "Developer", priority: "High", status: "pending", estimatedDays: 1 },
      { id: "dd-12", item: "Payment plan review", category: "Financial", priority: "High", status: "pending", estimatedDays: 1 },
    )
  }
  
  // High-value additional
  if (complexity === "high_value" || complexity === "complex") {
    checklist.push(
      { id: "dd-13", item: "Independent valuation", category: "Financial", priority: "High", status: "pending", estimatedDays: 5 },
      { id: "dd-14", item: "Legal contract review", category: "Legal", priority: "High", status: "pending", estimatedDays: 3 },
    )
  }
  
  const totalDays = checklist.reduce((sum, item) => sum + item.estimatedDays, 0)
  
  return {
    property: {
      id: prop.id,
      title: prop.title,
      type: prop.type,
    },
    dealProfile: {
      type: dealType,
      complexity,
      estimatedDaysTotal: totalDays,
    },
    checklist,
    summary: {
      total: checklist.length,
      critical: checklist.filter(c => c.priority === "Critical").length,
      high: checklist.filter(c => c.priority === "High").length,
    },
  }
}

async function executeVerifyPropertyData(
  args: VerifyPropertyDataInput,
  context: ToolExecutionContext
) {
  const { orgId } = context
  const supabase = getSupabaseAdminClient()
  
  const { data: property } = await supabase
    .from("listings")
    .select("*")
    .eq("id", args.propertyId)
    .maybeSingle()
  
  if (!property) {
    return { error: "Property not found" }
  }
  
  const prop = property as Property
  
  // Get DLD data for comparison
  const geoId = prop.area?.toLowerCase().replace(/[^a-z0-9]+/g, '-') ?? ''
  
  const { data: dldData } = await supabase
    .from("market_metric_snapshot")
    .select("*")
    .eq("org_id", orgId)
    .eq("geo_id", geoId)
    .order("window_end", { ascending: false })
    .limit(5)
  
  const verificationResults: Array<{
    field: string
    listed: string
    verified: string
    status: string
    notes: string
  }> = []
  
  // Verify price reasonableness
  const dldPsf = dldData?.find(d => d.metric === "median_price_psf")
  if (dldPsf && prop.size) {
    const listedPsf = Math.round(prop.price / prop.size)
    const variance = Math.abs((listedPsf - dldPsf.value) / dldPsf.value * 100)
    verificationResults.push({
      field: "Price per sqft",
      listed: `AED ${listedPsf.toLocaleString()}`,
      verified: `AED ${Math.round(dldPsf.value).toLocaleString()} (DLD median)`,
      status: variance < 20 ? "verified" : variance < 40 ? "review" : "flagged",
      notes: `${Math.round(variance)}% variance from DLD median`,
    })
  }
  
  // Verify trust score
  verificationResults.push({
    field: "Trust score",
    listed: `${prop.trustScore ?? "N/A"}`,
    verified: prop.trustScore && prop.trustScore >= 70 ? "Acceptable" : "Needs review",
    status: (prop.trustScore ?? 0) >= 70 ? "verified" : "flagged",
    notes: prop.trustScore ? "" : "Trust score not calculated",
  })
  
  return {
    property: {
      id: prop.id,
      title: prop.title,
    },
    verificationResults,
    overallStatus: verificationResults.some(r => r.status === "flagged") ? "Issues found"
      : verificationResults.some(r => r.status === "review") ? "Review needed"
      : "Verified",
    recommendation: verificationResults.some(r => r.status === "flagged")
      ? "Complete additional verification before proceeding"
      : "Data appears consistent with market",
  }
}

async function executeGetDDStatus(
  args: GetDDStatusInput,
  context: ToolExecutionContext
) {
  // This would integrate with a deal room DD tracking system
  // For now, return a mock structure
  return {
    dealRoomId: args.dealRoomId,
    status: "in_progress",
    progress: {
      total: 12,
      completed: 5,
      inProgress: 3,
      pending: 4,
      blocked: 0,
    },
    completionPercentage: 42,
    estimatedDaysRemaining: 7,
    criticalPending: [
      "Title deed verification",
      "Encumbrance check",
    ],
    nextActions: [
      "Follow up on title deed request",
      "Schedule property inspection",
    ],
  }
}

async function executeFlagDDIssues(
  args: FlagDDIssuesInput,
  context: ToolExecutionContext
) {
  // This would analyze completed DD items for issues
  return {
    dealRoomId: args.dealRoomId,
    issuesFound: 2,
    issues: [
      {
        severity: "high",
        item: "Service charge history",
        finding: "Significant increase (35%) in last 2 years",
        recommendation: "Factor into yield calculations and negotiate",
      },
      {
        severity: "medium",
        item: "Title deed",
        finding: "Minor administrative discrepancy in size",
        recommendation: "Request correction before transfer",
      },
    ],
    dealBreakers: [],
    overallAssessment: "Proceed with caution - issues are manageable",
  }
}

async function executeGenerateSellerQuestions(
  args: GenerateSellerQuestionsInput,
  context: ToolExecutionContext
) {
  const { orgId } = context
  const supabase = getSupabaseAdminClient()
  
  const { data: property } = await supabase
    .from("listings")
    .select("*")
    .eq("id", args.propertyId)
    .maybeSingle()
  
  if (!property) {
    return { error: "Property not found" }
  }
  
  const prop = property as Property
  const focusAreas = args.focusAreas ?? ["pricing", "condition", "tenancy", "history"]
  
  const questions: Array<{ category: string; question: string; why: string }> = []
  
  if (focusAreas.includes("pricing")) {
    questions.push(
      { category: "Pricing", question: "What is the reason for selling at this time?", why: "Understand motivation and negotiation room" },
      { category: "Pricing", question: "How long has the property been on the market?", why: "Gauge seller urgency" },
    )
  }
  
  if (focusAreas.includes("condition")) {
    questions.push(
      { category: "Condition", question: "When was the last major renovation or maintenance?", why: "Assess capex needs" },
      { category: "Condition", question: "Are there any known issues with the property?", why: "Legal disclosure" },
    )
  }
  
  if (focusAreas.includes("tenancy")) {
    questions.push(
      { category: "Tenancy", question: "Is the property currently tenanted? If so, until when?", why: "Understand income continuity" },
      { category: "Tenancy", question: "What is the current rent and how long has the tenant been in place?", why: "Verify yield claims" },
    )
  }
  
  if (focusAreas.includes("history")) {
    questions.push(
      { category: "History", question: "How long have you owned the property?", why: "Understand ownership history" },
      { category: "History", question: "Has there been any legal dispute or claim on the property?", why: "Risk assessment" },
    )
  }
  
  return {
    property: {
      id: prop.id,
      title: prop.title,
    },
    questions,
    tip: "Ask open-ended questions and listen for inconsistencies",
  }
}

// ============================================
// CMA Analyst Implementations
// ============================================

async function executeGenerateCMA(
  args: GenerateCMAInput,
  context: ToolExecutionContext
) {
  const { orgId } = context
  const supabase = getSupabaseAdminClient()
  
  const { data: property } = await supabase
    .from("listings")
    .select("*")
    .eq("id", args.propertyId)
    .maybeSingle()
  
  if (!property) {
    return { error: "Property not found" }
  }
  
  const prop = property as Property
  const monthsBack = args.monthsBack ?? 6
  const geoId = prop.area?.toLowerCase().replace(/[^a-z0-9]+/g, '-') ?? ''
  
  // Get comparable sales
  const { data: transactions } = await supabase
    .from("dld_transaction")
    .select("*")
    .eq("org_id", orgId)
    .eq("geo_id", geoId)
    .order("transaction_date", { ascending: false })
    .limit(10)
  
  const comps = (transactions ?? []).map((t: Record<string, unknown>, idx: number) => {
    const compPsf = t.size_sqft ? Math.round((t.price as number) / (t.size_sqft as number)) : null
    const subjectPsf = prop.size ? Math.round(prop.price / prop.size) : null
    
    // Calculate adjustments
    let adjustment = 0
    const adjustmentDetails: string[] = []
    
    // Size adjustment
    if (t.size_sqft && prop.size) {
      const sizeDiff = ((prop.size - (t.size_sqft as number)) / (t.size_sqft as number)) * 100
      if (Math.abs(sizeDiff) > 10) {
        adjustment += sizeDiff > 0 ? -2 : 2 // Larger units have lower PSF
        adjustmentDetails.push(`${sizeDiff > 0 ? '-' : '+'}2% size`)
      }
    }
    
    // Bedroom adjustment
    if (t.bedrooms !== prop.bedrooms) {
      const bedroomDiff = (prop.bedrooms ?? 0) - (t.bedrooms as number ?? 0)
      adjustment += bedroomDiff * 3 // 3% per bedroom difference
      adjustmentDetails.push(`${bedroomDiff > 0 ? '+' : ''}${bedroomDiff * 3}% bedrooms`)
    }
    
    const adjustedPsf = compPsf ? Math.round(compPsf * (1 + adjustment / 100)) : null
    
    return {
      rank: idx + 1,
      address: t.address ?? t.project_name ?? "Unknown",
      transactionDate: t.transaction_date,
      price: t.price,
      priceFormatted: formatPrice(t.price as number),
      size: t.size_sqft,
      bedrooms: t.bedrooms,
      rawPsf: compPsf,
      adjustments: adjustmentDetails.join(", ") || "None",
      adjustedPsf,
    }
  })
  
  // Calculate valuation
  const adjustedPrices = comps.filter(c => c.adjustedPsf).map(c => c.adjustedPsf as number)
  const medianPsf = adjustedPrices.length > 0 
    ? adjustedPrices.sort((a, b) => a - b)[Math.floor(adjustedPrices.length / 2)] 
    : null
  
  const impliedValue = medianPsf && prop.size ? Math.round(medianPsf * prop.size) : null
  
  return {
    subject: {
      id: prop.id,
      title: prop.title,
      area: prop.area,
      size: prop.size,
      bedrooms: prop.bedrooms,
      askingPrice: prop.price,
      askingPriceFormatted: formatPrice(prop.price),
      askingPsf: prop.size ? Math.round(prop.price / prop.size) : null,
    },
    comparables: comps,
    valuation: {
      adjustedMedianPsf: medianPsf,
      adjustedMedianPsfFormatted: medianPsf ? `AED ${medianPsf.toLocaleString()}/sqft` : null,
      impliedValue,
      impliedValueFormatted: impliedValue ? formatPrice(impliedValue) : null,
      askingVsImplied: impliedValue ? `${Math.round(((prop.price - impliedValue) / impliedValue) * 100)}%` : null,
    },
    confidence: comps.length >= 5 ? "High" : comps.length >= 3 ? "Medium" : "Low",
    sampleSize: comps.length,
    recommendation: impliedValue && prop.price > impliedValue * 1.1
      ? `Asking price is ${Math.round(((prop.price - impliedValue) / impliedValue) * 100)}% above implied value - negotiate`
      : impliedValue && prop.price < impliedValue * 0.95
      ? `Property appears underpriced - good value`
      : "Asking price is at fair market value",
  }
}

async function executeGetComparableSales(
  args: GetComparableSalesInput,
  context: ToolExecutionContext
) {
  return executeGetPriceComps(
    { area: args.area, segment: args.segment, limit: args.limit ?? 10 },
    context
  )
}

async function executeCalculateAdjustments(
  args: CalculateAdjustmentsInput,
  context: ToolExecutionContext
) {
  const { orgId } = context
  const supabase = getSupabaseAdminClient()
  
  // Get subject property
  const { data: subject } = await supabase
    .from("listings")
    .select("*")
    .eq("id", args.subjectId)
    .maybeSingle()
  
  if (!subject) {
    return { error: "Subject property not found" }
  }
  
  const subj = subject as Property
  
  // Get comp properties
  const { data: comps } = await supabase
    .from("listings")
    .select("*")
    .in("id", args.compIds)
  
  const adjustments = (comps as Property[] ?? []).map(comp => {
    const factors: Array<{ factor: string; adjustment: string; reason: string }> = []
    
    // Size adjustment
    if (subj.size && comp.size) {
      const sizeDiff = ((subj.size - comp.size) / comp.size) * 100
      if (Math.abs(sizeDiff) > 5) {
        factors.push({
          factor: "Size",
          adjustment: `${sizeDiff > 0 ? '-' : '+'}${Math.abs(Math.round(sizeDiff / 5))}%`,
          reason: `Subject is ${Math.abs(Math.round(sizeDiff))}% ${sizeDiff > 0 ? 'larger' : 'smaller'}`,
        })
      }
    }
    
    // Bedroom adjustment
    if ((subj.bedrooms ?? 0) !== (comp.bedrooms ?? 0)) {
      const diff = (subj.bedrooms ?? 0) - (comp.bedrooms ?? 0)
      factors.push({
        factor: "Bedrooms",
        adjustment: `${diff > 0 ? '+' : ''}${diff * 5}%`,
        reason: `Subject has ${Math.abs(diff)} ${diff > 0 ? 'more' : 'fewer'} bedroom(s)`,
      })
    }
    
    return {
      compId: comp.id,
      compTitle: comp.title,
      adjustmentFactors: factors,
      netAdjustment: factors.reduce((sum, f) => {
        const pct = parseInt(f.adjustment.replace('%', ''))
        return sum + (isNaN(pct) ? 0 : pct)
      }, 0) + "%",
    }
  })
  
  return {
    subject: { id: subj.id, title: subj.title },
    adjustments,
  }
}

async function executeGetValuationRange(
  args: GetValuationRangeInput,
  context: ToolExecutionContext
) {
  // Generate CMA and extract valuation
  const cma = await executeGenerateCMA({ propertyId: args.propertyId }, context)
  
  if ('error' in cma) {
    return cma
  }
  
  const result = cma as {
    subject: { askingPrice: number; size: number }
    valuation: { adjustedMedianPsf: number | null; impliedValue: number | null }
    confidence: string
  }
  
  const median = result.valuation.adjustedMedianPsf ?? 0
  
  return {
    methodology: args.methodology ?? "weighted_average",
    valuationRange: {
      low: result.subject.size ? formatPrice(Math.round(median * 0.92 * result.subject.size)) : null,
      mid: result.valuation.impliedValue ? formatPrice(result.valuation.impliedValue) : null,
      high: result.subject.size ? formatPrice(Math.round(median * 1.08 * result.subject.size)) : null,
    },
    confidence: result.confidence,
    askingPrice: formatPrice(result.subject.askingPrice),
  }
}

// ============================================
// Rental Optimizer Implementations
// ============================================

async function executeAnalyzeRentalPerformance(
  args: AnalyzeRentalPerformanceInput,
  context: ToolExecutionContext
) {
  const { investor } = context
  
  if (!investor) {
    return { error: "No investor context" }
  }
  
  const summary = getPortfolioSummary(investor.id)
  const holding = summary.holdings.find(h => h.id === args.holdingId)
  
  if (!holding) {
    return { error: "Holding not found" }
  }
  
  const property = getHoldingProperty(holding)
  const yieldPct = calcYieldPct(holding)
  
  // Get Ejari benchmarks for the area
  const ejariBenchmark = await executeGetEjariBenchmarks(
    { area: property?.area ?? "Dubai" },
    context
  )
  
  const benchmarkYield = 6.5 // Default benchmark
  
  return {
    holding: {
      id: holding.id,
      title: property?.title ?? "Unknown",
      area: property?.area ?? "Unknown",
    },
    currentPerformance: {
      monthlyRent: holding.monthlyRent,
      monthlyRentFormatted: formatPrice(holding.monthlyRent),
      annualRent: holding.monthlyRent * 12,
      annualRentFormatted: formatPrice(holding.monthlyRent * 12),
      yield: yieldPct,
      yieldFormatted: `${yieldPct.toFixed(2)}%`,
      occupancy: holding.occupancyRate,
      occupancyFormatted: `${Math.round(holding.occupancyRate * 100)}%`,
    },
    benchmark: {
      areaMedianRent: ejariBenchmark.median ?? null,
      areaYield: benchmarkYield,
      yourPosition: yieldPct >= benchmarkYield 
        ? `${((yieldPct - benchmarkYield) / benchmarkYield * 100).toFixed(0)}% above benchmark`
        : `${((benchmarkYield - yieldPct) / benchmarkYield * 100).toFixed(0)}% below benchmark`,
    },
    insights: generateRentalInsights(yieldPct, holding.occupancyRate, benchmarkYield),
  }
}

function generateRentalInsights(yield_pct: number, occupancy: number, benchmark: number): string[] {
  const insights: string[] = []
  
  if (yield_pct >= benchmark * 1.1) {
    insights.push("Above-market yield - maintain current strategy")
  } else if (yield_pct < benchmark * 0.9) {
    insights.push("Below-market yield - consider rent review at renewal")
  }
  
  if (occupancy >= 0.95) {
    insights.push("Excellent occupancy - room to test higher rent")
  } else if (occupancy < 0.75) {
    insights.push("Low occupancy - prioritize tenant acquisition")
  }
  
  return insights
}

async function executeGetEjariBenchmarks(
  args: GetEjariBenchmarksInput,
  context: ToolExecutionContext
) {
  const { orgId } = context
  const supabase = getSupabaseAdminClient()
  
  const geoId = args.area.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  
  const { data: ejariData } = await supabase
    .from("market_metric_snapshot")
    .select("*")
    .eq("org_id", orgId)
    .eq("geo_id", geoId)
    .eq("metric", "median_rent_annual")
    .order("window_end", { ascending: false })
    .limit(1)
  
  const median = ejariData?.[0]?.value ?? null
  
  return {
    area: args.area,
    segment: args.segment ?? "All",
    median,
    medianFormatted: median ? `AED ${Math.round(median).toLocaleString()}/year` : null,
    medianMonthly: median ? Math.round(median / 12) : null,
    medianMonthlyFormatted: median ? `AED ${Math.round(median / 12).toLocaleString()}/month` : null,
    sampleSize: ejariData?.[0]?.sample_size ?? 0,
    asOf: ejariData?.[0]?.window_end ?? null,
    source: "Ejari (RERA)",
  }
}

async function executeSuggestOptimalRent(
  args: SuggestOptimalRentInput,
  context: ToolExecutionContext
) {
  // Get current performance
  const performance = await executeAnalyzeRentalPerformance(
    { holdingId: args.holdingId },
    context
  )
  
  if ('error' in performance) {
    return performance
  }
  
  const perf = performance as {
    holding: { area: string }
    currentPerformance: { monthlyRent: number; yield: number }
    benchmark: { areaMedianRent: number | null }
  }
  
  const currentRent = perf.currentPerformance.monthlyRent
  const targetVacancy = args.targetVacancy ?? 14 // 2 weeks default
  
  // Suggest rent based on vacancy tolerance
  let suggestedRent = currentRent
  if (targetVacancy <= 7) {
    // Quick lease - price competitively
    suggestedRent = Math.round(currentRent * 0.95)
  } else if (targetVacancy <= 21) {
    // Balanced approach
    suggestedRent = Math.round(currentRent * 1.02)
  } else {
    // Test higher rent
    suggestedRent = Math.round(currentRent * 1.08)
  }
  
  return {
    currentRent: formatPrice(currentRent),
    targetVacancy: `${targetVacancy} days`,
    suggestedRent: formatPrice(suggestedRent),
    adjustmentPct: `${Math.round(((suggestedRent - currentRent) / currentRent) * 100)}%`,
    rationale: targetVacancy <= 7 
      ? "Priced for quick lease - minimize vacancy"
      : targetVacancy <= 21
      ? "Balanced pricing for reasonable vacancy period"
      : "Testing market ceiling - accept longer vacancy for higher rent",
  }
}

async function executeAnalyzeFurnishingROI(
  args: AnalyzeFurnishingROIInput,
  context: ToolExecutionContext
) {
  const furnishingCost = args.furnishingBudget ?? 50000 // Default AED 50k
  const rentPremium = 0.25 // 25% rent premium for furnished
  
  // Get current rental info
  const performance = await executeAnalyzeRentalPerformance(
    { holdingId: args.holdingId },
    context
  )
  
  if ('error' in performance) {
    return performance
  }
  
  const perf = performance as {
    currentPerformance: { monthlyRent: number }
  }
  
  const currentRent = perf.currentPerformance.monthlyRent
  const furnishedRent = Math.round(currentRent * (1 + rentPremium))
  const monthlyIncrease = furnishedRent - currentRent
  const paybackMonths = Math.round(furnishingCost / monthlyIncrease)
  
  return {
    investmentRequired: formatPrice(furnishingCost),
    currentRent: formatPrice(currentRent),
    projectedFurnishedRent: formatPrice(furnishedRent),
    monthlyIncrease: formatPrice(monthlyIncrease),
    paybackPeriod: `${paybackMonths} months`,
    annualROI: `${Math.round((monthlyIncrease * 12) / furnishingCost * 100)}%`,
    recommendation: paybackMonths <= 18 
      ? "Strong ROI - recommend furnishing"
      : paybackMonths <= 30
      ? "Moderate ROI - consider if planning long hold"
      : "Weak ROI - keep unfurnished",
  }
}

async function executePredictVacancy(
  args: PredictVacancyInput,
  context: ToolExecutionContext
) {
  const performance = await executeAnalyzeRentalPerformance(
    { holdingId: args.holdingId },
    context
  )
  
  if ('error' in performance) {
    return performance
  }
  
  const perf = performance as {
    holding: { area: string }
    currentPerformance: { monthlyRent: number }
    benchmark: { areaMedianRent: number | null }
  }
  
  const askingRent = args.askingRent ?? perf.currentPerformance.monthlyRent
  const marketRent = perf.benchmark.areaMedianRent ? perf.benchmark.areaMedianRent / 12 : askingRent
  
  // Calculate expected days based on price position
  const pricePosition = (askingRent - marketRent) / marketRent
  let baseDays = 21 // Average 3 weeks
  
  if (pricePosition > 0.1) {
    baseDays = Math.round(baseDays * (1 + pricePosition * 2))
  } else if (pricePosition < -0.1) {
    baseDays = Math.round(baseDays * 0.6)
  }
  
  return {
    askingRent: formatPrice(askingRent),
    marketRent: formatPrice(marketRent),
    priceVsMarket: `${Math.round(pricePosition * 100)}%`,
    predictedDaysToLease: baseDays,
    confidence: "Medium",
    factors: [
      pricePosition > 0 ? "Above market price increases vacancy time" : "Competitive pricing",
      "Seasonal factors not yet incorporated",
    ],
  }
}

async function executeAssessChurnRisk(
  args: AssessChurnRiskInput,
  context: ToolExecutionContext
) {
  const performance = await executeAnalyzeRentalPerformance(
    { holdingId: args.holdingId },
    context
  )
  
  if ('error' in performance) {
    return performance
  }
  
  const perf = performance as {
    currentPerformance: { monthlyRent: number; yield: number }
    benchmark: { areaMedianRent: number | null }
  }
  
  // Assess churn risk factors
  const riskFactors: string[] = []
  let riskScore = 0
  
  // Price vs market
  if (perf.benchmark.areaMedianRent) {
    const rentDiff = (perf.currentPerformance.monthlyRent * 12 - perf.benchmark.areaMedianRent) / perf.benchmark.areaMedianRent
    if (rentDiff > 0.15) {
      riskFactors.push("Rent 15%+ above market - high churn risk")
      riskScore += 30
    } else if (rentDiff > 0.05) {
      riskFactors.push("Rent slightly above market")
      riskScore += 10
    }
  }
  
  // Default moderate risk
  riskScore += 20
  riskFactors.push("Standard market conditions apply")
  
  return {
    churnRisk: riskScore >= 50 ? "High" : riskScore >= 30 ? "Medium" : "Low",
    riskScore,
    factors: riskFactors,
    recommendedActions: [
      "Engage tenant 60 days before lease end",
      riskScore >= 50 ? "Consider rent reduction to retain" : "Standard renewal offer",
    ],
  }
}

// ============================================
// Market Forecaster Implementations
// ============================================

async function executeForecastPrices(
  args: ForecastPricesInput,
  context: ToolExecutionContext
) {
  const { orgId } = context
  const supabase = getSupabaseAdminClient()
  
  const geoId = args.area.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const timeframes = args.timeframes ?? ["3_months", "6_months", "12_months"]
  
  // Get historical data for trend analysis
  const { data: historical } = await supabase
    .from("market_metric_snapshot")
    .select("*")
    .eq("org_id", orgId)
    .eq("geo_id", geoId)
    .eq("metric", "median_price_psf")
    .order("window_end", { ascending: false })
    .limit(8) // 2 years quarterly
  
  const currentPrice = historical?.[0]?.value ?? null
  const previousPrice = historical?.[1]?.value ?? null
  
  // Calculate momentum
  const momentum = currentPrice && previousPrice 
    ? ((currentPrice - previousPrice) / previousPrice * 100)
    : 0
  
  // Generate forecasts
  const forecasts = timeframes.map(tf => {
    let forecastPct = 0
    let confidence = 50
    
    switch (tf) {
      case "3_months":
        forecastPct = momentum * 0.5 // Continuation of trend
        confidence = 70
        break
      case "6_months":
        forecastPct = momentum * 0.8
        confidence = 55
        break
      case "12_months":
        forecastPct = momentum + 3 // Mean reversion factor
        confidence = 40
        break
    }
    
    return {
      timeframe: tf.replace("_", " "),
      priceDirection: forecastPct >= 1 ? "up" : forecastPct <= -1 ? "down" : "flat",
      changePct: `${forecastPct >= 0 ? '+' : ''}${forecastPct.toFixed(1)}%`,
      confidence: `${confidence}%`,
      keyDriver: momentum > 0 ? "Positive momentum" : momentum < 0 ? "Negative momentum" : "Stable market",
    }
  })
  
  return {
    area: args.area,
    segment: args.segment ?? "All",
    currentPricePsf: currentPrice ? `AED ${Math.round(currentPrice).toLocaleString()}` : null,
    recentMomentum: `${momentum >= 0 ? '+' : ''}${momentum.toFixed(1)}%`,
    forecasts,
    disclaimer: "Forecasts are indicative based on historical trends. Actual results may vary.",
  }
}

async function executeGetLeadingIndicators(
  args: GetLeadingIndicatorsInput,
  context: ToolExecutionContext
) {
  const { orgId } = context
  const supabase = getSupabaseAdminClient()
  
  // Get portal data for leading indicators
  let query = supabase
    .from("portal_listing_snapshot")
    .select("*")
    .eq("org_id", orgId)
    .order("as_of_date", { ascending: false })
  
  if (args.area) {
    const geoId = args.area.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    query = query.eq("geo_id", geoId)
  }
  
  const { data: portalData } = await query.limit(10)
  
  // Aggregate indicators
  const totalListings = (portalData ?? []).reduce((sum, p) => sum + (p.active_listings as number ?? 0), 0)
  const totalPriceCuts = (portalData ?? []).reduce((sum, p) => sum + (p.price_cuts_count as number ?? 0), 0)
  
  const priceCutRate = totalListings > 0 ? (totalPriceCuts / totalListings * 100) : 0
  
  return {
    area: args.area ?? "Dubai-wide",
    indicators: [
      {
        name: "Active Listings",
        value: totalListings.toLocaleString(),
        trend: "stable",
        interpretation: totalListings > 5000 ? "High supply may pressure prices" : "Moderate supply",
      },
      {
        name: "Price Cut Rate",
        value: `${priceCutRate.toFixed(1)}%`,
        trend: priceCutRate > 15 ? "bearish" : "neutral",
        interpretation: priceCutRate > 20 ? "Seller stress indicates price softness" : "Normal discounting",
      },
      {
        name: "Transaction Volume",
        value: "Requires DLD data",
        trend: "unknown",
        interpretation: "Volume trends indicate market direction",
      },
    ],
    marketSentiment: priceCutRate > 20 ? "Bearish" : priceCutRate > 10 ? "Neutral" : "Bullish",
  }
}

async function executeIdentifyEmergingHotspots(
  args: IdentifyEmergingHotspotsInput,
  context: ToolExecutionContext
) {
  const { orgId } = context
  const supabase = getSupabaseAdminClient()
  
  // Get recent signals that indicate emerging opportunities
  const { data: signals } = await supabase
    .from("market_signal")
    .select("*")
    .eq("org_id", orgId)
    .eq("type", "yield_opportunity")
    .order("created_at", { ascending: false })
    .limit(10)
  
  const minConfidence = args.minConfidence ?? 50
  
  // Group by area and score
  const areaScores = new Map<string, { score: number; signals: number }>()
  
  for (const signal of signals ?? []) {
    const area = signal.geo_name as string
    const current = areaScores.get(area) ?? { score: 0, signals: 0 }
    current.score += signal.severity === "urgent" ? 30 : signal.severity === "watch" ? 20 : 10
    current.signals++
    areaScores.set(area, current)
  }
  
  // Filter and rank
  const hotspots = Array.from(areaScores.entries())
    .map(([area, data]) => ({
      area,
      confidenceScore: Math.min(data.score, 100),
      signalCount: data.signals,
      status: data.score >= 70 ? "High potential" : data.score >= 40 ? "Emerging" : "Early stage",
    }))
    .filter(h => h.confidenceScore >= minConfidence)
    .sort((a, b) => b.confidenceScore - a.confidenceScore)
    .slice(0, 5)
  
  return {
    segment: args.segment ?? "All",
    minConfidence,
    hotspotsFound: hotspots.length,
    hotspots,
    recommendation: hotspots.length > 0 
      ? `Consider investigating ${hotspots[0]?.area} for opportunities`
      : "No emerging hotspots identified at this confidence level",
  }
}

async function executeAnalyzeSupplyPipeline(
  args: AnalyzeSupplyPipelineInput,
  context: ToolExecutionContext
) {
  // This would integrate with project/launch data
  // For now, return a structured response
  const yearsAhead = args.yearsAhead ?? 2
  
  return {
    area: args.area,
    analysisHorizon: `${yearsAhead} years`,
    currentInventory: "Data integration pending",
    upcomingSupply: [
      { year: 2026, units: "Estimated based on launches", impact: "Moderate" },
      { year: 2027, units: "Estimated based on launches", impact: "Unknown" },
    ],
    supplyRisk: "Medium",
    recommendation: "Monitor developer launch announcements and handover schedules",
    dataNote: "Full supply pipeline analysis requires integration with developer data",
  }
}

async function executeRunScenarioAnalysis(
  args: RunScenarioAnalysisInput,
  context: ToolExecutionContext
) {
  // Get current market data
  const forecast = await executeForecastPrices(
    { area: args.area, segment: args.segment, timeframes: ["12_months"] },
    context
  )
  
  if ('error' in forecast) {
    return forecast
  }
  
  const fc = forecast as {
    currentPricePsf: string | null
    recentMomentum: string
  }
  
  return {
    area: args.area,
    segment: args.segment ?? "All",
    currentMarket: {
      price: fc.currentPricePsf,
      momentum: fc.recentMomentum,
    },
    scenarios: {
      bull: {
        probability: "25%",
        priceChange: "+15-20%",
        drivers: ["Continued foreign investment", "Rate cuts", "Supply absorption"],
        triggers: "Sustained transaction volume increase",
      },
      base: {
        probability: "50%",
        priceChange: "+3-7%",
        drivers: ["Stable demand", "Moderate supply", "Economic growth"],
        triggers: "Current trends continue",
      },
      bear: {
        probability: "25%",
        priceChange: "-5-15%",
        drivers: ["Supply glut", "Rate hikes", "Economic slowdown"],
        triggers: "Transaction volume decline >20%",
      },
    },
    investmentThesis: "Base case supports hold strategy. Bull case supports opportunistic buying in quality areas.",
  }
}

async function executeGetExternalFactors(
  context: ToolExecutionContext
) {
  return {
    factors: [
      {
        category: "Policy",
        factor: "UAE Golden Visa",
        impact: "Positive",
        details: "Expanded eligibility driving foreign buyer demand",
      },
      {
        category: "Economic",
        factor: "Interest Rates",
        impact: "Neutral",
        details: "Rates stabilizing after recent increases",
      },
      {
        category: "Supply",
        factor: "New Launches",
        impact: "Watch",
        details: "High volume of off-plan launches may increase competition",
      },
      {
        category: "Demand",
        factor: "Tourism Recovery",
        impact: "Positive",
        details: "Strong tourism supporting short-term rental demand",
      },
      {
        category: "Infrastructure",
        factor: "Metro Expansion",
        impact: "Positive",
        details: "Route 2020 improving connectivity to emerging areas",
      },
    ],
    overallOutlook: "Cautiously optimistic",
    lastUpdated: new Date().toISOString().split('T')[0],
  }
}
