import "server-only"

import { getInvestorById } from "@/lib/db/investors"
import { listListings, getListingById } from "@/lib/db/listings"
import { getHoldingsByInvestor, getPortfolioSummary } from "@/lib/db/holdings"
import type { InvestorRecord, ListingRecord } from "@/lib/data/store"

export type AIContextOptions = {
  investorId: string
  tenantId: string
  includePortfolio?: boolean
  includeListings?: boolean
  includeMarket?: boolean
  propertyId?: string
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
 */
export async function buildAIContext(options: AIContextOptions): Promise<AIContext> {
  const {
    investorId,
    tenantId,
    includePortfolio = true,
    includeListings = false,
    includeMarket = false,
    propertyId,
  } = options

  // Fetch investor data
  const investor = await getInvestorById(investorId)

  // Build context components
  const context: AIContext = {
    investor,
    contextText: "",
  }

  // Fetch portfolio data if requested
  if (includePortfolio && investor) {
    const holdings = await getHoldingsByInvestor(investorId)
    const summary = await getPortfolioSummary(investorId)

    context.portfolio = {
      summary,
      holdings,
    }
  }

  // Fetch listings if requested
  if (includeListings) {
    const listings = await listListings(tenantId)
    context.listings = listings
  }

  // Fetch specific property if requested
  if (propertyId) {
    const property = await getListingById(propertyId)
    context.property = property
  }

  // Build context text
  context.contextText = buildContextText(context, includeMarket)

  return context
}

/**
 * Build formatted context text for AI agent
 */
function buildContextText(context: AIContext, includeMarket: boolean): string {
  const sections: string[] = []

  // Investor profile section
  if (context.investor) {
    sections.push("INVESTOR PROFILE:")
    sections.push(`- Name: ${context.investor.name}`)
    if (context.investor.company) {
      sections.push(`- Company: ${context.investor.company}`)
    }
    if (context.investor.mandate) {
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

  // Market context section (placeholder for future implementation)
  if (includeMarket) {
    sections.push("MARKET CONTEXT:")
    sections.push("- Dubai real estate shows resilient demand")
    sections.push("- Prime areas maintain strong rental yields (7-10%)")
    sections.push("- Average YoY appreciation: 4-6% across key zones")
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

  return contextMap[pagePath] || ""
}

