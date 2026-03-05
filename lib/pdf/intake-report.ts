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
/*  Cash-flow table                                                     */
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
  exitProceeds: number
  totalProfit: number
  holdPeriod: number
}

/* ------------------------------------------------------------------ */
/*  Operating expenses breakdown                                        */
/* ------------------------------------------------------------------ */

export interface OperatingExpenses {
  serviceCharge: number
  managementFee: number
  maintenanceReserve: number
  insurance: number
  totalAnnual: number
  grossRent: number
  netRent: number
  serviceChargePerSqft?: number
  notes?: string
}

/* ------------------------------------------------------------------ */
/*  Scenario analysis                                                   */
/* ------------------------------------------------------------------ */

export interface ScenarioRow {
  label: string
  annualRent: number
  occupancy: number
  exitPrice: number
  fiveYearIrr: number
  netProfit: number
}

/* ------------------------------------------------------------------ */
/*  Comparable transactions                                             */
/* ------------------------------------------------------------------ */

export interface ComparableTransaction {
  name: string
  distance: string
  price: number
  pricePerSqft: number
  size?: string
  date: string
  /** "DLD" | "Listed" | "Developer" | "AI" | "Agent" */
  source?: string
  /** Full label for provenance badge */
  provenanceLabel?: string
  type?: "sale" | "rental"
  annualRent?: number
  note?: string
}

/* ------------------------------------------------------------------ */
/*  New: Location narrative                                             */
/* ------------------------------------------------------------------ */

export interface AmenityItem {
  name: string
  status: "operational" | "under_construction" | "planned"
}

export interface AmenityCategory {
  category: string
  items: AmenityItem[]
}

export interface ConnectivityRow {
  destination: string
  distance: string
  driveTime: string
}

export interface LocationNarrative {
  /** ~250 words prose — what is this district, development stage, honest feel */
  areaOverview: string
  /** ~200 words prose — primary growth driver, scale, timeline, caveats */
  growthCatalyst: string
  amenities: AmenityCategory[]
  /** Things NOT in the area yet — minimum 3 items */
  missingAmenities: string[]
  connectivity: ConnectivityRow[]
}

/* ------------------------------------------------------------------ */
/*  New: Enhanced developer profile                                     */
/* ------------------------------------------------------------------ */

export interface EnhancedDeveloperProfile {
  /** NEVER "Unknown Developer". Unresolved → "Unverified Developer" */
  name: string
  legalName: string
  tier: "tier_1" | "tier_2" | "tier_3" | "unverified"
  /** Human-readable tier label */
  tierLabel: string
  founded?: string
  listingStatus: "public" | "private" | "unknown"
  exchange?: string
  marketCap?: string
  unitsDelivered?: string
  notableProjects: string[]
  deliveryTrackRecord: "on_time" | "mixed" | "delayed" | "unknown"
  buildQuality: "premium" | "good" | "average" | "poor" | "unknown"
  /** Analytical 2-paragraph overview — no marketing copy */
  overview: string
  /** 1-paragraph risk assessment specific to this investment */
  riskAssessment: string
  concerns: string[]
  escrowStatus: string
}

/* ------------------------------------------------------------------ */
/*  New: Risk matrix                                                    */
/* ------------------------------------------------------------------ */

export interface RiskMatrixEntry {
  /** NEVER "undefined" */
  name: string
  category: "Market" | "Execution" | "Regulatory" | "Financial" | "Environmental"
  /** 1–5 */
  likelihood: number
  /** 1–5 */
  impact: number
  /** likelihood × impact */
  score: number
  scoreBand: "Low" | "Medium" | "High" | "Critical"
  /** 1–2 sentence specific mitigation */
  mitigation: string
}

/* ------------------------------------------------------------------ */
/*  New: Stress tests                                                   */
/* ------------------------------------------------------------------ */

export interface StressTestScenario {
  label: string
  description: string
  impact: string
  quantifiedEffect: string
}

/* ------------------------------------------------------------------ */
/*  New: Neighborhood benchmarks                                        */
/* ------------------------------------------------------------------ */

export interface NeighborhoodBenchmark {
  community: string
  priceRange: string
  maturity: "Fully mature" | "Maturing" | "Early stage" | "Pre-launch"
  hasMetro: boolean
  character: string
  isSubject?: boolean
}

/* ------------------------------------------------------------------ */
/*  New: Data gaps                                                      */
/* ------------------------------------------------------------------ */

export interface DataGap {
  field: string
  status: "verified" | "assumed" | "unverified" | "missing"
  detail?: string
}

/* ------------------------------------------------------------------ */
/*  New: Scoring methodology                                            */
/* ------------------------------------------------------------------ */

export interface ScoringDimension {
  name: string
  weight: string
  description: string
}

export interface ScoreBand {
  range: string
  label: string
  action: string
}

export interface ScoringMethodology {
  dimensions: ScoringDimension[]
  bands: ScoreBand[]
  keyFactorsUp: string[]
  keyFactorsDown: string[]
}

/* ------------------------------------------------------------------ */
/*  Main payload                                                        */
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

  /* ---- New narrative-rich fields ---- */
  locationNarrative?: LocationNarrative
  developerProfileEnhanced?: EnhancedDeveloperProfile
  riskMatrix?: RiskMatrixEntry[]
  stressTests?: StressTestScenario[]
  neighborhoodBenchmarks?: NeighborhoodBenchmark[]
  dataGaps?: DataGap[]
  scoringMethodology?: ScoringMethodology
  executionSteps?: string[]
  /** 2-3 paragraph plain-English thesis for non-specialist readers */
  plainEnglishThesis?: string
}
