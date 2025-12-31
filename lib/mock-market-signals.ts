export type MarketSignalSourceType = "official" | "portal"

export type MarketSignalStatus = "new" | "acknowledged" | "dismissed" | "routed"

export type MarketSignalSeverity = "info" | "watch" | "urgent"

export type MarketSignalType =
  | "price_change"
  | "rent_change"
  | "yield_opportunity"
  | "supply_spike"
  | "discounting_spike"
  | "staleness_rise"
  | "risk_flag"

export type MarketSignalGeoType = "community" | "submarket" | "city"

export type MarketSignalMetric =
  | "median_price_psf"
  | "median_rent_annual"
  | "gross_yield"
  | "active_listings"
  | "price_cuts_count"
  | "stale_listings_count"

export type MarketSignalItem = {
  id: string
  createdAt: string // ISO

  sourceType: MarketSignalSourceType
  source: string
  timeframe: "QoQ" | "WoW"

  type: MarketSignalType
  severity: MarketSignalSeverity
  status: MarketSignalStatus

  geoType: MarketSignalGeoType
  geoId: string
  geoName: string
  segment: string

  metric: MarketSignalMetric
  metricLabel: string

  currentValue: number
  currentValueLabel: string
  prevValue?: number | null
  prevValueLabel?: string | null
  deltaValue?: number | null
  deltaPct?: number | null

  confidenceScore: number // 0..1
  investorMatches?: number
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString()
}

function hoursAgo(n: number) {
  return new Date(Date.now() - n * 60 * 60 * 1000).toISOString()
}

export const mockMarketSignals: MarketSignalItem[] = [
  {
    id: "ms-001",
    createdAt: hoursAgo(4),
    sourceType: "official",
    source: "DLD",
    timeframe: "QoQ",
    type: "yield_opportunity",
    severity: "watch",
    status: "new",
    geoType: "submarket",
    geoId: "business-bay",
    geoName: "Business Bay",
    segment: "Office",
    metric: "gross_yield",
    metricLabel: "Gross yield (median)",
    currentValue: 0.071,
    currentValueLabel: "7.1%",
    prevValue: 0.064,
    prevValueLabel: "6.4%",
    deltaValue: 0.007,
    deltaPct: 0.109,
    confidenceScore: 0.84,
    investorMatches: 3,
  },
  {
    id: "ms-002",
    createdAt: daysAgo(1),
    sourceType: "official",
    source: "RERA",
    timeframe: "QoQ",
    type: "price_change",
    severity: "info",
    status: "new",
    geoType: "community",
    geoId: "dubai-marina",
    geoName: "Dubai Marina",
    segment: "2BR",
    metric: "median_price_psf",
    metricLabel: "Median price (psf)",
    currentValue: 2050,
    currentValueLabel: "AED 2,050/psf",
    prevValue: 1955,
    prevValueLabel: "AED 1,955/psf",
    deltaValue: 95,
    deltaPct: 0.049,
    confidenceScore: 0.78,
    investorMatches: 2,
  },
  {
    id: "ms-003",
    createdAt: daysAgo(2),
    sourceType: "portal",
    source: "Bayut",
    timeframe: "WoW",
    type: "supply_spike",
    severity: "urgent",
    status: "new",
    geoType: "community",
    geoId: "jvc",
    geoName: "Jumeirah Village Circle",
    segment: "1BR",
    metric: "active_listings",
    metricLabel: "Active listings",
    currentValue: 120,
    currentValueLabel: "120 listings",
    prevValue: 102,
    prevValueLabel: "102 listings",
    deltaValue: 18,
    deltaPct: 0.176,
    confidenceScore: 0.7,
    investorMatches: 1,
  },
]

export function formatMarketSignalType(t: MarketSignalType) {
  switch (t) {
    case "price_change":
      return "Price change"
    case "rent_change":
      return "Rent change"
    case "yield_opportunity":
      return "Yield opportunity"
    case "supply_spike":
      return "Supply spike"
    case "discounting_spike":
      return "Discounting spike"
    case "staleness_rise":
      return "Staleness rise"
    case "risk_flag":
      return "Risk flag"
    default:
      return t
  }
}


