export interface IntakeReportKeyValue {
  label: string
  value: string
}

export interface IntakeReportSection {
  title: string
  body?: string
  bullets?: string[]
  keyValues?: IntakeReportKeyValue[]
}

export interface IntakeReportFactors {
  mandateFit?: number
  marketTiming?: number
  portfolioFit?: number
  riskAlignment?: number
}

/* ------------------------------------------------------------------ */
/*  Cash-flow table (Feedback #1)                                      */
/* ------------------------------------------------------------------ */

export interface CashFlowRow {
  year: number
  grossRent: number
  expenses: number
  mortgagePayment: number
  netCashFlow: number
  propertyValue: number
  cumulativeReturn: number
}

export interface CashFlowTable {
  rows: CashFlowRow[]
  exitProceeds: number       // net sale proceeds after mortgage payoff
  totalProfit: number        // total return over hold period
  holdPeriod: number
}

/* ------------------------------------------------------------------ */
/*  Operating expenses breakdown (Feedback #2)                         */
/* ------------------------------------------------------------------ */

export interface OperatingExpenses {
  serviceCharge: number      // annual AED
  managementFee: number      // annual AED (% of rent)
  maintenanceReserve: number // annual AED
  insurance: number          // annual AED
  totalAnnual: number        // sum of above
  grossRent: number          // for context
  netRent: number            // grossRent − totalAnnual
  serviceChargePerSqft?: number  // AED/sqft if known
  notes?: string             // e.g. "Service charge estimated from area average"
}

/* ------------------------------------------------------------------ */
/*  Scenario analysis (Feedback #3)                                    */
/* ------------------------------------------------------------------ */

export interface ScenarioRow {
  label: string              // "Upside" | "Base" | "Downside"
  annualRent: number
  occupancy: number          // percentage
  exitPrice: number
  fiveYearIrr: number
  netProfit: number
}

/* ------------------------------------------------------------------ */
/*  Enhanced comparables (Feedback #4)                                 */
/* ------------------------------------------------------------------ */

export interface ComparableTransaction {
  name: string
  distance: string
  price: number
  pricePerSqft: number
  size?: string
  date: string
  source?: string            // "DLD" | "AI" | "Manual"
  type?: "sale" | "rental"
  annualRent?: number        // for rental comps
  note?: string
}

/* ------------------------------------------------------------------ */
/*  Main payload                                                       */
/* ------------------------------------------------------------------ */

export interface IntakeReportPayload {
  title: string
  subtitle?: string
  generatedAt?: string
  score?: string
  recommendation?: string
  summary?: string
  coverImageUrl?: string
  galleryImageUrls?: string[]
  mapImageUrl?: string
  floorPlanImageUrls?: string[]
  factors?: IntakeReportFactors
  sections: IntakeReportSection[]

  /** Structured data for enhanced PDF sections */
  cashFlowTable?: CashFlowTable
  operatingExpenses?: OperatingExpenses
  scenarios?: ScenarioRow[]
  comparables?: ComparableTransaction[]
}
