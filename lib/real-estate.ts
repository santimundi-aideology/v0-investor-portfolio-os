import { addMonths, differenceInMonths } from "date-fns"

import { mockInvestors, mockProperties } from "@/lib/mock-data"
import type { Counterfactual, RecommendationBundle, Mandate, Property } from "@/lib/types"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { getHoldingsByInvestor, type PropertyHolding as DbPropertyHolding } from "@/lib/db/holdings"
import { getInvestorById as getInvestorByIdDb } from "@/lib/db/investors"
import { listListings } from "@/lib/db/listings"

export type PropertyHolding = {
  id: string
  investorId: string
  propertyId: string
  purchasePrice: number
  purchaseDate: string // yyyy-mm-dd
  currentValue: number
  monthlyRent: number
  occupancyRate: number // 0..1
  annualExpenses: number
}

export type MarketTrendPoint = {
  month: string // yyyy-mm
  index: number // 100 baseline
}

export type MarketData = {
  location: string
  trend: MarketTrendPoint[]
  avgYieldPct: number
  avgYoYAppreciationPct: number
  occupancyPct: number
}

export type PortfolioOpportunity = {
  propertyId: string
  score: number
  reasons: string[]
}

/**
 * Fallback mock holdings - used when database is unavailable
 */
export const mockHoldings: PropertyHolding[] = [
  {
    id: "hold-1",
    investorId: "inv-1",
    propertyId: "prop-1",
    purchasePrice: 8200000,
    purchaseDate: "2024-02-01",
    currentValue: 8800000,
    monthlyRent: 78000,
    occupancyRate: 0.96,
    annualExpenses: 210000,
  },
  {
    id: "hold-2",
    investorId: "inv-1",
    propertyId: "prop-2",
    purchasePrice: 11500000,
    purchaseDate: "2024-01-15",
    currentValue: 12000000,
    monthlyRent: 112000,
    occupancyRate: 0.98,
    annualExpenses: 280000,
  },
]

/**
 * Fetch market data from DLD area stats - real database
 */
export async function getMarketDataFromDb(): Promise<MarketData[]> {
  try {
    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase
      .from("dld_area_stats")
      .select("*")
      .gt("transaction_count", 10)
      .order("transaction_count", { ascending: false })
      .limit(20)
    
    if (error || !data) {
      console.warn("[real-estate] Error fetching market data:", error?.message)
      return mockMarketData
    }

    return data.map(row => ({
      location: row.area_name_en || "Unknown",
      trend: [], // Would need historical data for trends
      avgYieldPct: 8.0, // Default - would calculate from holdings
      avgYoYAppreciationPct: row.yoy_change_pct || 0,
      occupancyPct: 92, // Default - would need occupancy data
    }))
  } catch (err) {
    console.warn("[real-estate] Error fetching market data:", err)
    return mockMarketData
  }
}

/**
 * Fallback market data when DB is unavailable
 */
export const mockMarketData: MarketData[] = [
  {
    location: "Dubai Marina",
    trend: [
      { month: "2024-01", index: 100 },
      { month: "2024-02", index: 102 },
      { month: "2024-03", index: 104 },
      { month: "2024-04", index: 105 },
      { month: "2024-05", index: 107 },
      { month: "2024-06", index: 108 },
    ],
    avgYieldPct: 8.5,
    avgYoYAppreciationPct: 5.2,
    occupancyPct: 94,
  },
  {
    location: "Downtown Dubai",
    trend: [
      { month: "2024-01", index: 100 },
      { month: "2024-02", index: 101 },
      { month: "2024-03", index: 103 },
      { month: "2024-04", index: 104 },
      { month: "2024-05", index: 106 },
      { month: "2024-06", index: 107 },
    ],
    avgYieldPct: 7.8,
    avgYoYAppreciationPct: 4.8,
    occupancyPct: 96,
  },
  {
    location: "Business Bay",
    trend: [
      { month: "2024-01", index: 100 },
      { month: "2024-02", index: 102 },
      { month: "2024-03", index: 104 },
      { month: "2024-04", index: 106 },
      { month: "2024-05", index: 108 },
      { month: "2024-06", index: 110 },
    ],
    avgYieldPct: 9.2,
    avgYoYAppreciationPct: 6.1,
    occupancyPct: 92,
  },
]

export function formatAED(value: number) {
  const safe = typeof value === "number" && Number.isFinite(value) ? value : 0
  return `AED ${safe.toLocaleString()}`
}

/**
 * Get holdings for investor - async version using database
 */
export async function getHoldingsForInvestorAsync(investorId: string): Promise<PropertyHolding[]> {
  try {
    const dbHoldings = await getHoldingsByInvestor(investorId)
    
    if (dbHoldings.length === 0) {
      // Fallback to mock data if no DB records
      return mockHoldings.filter((h) => h.investorId === investorId)
    }
    
    // Map DB holdings to PropertyHolding type
    return dbHoldings.map(h => ({
      id: h.id,
      investorId: h.investorId,
      propertyId: h.listingId, // DB uses listingId
      purchasePrice: h.purchasePrice,
      purchaseDate: h.purchaseDate,
      currentValue: h.currentValue,
      monthlyRent: h.monthlyRent,
      occupancyRate: h.occupancyRate,
      annualExpenses: h.annualExpenses,
    }))
  } catch (err) {
    console.warn("[real-estate] Error fetching holdings, using mock:", err)
    return mockHoldings.filter((h) => h.investorId === investorId)
  }
}

/**
 * Synchronous version - uses mock data (for backward compatibility)
 * @deprecated Use getHoldingsForInvestorAsync instead
 */
export function getHoldingsForInvestor(investorId: string) {
  return mockHoldings.filter((h) => h.investorId === investorId)
}

/**
 * Get property associated with a holding - async version
 */
export async function getHoldingPropertyAsync(holding: PropertyHolding): Promise<Property | null> {
  try {
    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase
      .from("listings")
      .select("*")
      .eq("id", holding.propertyId)
      .maybeSingle()
    
    if (error || !data) {
      return mockProperties.find((p) => p.id === holding.propertyId) ?? null
    }
    
    // Map DB listing to Property type
    return {
      id: data.id,
      title: data.title || "Unknown Property",
      area: data.area || "Dubai",
      type: data.type || "apartment",
      unitType: data.type || "apartment",
      price: data.price || 0,
      size: data.size || 0,
      bedrooms: data.bedrooms || 0,
      status: data.status || "available",
      source: { type: "developer", name: data.developer },
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    } as Property
  } catch (err) {
    console.warn("[real-estate] Error fetching property:", err)
    return mockProperties.find((p) => p.id === holding.propertyId) ?? null
  }
}

export function getHoldingProperty(holding: PropertyHolding) {
  return mockProperties.find((p) => p.id === holding.propertyId) ?? null
}

export function calcAnnualGrossRent(holding: PropertyHolding) {
  return holding.monthlyRent * 12 * holding.occupancyRate
}

export function calcAnnualNetRent(holding: PropertyHolding) {
  return calcAnnualGrossRent(holding) - holding.annualExpenses
}

export function calcYieldPct(holding: PropertyHolding) {
  const netRent = calcAnnualNetRent(holding)
  return (netRent / holding.currentValue) * 100
}

export function calcAppreciationPct(holding: PropertyHolding) {
  return ((holding.currentValue - holding.purchasePrice) / holding.purchasePrice) * 100
}

export function calcIncomeToDate(holding: PropertyHolding, asOf = new Date()) {
  const purchaseDate = new Date(holding.purchaseDate)
  const monthsHeld = differenceInMonths(asOf, purchaseDate)
  const monthlyNet = calcAnnualNetRent(holding) / 12
  return {
    net: monthlyNet * monthsHeld,
    months: monthsHeld,
  }
}

export function forecastMonthlyNetIncome(
  holding: PropertyHolding,
  monthsAhead = 12,
  occupancyRateOverride?: number,
) {
  const occupancy = occupancyRateOverride ?? holding.occupancyRate
  const monthlyGross = holding.monthlyRent * occupancy
  const monthlyExpenses = holding.annualExpenses / 12
  const monthlyNet = monthlyGross - monthlyExpenses
  const points: { month: string; net: number; gross: number }[] = []
  for (let i = 0; i < monthsAhead; i++) {
    const monthDate = addMonths(new Date(), i)
    const month = monthDate.toISOString().slice(0, 7)
    points.push({
      month,
      net: monthlyNet,
      gross: monthlyGross,
    })
  }
  return points
}

/**
 * Get portfolio summary - async version using database
 */
export async function getPortfolioSummaryAsync(investorId: string) {
  const holdings = await getHoldingsForInvestorAsync(investorId)
  const totalPortfolioValue = holdings.reduce((sum, h) => sum + h.currentValue, 0)
  const totalPurchasePrice = holdings.reduce((sum, h) => sum + h.purchasePrice, 0)
  
  // Calculate net monthly income for each holding
  const monthlyNets = holdings.map(h => {
    const grossMonthly = h.monthlyRent * h.occupancyRate
    const monthlyExpenses = h.annualExpenses / 12
    return grossMonthly - monthlyExpenses
  })
  const totalMonthlyRental = monthlyNets.reduce((sum, net) => sum + net, 0)
  const totalAnnualRental = totalMonthlyRental * 12
  const avgYieldPct = holdings.length > 0 ? holdings.reduce((sum, h) => sum + calcYieldPct(h), 0) / holdings.length : 0
  const avgOccupancyPct =
    holdings.length > 0 ? holdings.reduce((sum, h) => sum + h.occupancyRate * 100, 0) / holdings.length : 0
  const appreciationPct =
    totalPurchasePrice > 0 ? ((totalPortfolioValue - totalPurchasePrice) / totalPurchasePrice) * 100 : 0

  return {
    holdings,
    totalPortfolioValue,
    totalPurchaseCost: totalPurchasePrice,
    totalMonthlyRental,
    totalAnnualRental,
    avgYieldPct,
    occupancyPct: avgOccupancyPct,
    appreciationPct,
    propertyCount: holdings.length,
  }
}

/**
 * Synchronous version - uses mock data
 * @deprecated Use getPortfolioSummaryAsync instead
 */
export function getPortfolioSummary(investorId: string) {
  const holdings = getHoldingsForInvestor(investorId)
  const totalPortfolioValue = holdings.reduce((sum, h) => sum + h.currentValue, 0)
  const totalPurchasePrice = holdings.reduce((sum, h) => sum + h.purchasePrice, 0)
  // Calculate net monthly income for each holding
  const totalMonthlyRental = holdings.reduce((sum, h) => {
    const grossMonthly = h.monthlyRent * h.occupancyRate
    const monthlyExpenses = h.annualExpenses / 12
    return sum + (grossMonthly - monthlyExpenses)
  }, 0)
  const totalAnnualRental = totalMonthlyRental * 12
  const avgYieldPct = holdings.length > 0 ? holdings.reduce((sum, h) => sum + calcYieldPct(h), 0) / holdings.length : 0
  const avgOccupancyPct =
    holdings.length > 0 ? holdings.reduce((sum, h) => sum + h.occupancyRate * 100, 0) / holdings.length : 0
  const appreciationPct =
    totalPurchasePrice > 0 ? ((totalPortfolioValue - totalPurchasePrice) / totalPurchasePrice) * 100 : 0

  return {
    holdings,
    totalPortfolioValue,
    totalPurchaseCost: totalPurchasePrice,
    totalMonthlyRental,
    totalAnnualRental,
    avgYieldPct,
    occupancyPct: avgOccupancyPct,
    appreciationPct,
    propertyCount: holdings.length,
  }
}

/**
 * Get opportunities for investor - async version using real DB data
 * Queries portal_listings and DLD data for opportunities matching investor mandate
 */
export async function getOpportunitiesForInvestorAsync(investorId: string): Promise<PortfolioOpportunity[]> {
  try {
    const supabase = getSupabaseAdminClient()
    
    // Get investor and their mandate from DB
    const investor = await getInvestorByIdDb(investorId)
    const mandate = investor?.mandate as Mandate | undefined
    
    // Get investor's current holdings
    const holdings = await getHoldingsForInvestorAsync(investorId)
    const ownedIds = new Set(holdings.map((h) => h.propertyId))
    
    // Query portal listings with good potential (Bayut data)
    const { data: portalListings, error: portalError } = await supabase
      .from("portal_listings")
      .select("*")
      .eq("is_active", true)
      .eq("listing_type", "sale")
      .order("asking_price", { ascending: true })
      .limit(50)
    
    if (portalError) {
      console.warn("[real-estate] Error fetching portal listings:", portalError.message)
    }
    
    // Also get DLD market signals for opportunities
    const { data: signals, error: signalError } = await supabase
      .from("dld_market_signals")
      .select("*")
      .eq("severity", "opportunity")
      .order("created_at", { ascending: false })
      .limit(20)
    
    if (signalError) {
      console.warn("[real-estate] Error fetching market signals:", signalError.message)
    }
    
    const opportunities: PortfolioOpportunity[] = []
    
    // Score portal listings
    if (portalListings) {
      for (const listing of portalListings) {
        if (ownedIds.has(listing.id)) continue
        
        // Check mandate filters
        if (mandate?.preferredAreas?.length) {
          const matchesArea = mandate.preferredAreas.some(area => 
            listing.area_name?.toLowerCase().includes(area.toLowerCase())
          )
          if (!matchesArea) continue
        }
        
        // Check price range
        const price = listing.asking_price || 0
        if (mandate?.minInvestment && price < mandate.minInvestment) continue
        if (mandate?.maxInvestment && price > mandate.maxInvestment) continue
        
        // Calculate score based on available data
        let score = 50 // Base score
        const reasons: string[] = []
        
        // Price per sqm analysis (compared to market average)
        const pricePerSqm = listing.price_per_sqm || 0
        if (pricePerSqm > 0 && pricePerSqm < 15000) {
          score += 15
          reasons.push("Below market price per sqm")
        }
        
        // Size bonus
        if (listing.size_sqm && listing.size_sqm > 100) {
          score += 10
          reasons.push("Good size property")
        }
        
        // Area match bonus
        if (mandate?.preferredAreas?.some(a => listing.area_name?.includes(a))) {
          score += 15
          reasons.push(`Matches preferred area (${listing.area_name})`)
        }
        
        // Type match bonus
        const propType = listing.property_type?.toLowerCase() || ""
        if (mandate?.propertyTypes?.some(t => propType.includes(t.toLowerCase()))) {
          score += 10
          reasons.push(`Matches mandate type (${listing.property_type})`)
        }
        
        if (reasons.length > 0) {
          opportunities.push({
            propertyId: listing.id,
            score: Math.round(score),
            reasons: reasons.slice(0, 3),
          })
        }
      }
    }
    
    // Add signal-based opportunities
    if (signals) {
      for (const signal of signals) {
        if (signal.area_name_en && !ownedIds.has(signal.id)) {
          opportunities.push({
            propertyId: signal.id,
            score: 75, // Market signals get high base score
            reasons: [
              `Market opportunity: ${signal.title || signal.type}`,
              signal.area_name_en,
            ],
          })
        }
      }
    }
    
    // Sort by score and return top 8
    return opportunities
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
    
  } catch (err) {
    console.warn("[real-estate] Error in getOpportunitiesForInvestorAsync:", err)
    // Fallback to sync version with mock data
    return getOpportunitiesForInvestor(investorId)
  }
}

/**
 * Synchronous version using mock data - for backward compatibility
 * @deprecated Use getOpportunitiesForInvestorAsync instead
 */
export function getOpportunitiesForInvestor(investorId: string): PortfolioOpportunity[] {
  const investor = mockInvestors.find((i) => i.id === investorId)
  const mandate = investor?.mandate
  const ownedIds = new Set(getHoldingsForInvestor(investorId).map((h) => h.propertyId))

  const candidates = mockProperties
    .filter((p) => !ownedIds.has(p.id))
    .filter((p) => (mandate?.preferredAreas?.length ? mandate.preferredAreas.includes(p.area) : true))

  return candidates
    .map((p) => {
      const score =
        (p.trustScore ?? 60) * 0.55 +
        (p.roi ?? 7) * 3.5 +
        (mandate?.propertyTypes?.includes(p.type) ? 10 : 0)

      const reasons: string[] = []
      if (p.trustScore && p.trustScore >= 85) reasons.push("High trust score")
      if (p.roi && p.roi >= 9) reasons.push("Strong yield")
      if (mandate?.preferredAreas?.includes(p.area)) reasons.push(`Matches preferred area (${p.area})`)
      if (mandate?.propertyTypes?.includes(p.type)) reasons.push(`Matches mandate type (${p.type})`)

      return { propertyId: p.id, score: Math.round(score), reasons: reasons.slice(0, 3) }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
}

/**
 * Build a recommendation bundle with both recommended properties and counterfactuals.
 * 
 * This function evaluates all candidate properties against the investor's mandate,
 * budget, portfolio constraints, and trust policies. Properties that pass thresholds
 * become recommendations; strong candidates that fail 1-2 constraints become counterfactuals.
 * 
 * TODO: Replace deterministic rule-based reason generation with real AI model outputs.
 * The reasonCodes should map to a finite set that can be traced back to model reasoning.
 */
export function buildRecommendationBundle({
  investorId,
  mandate,
  portfolioSnapshot,
  evaluatedCandidates,
  trustPolicy,
  budget,
}: {
  investorId: string
  mandate?: Mandate
  portfolioSnapshot?: { holdings: PropertyHolding[] }
  evaluatedCandidates?: Property[]
  trustPolicy?: { minTrustScore?: number; requireVerification?: boolean }
  budget?: { min?: number; max?: number }
}): RecommendationBundle {
  const investor = mockInvestors.find((i) => i.id === investorId)
  const actualMandate = mandate || investor?.mandate
  const actualPortfolio = portfolioSnapshot || { holdings: getHoldingsForInvestor(investorId) }
  const actualCandidates = evaluatedCandidates || mockProperties
  const actualTrustPolicy = trustPolicy || { minTrustScore: 70, requireVerification: false }
  const actualBudget = budget || {
    min: actualMandate?.minInvestment || 0,
    max: actualMandate?.maxInvestment || Infinity,
  }

  const ownedIds = new Set(actualPortfolio.holdings.map((h) => h.propertyId))
  const areaCounts = new Map<string, number>()
  actualPortfolio.holdings.forEach((h) => {
    const prop = mockProperties.find((p) => p.id === h.propertyId)
    if (prop?.area) {
      areaCounts.set(prop.area, (areaCounts.get(prop.area) || 0) + 1)
    }
  })

  // Evaluate all candidates
  const evaluated = actualCandidates
    .filter((p) => !ownedIds.has(p.id))
    .map((p) => {
      const score =
        (p.trustScore ?? 60) * 0.55 +
        (p.roi ?? 7) * 3.5 +
        (actualMandate?.propertyTypes?.includes(p.type) ? 10 : 0)

      const reasons: string[] = []
      if (p.trustScore && p.trustScore >= 85) reasons.push("High trust score")
      if (p.roi && p.roi >= 9) reasons.push("Strong yield")
      if (actualMandate?.preferredAreas?.includes(p.area)) reasons.push(`Matches preferred area (${p.area})`)
      if (actualMandate?.propertyTypes?.includes(p.type)) reasons.push(`Matches mandate type (${p.type})`)

      return {
        property: p,
        score: Math.round(score),
        reasons: reasons.slice(0, 3),
      }
    })
    .sort((a, b) => b.score - a.score)

  const recommended: PortfolioOpportunity[] = []
  const counterfactuals: Counterfactual[] = []

  // Determine yield target from mandate
  const yieldTarget = actualMandate?.yieldTarget
    ? parseFloat(actualMandate.yieldTarget.replace("%", "").split("-")[0])
    : 8.0

  for (const candidate of evaluated) {
    const p = candidate.property
    const reasonCodes: string[] = []
    const reasonLabels: string[] = []
    const violatedConstraints: Counterfactual["violatedConstraints"] = []
    const whatWouldChange: string[] = []

    // Check constraints
    let passesAll = true

    // Budget check
    const budgetMax = actualBudget.max ?? Infinity
    const budgetMin = actualBudget.min ?? 0
    if (p.price > budgetMax) {
      passesAll = false
      const overBy = p.price - budgetMax
      reasonCodes.push("over_budget")
      reasonLabels.push(`Over budget by AED ${(overBy / 1000).toFixed(0)}k`)
      violatedConstraints.push({
        key: "budget_max",
        expected: budgetMax,
        actual: p.price,
      })
      whatWouldChange.push(`If price < AED ${(budgetMax / 1000000).toFixed(1)}M`)
    } else if (p.price < budgetMin) {
      reasonCodes.push("under_budget_min")
      reasonLabels.push(`Below minimum investment threshold`)
      violatedConstraints.push({
        key: "budget_min",
        expected: budgetMin,
        actual: p.price,
      })
    }

    // Yield check
    if (p.roi && p.roi < yieldTarget) {
      passesAll = false
      const diff = yieldTarget - p.roi
      reasonCodes.push("yield_below_target")
      reasonLabels.push(`Yield below target by ${diff.toFixed(1)}%`)
      violatedConstraints.push({
        key: "yield_target",
        expected: yieldTarget,
        actual: p.roi,
      })
      whatWouldChange.push(`If yield >= ${yieldTarget}%`)
    }

    // Trust/verification check
    if (p.trustScore && p.trustScore < actualTrustPolicy.minTrustScore!) {
      passesAll = false
      reasonCodes.push("low_trust_score")
      reasonLabels.push(`Trust score below threshold (${p.trustScore} < ${actualTrustPolicy.minTrustScore})`)
      violatedConstraints.push({
        key: "trust_score",
        expected: actualTrustPolicy.minTrustScore,
        actual: p.trustScore,
      })
      whatWouldChange.push(`If trust score >= ${actualTrustPolicy.minTrustScore}`)
    }

    if (actualTrustPolicy.requireVerification && p.readinessStatus === "NEEDS_VERIFICATION") {
      passesAll = false
      reasonCodes.push("needs_verification")
      reasonLabels.push("Needs verification: portal source")
      violatedConstraints.push({
        key: "readiness_status",
        expected: "READY_FOR_MEMO",
        actual: p.readinessStatus,
      })
      whatWouldChange.push("If trust verified")
    }

    // Concentration risk
    const areaCount = areaCounts.get(p.area) || 0
    if (areaCount >= 2) {
      passesAll = false
      reasonCodes.push("concentration_risk")
      reasonLabels.push(`Concentration risk: already ${areaCount} assets in ${p.area}`)
      violatedConstraints.push({
        key: "area_concentration",
        expected: "< 2",
        actual: areaCount,
      })
    }

    // Area mismatch (soft constraint)
    if (actualMandate?.preferredAreas?.length && !actualMandate.preferredAreas.includes(p.area)) {
      reasonCodes.push("area_mismatch")
      reasonLabels.push(`Not in preferred area (${p.area})`)
    }

    // Type mismatch (soft constraint)
    if (actualMandate?.propertyTypes?.length && !actualMandate.propertyTypes.includes(p.type)) {
      reasonCodes.push("type_mismatch")
      reasonLabels.push(`Not preferred type (${p.type})`)
    }

    // Liquidity risk (mock: check if property has low comps)
    // In real implementation, this would check market data
    if (p.source?.type === "portal" && !p.trustScore) {
      reasonCodes.push("liquidity_risk")
      reasonLabels.push("Liquidity risk: limited comps in last 6 months")
    }

    if (passesAll && reasonCodes.length === 0) {
      // Recommended
      recommended.push({
        propertyId: p.id,
        score: candidate.score,
        reasons: candidate.reasons,
      })
    } else if (reasonCodes.length > 0 && reasonCodes.length <= 2 && candidate.score > 50) {
      // Counterfactual: failed 1-2 constraints but still strong candidate
      counterfactuals.push({
        propertyId: p.id,
        title: p.title,
        reasonCodes,
        reasonLabels,
        details: `This property scored ${candidate.score} but was excluded due to: ${reasonLabels.join(", ")}`,
        violatedConstraints,
        whatWouldChangeMyMind: whatWouldChange.length > 0 ? whatWouldChange : undefined,
        score: candidate.score,
      })
    }
  }

  // Limit recommendations to top 4-6
  const finalRecommended = recommended.slice(0, 6)
  const recommendedIds = new Set(finalRecommended.map((r) => r.propertyId))

  // Filter counterfactuals to exclude duplicates and limit to 3-10
  const finalCounterfactuals = counterfactuals
    .filter((c) => !recommendedIds.has(c.propertyId))
    .slice(0, 10)

  return {
    recommended: finalRecommended,
    counterfactuals: finalCounterfactuals,
    source: "ai_insight",
  }
}
