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
      return { error: `Unknown tool: ${toolName}` }
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
      tier: "hot-deal" as const,
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
      dldMedianPsf: externalData.dld.medianPricePsf,
      currentPsf: property.size ? Math.round(holding.currentValue / property.size) : null,
      priceVsMarket: externalData.derived.priceVsMarket,
      assessment: externalData.derived.assessment,
      areaYield: externalData.derived.areaYieldEstimate,
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
