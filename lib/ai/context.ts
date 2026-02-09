import "server-only"

import { getInvestorById } from "@/lib/db/investors"
import { listListings, getListingById } from "@/lib/db/listings"
import { getHoldingsByInvestor, getPortfolioSummary } from "@/lib/db/holdings"
import { getSupabaseAdminClient } from "@/lib/db/client"
import type { InvestorRecord, ListingRecord } from "@/lib/data/types"
import { buildSummaryContext, hasSummaryData, truncateContextText } from "./summary-context"

/**
 * Market data structure from DLD
 */
export type MarketAreaStats = {
  areaName: string
  transactionCount: number
  avgPrice: number
  avgPricePerSqm: number
  yoyChangePct: number
  minPrice: number
  maxPrice: number
}

export type MarketTrend = {
  month: string
  transactionCount: number
  totalVolume: number
  avgPrice: number
}

export type PortalComparison = {
  areaName: string
  dldAvgPrice: number
  portalAvgPrice: number
  premiumPct: number
  hasOpportunity: boolean
}

/**
 * Default limits to control AI context size and costs
 */
export const AI_CONTEXT_LIMITS = {
  maxContextChars: 16000,      // ~4000 tokens
  maxHoldings: 10,             // Limit holdings shown
  maxListings: 20,             // Limit listings shown
  maxMarketSummaries: 15,      // Limit market summaries
  preferSummaryTables: true,   // Use pre-aggregated data when available
} as const

export type AIContextOptions = {
  investorId: string
  tenantId: string
  includePortfolio?: boolean
  includeListings?: boolean
  includeMarket?: boolean
  includeMandate?: boolean
  propertyId?: string
  // New options for cost control
  useSummaryTables?: boolean   // Use pre-aggregated AI summary tables
  maxContextChars?: number     // Maximum context text length
  maxHoldings?: number         // Limit number of holdings
  maxListings?: number         // Limit number of listings
}

export type AIContext = {
  investor: InvestorRecord | null
  portfolio?: {
    summary: Awaited<ReturnType<typeof getPortfolioSummary>>
    holdings: Awaited<ReturnType<typeof getHoldingsByInvestor>>
  }
  listings?: ListingRecord[]
  property?: ListingRecord | null
  contextText: string
}

/**
 * Build AI agent context from Supabase database
 * Fetches real investor data, portfolio holdings, and listings
 * 
 * Cost Control:
 * - Uses pre-aggregated summary tables when available (useSummaryTables=true)
 * - Limits holdings and listings to prevent excessive context
 * - Truncates context text to maxContextChars
 */
export async function buildAIContext(options: AIContextOptions): Promise<AIContext> {
  const {
    investorId,
    tenantId,
    includePortfolio = true,
    includeListings = false,
    includeMarket = false,
    includeMandate = false,
    propertyId,
    useSummaryTables = AI_CONTEXT_LIMITS.preferSummaryTables,
    maxContextChars = AI_CONTEXT_LIMITS.maxContextChars,
    maxHoldings = AI_CONTEXT_LIMITS.maxHoldings,
    maxListings = AI_CONTEXT_LIMITS.maxListings,
  } = options

  // Check if we should use summary tables (faster, cheaper)
  if (useSummaryTables) {
    try {
      const summaryAvailable = await hasSummaryData(tenantId)
      if (summaryAvailable.hasMarketData || summaryAvailable.hasInvestorData) {
        // Use summary-based context building
        const summaryContext = await buildSummaryContext({
          orgId: tenantId,
          investorId,
          maxMarketSummaries: AI_CONTEXT_LIMITS.maxMarketSummaries,
        })
        
        // Still fetch investor for full context if needed
        const investor = await getInvestorById(investorId)
        
        // Build hybrid context (summary + specific property if needed)
        const context: AIContext = {
          investor,
          contextText: summaryContext.contextText,
        }
        
        // Fetch specific property if requested (always needed for property pages)
        if (propertyId) {
          const property = await getListingById(propertyId)
          context.property = property
          
          // Append property details to context
          if (property) {
            context.contextText += "\n" + buildPropertySection(property)
          }
        }
        
        // Apply truncation limit
        if (context.contextText.length > maxContextChars) {
          context.contextText = truncateContextText(context.contextText, maxContextChars)
        }
        
        return context
      }
    } catch (error) {
      // Fall back to traditional context building if summary tables fail
      console.warn("[buildAIContext] Summary tables unavailable, using traditional context:", error)
    }
  }

  // Traditional context building (with limits applied)
  const investor = await getInvestorById(investorId)

  // Build context components
  const context: AIContext = {
    investor,
    contextText: "",
  }

  // Fetch portfolio data if requested (with limit)
  if (includePortfolio && investor) {
    const allHoldings = await getHoldingsByInvestor(investorId)
    const summary = await getPortfolioSummary(investorId)
    
    // Sort by value and limit
    const sortedHoldings = allHoldings
      .sort((a, b) => b.currentValue - a.currentValue)
      .slice(0, maxHoldings)

    context.portfolio = {
      summary,
      holdings: sortedHoldings,
    }
  }

  // Fetch listings if requested (with limit)
  if (includeListings) {
    const allListings = await listListings(tenantId)
    // Limit listings to prevent context explosion
    context.listings = allListings.slice(0, maxListings)
  }

  // Fetch specific property if requested
  if (propertyId) {
    const property = await getListingById(propertyId)
    context.property = property
  }

  // Build context text
  context.contextText = buildContextText(context, includeMarket, includeMandate)
  
  // Apply truncation limit
  if (context.contextText.length > maxContextChars) {
    context.contextText = truncateContextText(context.contextText, maxContextChars)
  }

  return context
}

/**
 * Build property section for context text
 */
function buildPropertySection(prop: ListingRecord): string {
  const sections: string[] = []
  sections.push("=== PROPERTY DETAILS ===")
  sections.push(`Title: ${prop.title}`)
  if (prop.address) sections.push(`Address: ${prop.address}`)
  if (prop.area) sections.push(`Area: ${prop.area}`)
  if (prop.type) sections.push(`Type: ${prop.type}`)
  if (prop.price) sections.push(`Price: ${formatCurrency(prop.price)}`)
  if (prop.size) sections.push(`Size: ${prop.size} sq ft`)
  if (prop.bedrooms) sections.push(`Bedrooms: ${prop.bedrooms}`)
  if (prop.bathrooms) sections.push(`Bathrooms: ${prop.bathrooms}`)
  if (prop.expectedRent) sections.push(`Expected Rent: ${formatCurrency(prop.expectedRent)}/month`)
  return sections.join("\n")
}

/**
 * Build formatted context text for AI agent
 */
function buildContextText(context: AIContext, includeMarket: boolean, includeMandate: boolean = false): string {
  const sections: string[] = []

  // Investor profile section
  if (context.investor) {
    sections.push("INVESTOR PROFILE:")
    sections.push(`- Name: ${context.investor.name}`)
    if (context.investor.company) {
      sections.push(`- Company: ${context.investor.company}`)
    }
    if (context.investor.mandate && !includeMandate) {
      // Brief mandate summary when not doing full mandate analysis
      const mandate = context.investor.mandate as Record<string, unknown>
      sections.push(`- Investment Mandate:`)
      if (mandate.propertyTypes) {
        sections.push(`  - Property Types: ${(mandate.propertyTypes as string[]).join(", ")}`)
      }
      if (mandate.preferredAreas) {
        sections.push(`  - Preferred Areas: ${(mandate.preferredAreas as string[]).join(", ")}`)
      }
      if (mandate.yieldTarget) {
        sections.push(`  - Yield Target: ${mandate.yieldTarget}`)
      }
      if (mandate.minInvestment || mandate.maxInvestment) {
        sections.push(
          `  - Investment Range: ${formatCurrency(mandate.minInvestment as number)} - ${formatCurrency(mandate.maxInvestment as number)}`
        )
      }
    }
    sections.push("")
  }

  // Detailed mandate analysis section for portfolio_advisor
  if (includeMandate && context.investor?.mandate) {
    const mandate = context.investor.mandate as Record<string, unknown>
    
    sections.push("INVESTOR MANDATE ANALYSIS:")
    sections.push(`- Strategy: ${mandate.strategy ?? "Not specified"}`)
    sections.push(`- Risk Tolerance: ${mandate.riskTolerance ?? "Not specified"}`)
    sections.push(`- Yield Target: ${mandate.yieldTarget ?? "Not specified"}`)
    sections.push(`- Investment Horizon: ${mandate.investmentHorizon ?? "Not specified"}`)
    sections.push(`- Preferred Areas: ${(mandate.preferredAreas as string[] | undefined)?.join(", ") ?? "Not specified"}`)
    sections.push(`- Property Types: ${(mandate.propertyTypes as string[] | undefined)?.join(", ") ?? "Not specified"}`)
    sections.push(`- Budget Range: ${formatCurrency(mandate.minInvestment as number)} - ${formatCurrency(mandate.maxInvestment as number)}`)
    sections.push("")

    // Portfolio vs Mandate Fit analysis
    if (context.portfolio) {
      const { summary, holdings } = context.portfolio
      const preferredAreas = (mandate.preferredAreas as string[] | undefined) ?? []
      const yieldTarget = parseFloat(String(mandate.yieldTarget ?? "0").replace("%", "")) || 0
      
      // Count holdings in preferred areas
      const holdingsInPreferredAreas = holdings.filter(h => {
        // Holdings may have area info from listing, check if it matches
        const holdingArea = (h as unknown as { area?: string }).area ?? ""
        return preferredAreas.some(area => 
          holdingArea.toLowerCase().includes(area.toLowerCase())
        )
      }).length

      // Analyze concentration risk
      const areaConcentration = analyzeConcentration(holdings, preferredAreas)

      sections.push("PORTFOLIO VS MANDATE FIT:")
      sections.push(`- Current yield: ${summary.avgYieldPct.toFixed(2)}% vs target: ${yieldTarget}%`)
      sections.push(`- Holdings in preferred areas: ${holdingsInPreferredAreas} of ${holdings.length} properties`)
      sections.push(`- Concentration risk: ${areaConcentration}`)
      sections.push("")
    }
  }

  // Portfolio section
  if (context.portfolio) {
    const { summary, holdings } = context.portfolio

    sections.push("CURRENT PORTFOLIO:")
    sections.push(`- Total Properties: ${summary.propertyCount}`)
    sections.push(`- Total Portfolio Value: ${formatCurrency(summary.totalValue)}`)
    sections.push(`- Total Purchase Cost: ${formatCurrency(summary.totalPurchaseCost)}`)
    sections.push(`- Average Rental Yield: ${summary.avgYieldPct.toFixed(2)}%`)
    sections.push(`- Monthly Rental Income (Net): ${formatCurrency(summary.totalMonthlyRental)}`)
    sections.push(`- Annual Rental Income (Net): ${formatCurrency(summary.totalAnnualRental)}`)
    sections.push(`- Average Occupancy Rate: ${summary.avgOccupancyPct.toFixed(1)}%`)
    sections.push(`- Total Appreciation: ${summary.appreciationPct.toFixed(1)}%`)
    sections.push("")

    if (holdings.length > 0) {
      sections.push("PROPERTY BREAKDOWN:")
      for (const holding of holdings) {
        const netYield = calculateYield(holding)
        const appreciation = calculateAppreciation(holding)

        sections.push(
          `- Property ID ${holding.listingId}:`
        )
        sections.push(`  - Current Value: ${formatCurrency(holding.currentValue)}`)
        sections.push(`  - Purchase Price: ${formatCurrency(holding.purchasePrice)}`)
        sections.push(`  - Monthly Rent: ${formatCurrency(holding.monthlyRent)}`)
        sections.push(`  - Occupancy: ${(holding.occupancyRate * 100).toFixed(1)}%`)
        sections.push(`  - Net Yield: ${netYield.toFixed(2)}%`)
        sections.push(`  - Appreciation: ${appreciation.toFixed(1)}%`)
        sections.push(`  - Purchase Date: ${holding.purchaseDate}`)
      }
      sections.push("")
    }
  }

  // Specific property section
  if (context.property) {
    const prop = context.property
    sections.push("PROPERTY DETAILS:")
    sections.push(`- Title: ${prop.title}`)
    if (prop.address) sections.push(`- Address: ${prop.address}`)
    if (prop.area) sections.push(`- Area: ${prop.area}`)
    if (prop.type) sections.push(`- Type: ${prop.type}`)
    if (prop.price) sections.push(`- Price: ${formatCurrency(prop.price)}`)
    if (prop.size) sections.push(`- Size: ${prop.size} sq ft`)
    if (prop.bedrooms) sections.push(`- Bedrooms: ${prop.bedrooms}`)
    if (prop.bathrooms) sections.push(`- Bathrooms: ${prop.bathrooms}`)
    if (prop.expectedRent) sections.push(`- Expected Rent: ${formatCurrency(prop.expectedRent)}/month`)
    if (prop.developer) sections.push(`- Developer: ${prop.developer}`)
    if (prop.readiness) sections.push(`- Readiness: ${prop.readiness}`)
    if (prop.handoverDate) sections.push(`- Handover Date: ${prop.handoverDate}`)
    sections.push("")
  }

  // Available listings section
  if (context.listings && context.listings.length > 0) {
    sections.push("AVAILABLE LISTINGS:")
    sections.push(`- Total Available: ${context.listings.length}`)
    
    // Group by area
    const byArea = groupBy(context.listings, (l) => l.area || "Unknown")
    sections.push("- By Area:")
    for (const [area, listings] of Object.entries(byArea)) {
      const avgPrice = listings.reduce((sum, l) => sum + (l.price || 0), 0) / listings.length
      sections.push(`  - ${area}: ${listings.length} properties, avg price ${formatCurrency(avgPrice)}`)
    }
    sections.push("")
  }

  // Market context section - placeholder for sync function
  // Real market data is fetched in buildMarketContextAsync
  if (includeMarket) {
    sections.push("MARKET CONTEXT:")
    sections.push("- Dubai real estate market data available")
    sections.push("- Use buildMarketContextAsync() for detailed market intelligence")
    sections.push("")
  }

  // Instructions section
  sections.push("INSTRUCTIONS:")
  sections.push("- Analyze the investor's portfolio and mandate")
  sections.push("- Provide data-driven insights based on actual holdings")
  sections.push("- Compare properties to investor's investment criteria")
  sections.push("- Calculate ROI, yield, and appreciation potential")
  sections.push("- Consider portfolio diversification and risk")
  sections.push("- Recommend properties that match the investor's mandate")

  return sections.join("\n")
}

/**
 * Analyze portfolio concentration risk
 */
function analyzeConcentration(
  holdings: Awaited<ReturnType<typeof getHoldingsByInvestor>>,
  preferredAreas: string[]
): string {
  if (holdings.length === 0) {
    return "No holdings to analyze"
  }
  
  if (holdings.length === 1) {
    return "High - single property concentration"
  }
  
  // Analyze value concentration
  const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0)
  const maxHoldingValue = Math.max(...holdings.map(h => h.currentValue))
  const maxConcentrationPct = (maxHoldingValue / totalValue) * 100
  
  if (maxConcentrationPct > 50) {
    return `High - largest holding represents ${maxConcentrationPct.toFixed(0)}% of portfolio value`
  }
  
  if (maxConcentrationPct > 30) {
    return `Moderate - largest holding represents ${maxConcentrationPct.toFixed(0)}% of portfolio value`
  }
  
  if (holdings.length < 3) {
    return "Moderate - limited diversification with only " + holdings.length + " properties"
  }
  
  return `Low - well diversified across ${holdings.length} properties`
}

/**
 * Calculate net yield for a holding
 */
function calculateYield(holding: Awaited<ReturnType<typeof getHoldingsByInvestor>>[0]): number {
  const annualGross = holding.monthlyRent * 12 * holding.occupancyRate
  const annualNet = annualGross - holding.annualExpenses
  return (annualNet / holding.currentValue) * 100
}

/**
 * Calculate appreciation percentage
 */
function calculateAppreciation(holding: Awaited<ReturnType<typeof getHoldingsByInvestor>>[0]): number {
  return ((holding.currentValue - holding.purchasePrice) / holding.purchasePrice) * 100
}

/**
 * Format currency (AED)
 */
function formatCurrency(value: number | undefined | null): string {
  if (!value) return "AED 0"
  return `AED ${Math.round(value).toLocaleString()}`
}

/**
 * Group array by key function
 */
function groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
  return array.reduce(
    (groups, item) => {
      const key = keyFn(item)
      if (!groups[key]) groups[key] = []
      groups[key].push(item)
      return groups
    },
    {} as Record<string, T[]>
  )
}

/**
 * Build page-specific context
 */
export function buildPageContext(pagePath?: string): string {
  if (!pagePath) return ""

  const contextMap: Record<string, string> = {
    "/properties": "User is viewing their property portfolio with detailed holdings, valuations, and rental income.",
    "/real-estate": "User is browsing available real estate listings and investment opportunities.",
    "/investors": "User is managing investor profiles and portfolios.",
    "/dashboard": "User is viewing the main dashboard with portfolio overview and key metrics.",
    "/memos": "User is viewing or creating investment memos for specific properties.",
    "/recommendations": "User is viewing AI-generated property recommendations.",
  }

  // Check for exact match first
  if (contextMap[pagePath]) {
    return contextMap[pagePath]
  }

  // Check for pattern matches (e.g., /investor/memos/[id])
  if (pagePath.startsWith("/investor/memos/")) {
    return "Investor is reviewing a specific investment memo and may have questions about the deal, assumptions, scenarios, or evidence. Help them understand the memo content and make an informed decision."
  }

  return ""
}

/**
 * Fetch real market data from DLD database
 * Returns area statistics, trends, and portal comparisons
 */
export async function fetchMarketData(options?: {
  areas?: string[]
  limit?: number
}): Promise<{
  areaStats: MarketAreaStats[]
  trends: MarketTrend[]
  comparisons: PortalComparison[]
}> {
  const supabase = getSupabaseAdminClient()
  const limit = options?.limit ?? 15

  // Fetch area statistics from DLD
  let areaQuery = supabase
    .from("dld_area_stats")
    .select("*")
    .gt("transaction_count", 5)
    .order("transaction_count", { ascending: false })
    .limit(limit)

  if (options?.areas?.length) {
    areaQuery = areaQuery.in("area_name_en", options.areas)
  }

  const { data: areaData, error: areaError } = await areaQuery

  if (areaError) {
    console.warn("[fetchMarketData] Error fetching area stats:", areaError.message)
  }

  const areaStats: MarketAreaStats[] = (areaData ?? []).map(row => ({
    areaName: row.area_name_en || "Unknown",
    transactionCount: Number(row.transaction_count ?? 0),
    avgPrice: Number(row.avg_price ?? 0),
    avgPricePerSqm: Number(row.avg_price_per_sqm ?? 0),
    yoyChangePct: Number(row.yoy_change_pct ?? 0),
    minPrice: Number(row.min_price ?? 0),
    maxPrice: Number(row.max_price ?? 0),
  }))

  // Fetch monthly trends
  const { data: trendData, error: trendError } = await supabase
    .from("dld_monthly_trends")
    .select("*")
    .order("month", { ascending: false })
    .limit(12)

  if (trendError) {
    console.warn("[fetchMarketData] Error fetching trends:", trendError.message)
  }

  const trends: MarketTrend[] = (trendData ?? []).map(row => ({
    month: row.month || "",
    transactionCount: Number(row.transaction_count ?? 0),
    totalVolume: Number(row.total_volume ?? 0),
    avgPrice: Number(row.avg_price ?? 0),
  }))

  // Fetch DLD vs Portal price comparisons
  const { data: comparisonData, error: compError } = await supabase
    .from("area_price_comparison")
    .select("*")
    .not("dld_avg_price", "is", null)
    .not("portal_avg_price", "is", null)
    .order("has_both", { ascending: false })
    .limit(limit)

  if (compError) {
    console.warn("[fetchMarketData] Error fetching comparisons:", compError.message)
  }

  const comparisons: PortalComparison[] = (comparisonData ?? []).map(row => ({
    areaName: row.area_name || "Unknown",
    dldAvgPrice: Number(row.dld_avg_price ?? 0),
    portalAvgPrice: Number(row.portal_avg_price ?? 0),
    premiumPct: Number(row.price_premium_pct ?? 0),
    hasOpportunity: Number(row.price_premium_pct ?? 0) < -5, // Asking < market = opportunity
  }))

  return { areaStats, trends, comparisons }
}

/**
 * Build market context text from real DLD data
 * This provides AI agents with actual market intelligence
 */
export async function buildMarketContextAsync(options?: {
  areas?: string[]
  includeComparisons?: boolean
  includeTrends?: boolean
}): Promise<string> {
  const sections: string[] = []
  
  try {
    const { areaStats, trends, comparisons } = await fetchMarketData({
      areas: options?.areas,
      limit: 15,
    })

    sections.push("=== DUBAI REAL ESTATE MARKET INTELLIGENCE ===")
    sections.push(`Data source: Dubai Land Department (DLD) official transactions`)
    sections.push("")

    // Market Overview
    if (areaStats.length > 0) {
      const totalTransactions = areaStats.reduce((sum, a) => sum + a.transactionCount, 0)
      const avgPrice = areaStats.reduce((sum, a) => sum + a.avgPrice, 0) / areaStats.length
      const avgPricePerSqm = areaStats.reduce((sum, a) => sum + a.avgPricePerSqm, 0) / areaStats.length

      sections.push("MARKET OVERVIEW:")
      sections.push(`- Total analyzed transactions: ${totalTransactions.toLocaleString()}`)
      sections.push(`- Average property price: ${formatCurrency(avgPrice)}`)
      sections.push(`- Average price per sqm: ${formatCurrency(avgPricePerSqm)}/sqm`)
      sections.push("")

      // Top areas by transaction volume
      sections.push("TOP AREAS BY ACTIVITY:")
      const topAreas = areaStats.slice(0, 10)
      for (const area of topAreas) {
        const yoyIndicator = area.yoyChangePct > 0 ? "↑" : area.yoyChangePct < 0 ? "↓" : "→"
        sections.push(
          `- ${area.areaName}: ${area.transactionCount} txns, avg ${formatCurrency(area.avgPrice)}, ${yoyIndicator}${Math.abs(area.yoyChangePct).toFixed(1)}% YoY`
        )
      }
      sections.push("")

      // Price ranges by area
      sections.push("PRICE RANGES BY AREA:")
      for (const area of topAreas.slice(0, 5)) {
        sections.push(
          `- ${area.areaName}: ${formatCurrency(area.minPrice)} - ${formatCurrency(area.maxPrice)}`
        )
      }
      sections.push("")
    }

    // Monthly trends
    if (options?.includeTrends !== false && trends.length > 0) {
      sections.push("MARKET TRENDS (Last 6 Months):")
      const recentTrends = trends.slice(0, 6).reverse()
      for (const trend of recentTrends) {
        sections.push(
          `- ${trend.month}: ${trend.transactionCount} transactions, volume ${formatCurrency(trend.totalVolume)}`
        )
      }
      sections.push("")
    }

    // DLD vs Portal comparisons (opportunity detection)
    if (options?.includeComparisons !== false && comparisons.length > 0) {
      sections.push("MARKET VS ASKING PRICE ANALYSIS:")
      sections.push("(Comparing DLD transaction prices with current portal listings)")
      sections.push("")

      const opportunities = comparisons.filter(c => c.hasOpportunity)
      const overpriced = comparisons.filter(c => c.premiumPct > 5)

      if (opportunities.length > 0) {
        sections.push("OPPORTUNITY AREAS (Asking below market):")
        for (const opp of opportunities.slice(0, 5)) {
          sections.push(
            `- ${opp.areaName}: ${Math.abs(opp.premiumPct).toFixed(1)}% below market (DLD: ${formatCurrency(opp.dldAvgPrice)}, Asking: ${formatCurrency(opp.portalAvgPrice)})`
          )
        }
        sections.push("")
      }

      if (overpriced.length > 0) {
        sections.push("PREMIUM AREAS (Asking above market):")
        for (const premium of overpriced.slice(0, 5)) {
          sections.push(
            `- ${premium.areaName}: +${premium.premiumPct.toFixed(1)}% premium (DLD: ${formatCurrency(premium.dldAvgPrice)}, Asking: ${formatCurrency(premium.portalAvgPrice)})`
          )
        }
        sections.push("")
      }
    }

    // Investment insights
    sections.push("INVESTMENT INSIGHTS:")
    
    // Find highest yield areas (lower price per sqm often = higher yield)
    const sortedByValue = [...areaStats].sort((a, b) => a.avgPricePerSqm - b.avgPricePerSqm)
    if (sortedByValue.length > 0) {
      sections.push("- Value areas (lower price/sqm, potential higher yields):")
      for (const area of sortedByValue.slice(0, 3)) {
        sections.push(`  - ${area.areaName}: ${formatCurrency(area.avgPricePerSqm)}/sqm`)
      }
    }

    // Find growth areas
    const growthAreas = areaStats.filter(a => a.yoyChangePct > 5).sort((a, b) => b.yoyChangePct - a.yoyChangePct)
    if (growthAreas.length > 0) {
      sections.push("- High growth areas (>5% YoY appreciation):")
      for (const area of growthAreas.slice(0, 3)) {
        sections.push(`  - ${area.areaName}: +${area.yoyChangePct.toFixed(1)}% YoY`)
      }
    }

    sections.push("")
    sections.push("Note: Use this market intelligence to compare specific properties against area benchmarks.")

  } catch (error) {
    console.error("[buildMarketContextAsync] Error building market context:", error)
    sections.push("MARKET CONTEXT:")
    sections.push("- Unable to fetch live market data")
    sections.push("- Dubai real estate market remains active with strong rental yields (7-10%)")
  }

  return sections.join("\n")
}

/**
 * Enhanced buildAIContext that includes real market data
 */
export async function buildAIContextWithMarket(options: AIContextOptions & {
  marketAreas?: string[]
}): Promise<AIContext> {
  // Get base context
  const context = await buildAIContext(options)

  // If market data requested, append real market intelligence
  if (options.includeMarket) {
    const marketContext = await buildMarketContextAsync({
      areas: options.marketAreas,
      includeComparisons: true,
      includeTrends: true,
    })

    context.contextText = context.contextText + "\n\n" + marketContext
  }

  return context
}

