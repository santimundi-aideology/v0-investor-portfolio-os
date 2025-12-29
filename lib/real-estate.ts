import { addMonths, differenceInMonths } from "date-fns"

import { mockInvestors, mockProperties } from "@/lib/mock-data"

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
    purchasePrice: 11200000,
    purchaseDate: "2024-05-15",
    currentValue: 12150000,
    monthlyRent: 102000,
    occupancyRate: 0.92,
    annualExpenses: 260000,
  },
  // Another investor, for internal views
  {
    id: "hold-3",
    investorId: "inv-2",
    propertyId: "prop-3",
    purchasePrice: 4300000,
    purchaseDate: "2024-08-10",
    currentValue: 4620000,
    monthlyRent: 26500,
    occupancyRate: 0.88,
    annualExpenses: 60000,
  },
]

export const mockMarketData: MarketData[] = [
  {
    location: "Dubai Marina",
    trend: [
      { month: "2024-01", index: 100 },
      { month: "2024-04", index: 102 },
      { month: "2024-07", index: 105 },
      { month: "2024-10", index: 108 },
      { month: "2025-01", index: 110 },
    ],
    avgYieldPct: 8.9,
    avgYoYAppreciationPct: 6.4,
    occupancyPct: 93,
  },
  {
    location: "Downtown Dubai",
    trend: [
      { month: "2024-01", index: 100 },
      { month: "2024-04", index: 101 },
      { month: "2024-07", index: 104 },
      { month: "2024-10", index: 107 },
      { month: "2025-01", index: 109 },
    ],
    avgYieldPct: 9.6,
    avgYoYAppreciationPct: 5.7,
    occupancyPct: 91,
  },
  {
    location: "Business Bay",
    trend: [
      { month: "2024-01", index: 100 },
      { month: "2024-04", index: 101 },
      { month: "2024-07", index: 103 },
      { month: "2024-10", index: 106 },
      { month: "2025-01", index: 108 },
    ],
    avgYieldPct: 9.1,
    avgYoYAppreciationPct: 5.2,
    occupancyPct: 90,
  },
]

export function formatAED(value: number) {
  return `AED ${Math.round(value).toLocaleString()}`
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
  if (holding.currentValue <= 0) return 0
  return (calcAnnualNetRent(holding) / holding.currentValue) * 100
}

export function calcAppreciationPct(holding: PropertyHolding) {
  if (holding.purchasePrice <= 0) return 0
  return ((holding.currentValue - holding.purchasePrice) / holding.purchasePrice) * 100
}

export function calcIncomeToDate(holding: PropertyHolding, asOf = new Date()) {
  const months = Math.max(0, differenceInMonths(asOf, new Date(holding.purchaseDate)))
  const gross = holding.monthlyRent * months * holding.occupancyRate
  const monthlyExpenses = holding.annualExpenses / 12
  const net = gross - monthlyExpenses * months
  return { months, gross, net }
}

export function forecastMonthlyNetIncome(
  holding: PropertyHolding,
  monthsAhead = 12,
  rentGrowthMonthlyPct = 0.0025,
) {
  const monthlyExpenses = holding.annualExpenses / 12
  const points: { month: string; net: number; gross: number }[] = []
  const start = new Date()
  let rent = holding.monthlyRent
  for (let i = 0; i < monthsAhead; i++) {
    const d = addMonths(start, i)
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const gross = rent * holding.occupancyRate
    const net = gross - monthlyExpenses
    points.push({ month, net, gross })
    rent = rent * (1 + rentGrowthMonthlyPct)
  }
  return points
}

export function getPortfolioSummary(investorId: string) {
  const holdings = getHoldingsForInvestor(investorId)
  const totalPortfolioValue = holdings.reduce((acc, h) => acc + h.currentValue, 0)
  const totalPurchaseCost = holdings.reduce((acc, h) => acc + h.purchasePrice, 0)
  const totalMonthlyRental = holdings.reduce((acc, h) => acc + h.monthlyRent * h.occupancyRate, 0)
  const totalAnnualNetRent = holdings.reduce((acc, h) => acc + calcAnnualNetRent(h), 0)
  const avgYield = totalPortfolioValue > 0 ? (totalAnnualNetRent / totalPortfolioValue) * 100 : 0
  const occupancyRate =
    holdings.length > 0 ? (holdings.reduce((acc, h) => acc + h.occupancyRate, 0) / holdings.length) * 100 : 0
  const appreciationPct = totalPurchaseCost > 0 ? ((totalPortfolioValue - totalPurchaseCost) / totalPurchaseCost) * 100 : 0

  return {
    holdings,
    totalPortfolioValue,
    totalPurchaseCost,
    appreciationPct,
    totalMonthlyRental,
    totalAnnualNetRent,
    avgYieldPct: avgYield,
    occupancyPct: occupancyRate,
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


