import { addMonths, differenceInMonths } from "date-fns"

import { mockInvestors, mockProperties } from "@/lib/mock-data"
import type { Counterfactual, RecommendationBundle, Mandate, Property } from "@/lib/types"

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

export const mockHoldings: PropertyHolding[] = [
  // Investor inv-1 (external persona defaults to this)
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

export function getHoldingsForInvestor(investorId: string) {
  return mockHoldings.filter((h) => h.investorId === investorId)
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

export function getPortfolioSummary(investorId: string) {
  const holdings = getHoldingsForInvestor(investorId)
  const totalPortfolioValue = holdings.reduce((sum, h) => sum + h.currentValue, 0)
  const totalPurchasePrice = holdings.reduce((sum, h) => sum + h.purchasePrice, 0)
  const totalMonthlyRental = holdings.reduce((sum, h) => sum + forecastMonthlyNetIncome(h), 0)
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
    if (p.price > actualBudget.max) {
      passesAll = false
      const overBy = p.price - actualBudget.max
      reasonCodes.push("over_budget")
      reasonLabels.push(`Over budget by AED ${(overBy / 1000).toFixed(0)}k`)
      violatedConstraints.push({
        key: "budget_max",
        expected: actualBudget.max,
        actual: p.price,
      })
      whatWouldChange.push(`If price < AED ${(actualBudget.max / 1000000).toFixed(1)}M`)
    } else if (p.price < actualBudget.min) {
      reasonCodes.push("under_budget_min")
      reasonLabels.push(`Below minimum investment threshold`)
      violatedConstraints.push({
        key: "budget_min",
        expected: actualBudget.min,
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
