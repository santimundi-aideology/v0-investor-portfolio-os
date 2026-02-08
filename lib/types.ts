// Domain types for UAE Vantage

// Platform roles - aligned with RBAC system
export type PlatformRole = "agent" | "manager" | "investor" | "super_admin"

// Legacy role type for backward compatibility
export type UserRole = "owner" | "admin" | "realtor" | "investor"

// Map platform roles to legacy roles for UI compatibility
export const platformRoleToLegacy: Record<PlatformRole, UserRole> = {
  super_admin: "owner",
  manager: "admin",
  agent: "realtor",
  investor: "investor",
}

// Map legacy roles to platform roles
export const legacyToPlatformRole: Record<UserRole, PlatformRole> = {
  owner: "super_admin",
  admin: "manager",
  realtor: "agent",
  investor: "investor",
}

export interface User {
  id: string
  name: string
  email: string
  role: UserRole | PlatformRole
  avatar?: string
  phone?: string
  whatsapp?: string
  tenantId?: string
  isActive?: boolean
}

export interface Org {
  id: string
  name: string
  logo?: string
}

export interface Mandate {
  strategy: string
  investmentHorizon: string
  yieldTarget: string
  riskTolerance: "low" | "medium" | "high"
  preferredAreas: string[]
  propertyTypes: string[]
  minInvestment: number
  maxInvestment: number
  notes?: string
  
  // Enhanced mandate fields
  preferredBedrooms?: number[] // e.g., [1, 2] for 1BR and 2BR
  preferredViews?: string[] // e.g., ["sea", "city", "golf"]
  furnishedPreference?: "furnished" | "unfurnished" | "any"
  completionStatus?: "ready" | "off_plan" | "any"
  developerPreferences?: string[] // Preferred developers
  maxServiceCharge?: number // AED per sqft
  minSize?: number // sqft
  maxSize?: number // sqft
  tenantRequirements?: "vacant" | "tenanted" | "any"
  paymentPlanRequired?: boolean
  leverageAppetite?: "none" | "low" | "moderate" | "high" // Mortgage preference
  coInvestmentOpen?: boolean // Open to co-investment
  exclusiveDeals?: boolean // Only wants exclusive/off-market deals
  decisionTimeline?: "immediate" | "1-2_weeks" | "1_month" | "flexible"
  dueDiligenceLevel?: "light" | "standard" | "extensive"
}

export interface Investor {
  id: string
  name: string
  company: string
  email: string
  phone: string
  status: "active" | "pending" | "inactive"
  mandate?: Mandate
  createdAt: string
  lastContact: string
  totalDeals: number
  avatar?: string

  // --- Enriched profile (editable by internal roles) ---
  location?: string
  timezone?: string
  preferredContactMethod?: "whatsapp" | "email" | "phone"
  segment?: "family_office" | "hnwi" | "institutional" | "developer" | "other"
  aumAed?: number
  liquidityWindow?: "immediate" | "30-90d" | "90-180d" | "180d+"
  leadSource?: string
  tags?: string[]
  notes?: string
}

export type PropertyReadinessStatus = "DRAFT" | "NEEDS_VERIFICATION" | "READY_FOR_MEMO"
export type PropertySourceType = "developer" | "broker" | "portal" | "other"
export type PropertyIntakeSource = "manual" | "upload" | "portal_link" | "crm" | "developer_feed"
export type UnitType = "studio" | "1BR" | "2BR" | "3BR" | "4BR" | "5BR+" | "villa" | "townhouse" | "penthouse" | "office" | "retail" | "warehouse" | "land" | "other"

export interface PropertySource {
  type: PropertySourceType
  name?: string
  intakeSource: PropertyIntakeSource
  ingestedAt: string
  ingestedBy?: string
  originalFile?: string
  portalLink?: string
}

export interface PropertyIngestionHistory {
  id: string
  timestamp: string
  action: "created" | "updated" | "status_changed" | "source_changed"
  performedBy?: string
  details?: string
}

export interface PropertyImage {
  id: string
  url: string
  category: "exterior" | "interior" | "amenities" | "floor-plan" | "other"
  title?: string
  description?: string
  order?: number
}

export interface Property {
  id: string
  title: string
  address: string
  area: string
  type: "residential" | "commercial" | "mixed-use" | "land"
  status: "available" | "under-offer" | "sold" | "off-market"
  // New readiness status
  readinessStatus: PropertyReadinessStatus
  price: number
  size: number
  // Listing mode: sale vs rental
  listingType?: "sale" | "rent"
  // Rental management (only relevant when listingType === "rent")
  leaseStatus?: "listed" | "vacant" | "occupied"
  rentPaymentFrequency?: "monthly" | "quarterly" | "annually"
  securityDepositAed?: number
  furnished?: boolean
  tenantName?: string
  tenantEmail?: string
  tenantPhone?: string
  leaseStart?: string
  leaseEnd?: string
  // New fields for intake
  unitType?: UnitType
  floor?: number
  view?: string
  parking?: number
  paymentPlan?: string
  notes?: string
  currency?: string
  // Source and ingestion tracking
  source?: PropertySource
  ingestionHistory?: PropertyIngestionHistory[]
  bedrooms?: number
  bathrooms?: number
  yearBuilt?: number
  roi?: number
  trustScore?: number
  imageUrl?: string // Legacy: primary/main image
  images?: PropertyImage[] // New: array of images with categories
  description?: string
  features?: string[]
  risks?: string[]
  createdAt: string
  updatedAt?: string
  
  // Price contrast data (DLD truth vs asking price)
  priceContrast?: PriceContrast
}

/**
 * Price contrast data comparing asking price to DLD market truth
 */
export interface PriceContrast {
  // DLD market data
  dldMedianPrice?: number           // Median sale price from DLD
  dldMedianPricePerSqft?: number    // Median price per sqft from DLD
  dldSampleSize?: number            // Number of DLD transactions used
  dldQuarter?: string               // e.g., "Q4 2025"
  dldDataDate?: string              // YYYY-MM-DD of DLD data
  
  // Comparison metrics
  priceVsTruthPct?: number          // +0.15 = 15% above market, -0.10 = 10% below
  pricePerSqftVsTruthPct?: number   // Same for price per sqft
  
  // Assessment
  assessment?: 'underpriced' | 'fair' | 'overpriced'
  assessmentLabel?: string          // "15% above market"
  
  // Rental yield estimate (if rent data available)
  estimatedRentAnnual?: number
  estimatedGrossYield?: number      // rent / price
  
  // Confidence
  confidence?: 'high' | 'medium' | 'low'
  confidenceReason?: string
}

export interface ShortlistItem {
  id: string
  investorId: string
  propertyId: string
  property: Property
  score: number
  status: "pending" | "presented" | "interested" | "rejected" | "under-offer"
  notes?: string
  addedAt: string
}

/**
 * Counterfactual: A property evaluated but NOT recommended, with clear exclusion reasons.
 * Used in realtor recommendation workflow to show why certain properties were excluded.
 */
export interface Counterfactual {
  propertyId: string
  title: string
  reasonCodes: string[] // Machine-friendly codes (e.g., "yield_below_target", "over_budget")
  reasonLabels: string[] // Human-friendly labels (e.g., "Yield below target by 0.8%")
  details?: string
  violatedConstraints?: {
    key: string
    expected?: unknown
    actual?: unknown
  }[]
  whatWouldChangeMyMind?: string[] // Optional suggestions (e.g., "If price < AED 4.2M")
  score?: number
}

export interface RecommendationBundle {
  recommended: PortfolioOpportunity[]
  counterfactuals: Counterfactual[]
  source: "manual" | "ai_insight" | "nlp_query"
}

// --- Realtor Recommendations (internal CRM views) ---
export type RecommendationStatus =
  | "DRAFT"
  | "SENT"
  | "VIEWED"
  | "QUESTIONS"
  | "APPROVED"
  | "REJECTED"
  | "SUPERSEDED"

export type RecommendationTrigger = "manual" | "ai_insight" | "nlp_query"

export type RecommendationQna = {
  id: string
  question: string
  askedAt: string
  askedBy: "investor"
  draftAnswer?: string
  finalAnswer?: string
  answeredAt?: string
  answeredBy?: "realtor"
}

export type RecommendationDecision = {
  outcome: "APPROVED" | "REJECTED"
  decidedAt: string
  reasonTags?: string[]
  note?: string
}

export type RecommendationActivity = {
  at: string
  type: string
  label: string
  meta?: Record<string, unknown>
}

export type RecommendationPropertyNote = {
  includedDespite?: string
  rationale?: string
}

export interface Recommendation {
  id: string
  investorId: string
  createdByRole: "realtor" | "owner" | "admin"
  title: string
  summary: string
  status: RecommendationStatus
  trigger: RecommendationTrigger
  createdAt: string
  updatedAt: string
  sentAt?: string
  lastActivityAt?: string
  propertyIds: string[]
  counterfactuals: Counterfactual[]
  propertyNotes?: Record<string, RecommendationPropertyNote>
  qna: RecommendationQna[]
  decision?: RecommendationDecision
  activity: RecommendationActivity[]
  supersededById?: string
}

export interface MemoAnalysisMetric {
  label: string
  value: string
  trend?: string
}

export interface MemoAnalysisComparable {
  name: string
  distance: string
  size: string
  closingDate: string
  price: number
  pricePerSqft: number
  note?: string
}

export interface MemoAnalysis {
  summary: string
  keyPoints?: string[]
  neighborhood?: {
    name: string
    grade: string
    profile: string
    highlights: string[]
    metrics: MemoAnalysisMetric[]
  }
  property?: {
    description: string
    condition: string
    specs: { label: string; value: string }[]
    highlights: string[]
  }
  market?: {
    overview: string
    drivers: string[]
    supply?: string
    demand?: string
    absorption?: string
  }
  pricing?: {
    askingPrice: number
    pricePerSqft: number
    marketAvgPricePerSqft?: number
    recommendedOffer: number
    valueAddBudget?: number
    stabilizedValue?: number
    rentCurrent?: number
    rentPotential?: number
    irr?: number
    equityMultiple?: number
  }
  comparables?: MemoAnalysisComparable[]
  strategy?: {
    plan: string
    holdPeriod: string
    exit: string
    focusPoints: string[]
  }
}

export interface Memo {
  id: string
  title: string
  investorId: string
  investorName: string
  propertyId: string
  propertyTitle: string
  status: "draft" | "review" | "approved" | "sent"
  content: string
  analysis?: MemoAnalysis
  createdAt: string
  updatedAt: string
}

export interface Task {
  id: string
  title: string
  description?: string
  status: "open" | "in-progress" | "done"
  priority: "low" | "medium" | "high"
  dueDate?: string
  assigneeId?: string
  assigneeName?: string
  investorId?: string
  investorName?: string
  propertyId?: string
  propertyTitle?: string
  createdAt: string
}

export interface DealRoom {
  id: string
  tenantId: string
  title: string
  investorId: string
  investorName: string
  propertyId: string
  propertyTitle: string
  status: "preparation" | "due-diligence" | "negotiation" | "closing" | "completed"
  parties: DealParty[]
  checklist: ChecklistItem[]
  timeline: TimelineEvent[]
  createdAt: string

  // --- Enriched deal context ---
  lastUpdatedAt?: string
  ticketSizeAed?: number
  offerPriceAed?: number
  targetCloseDate?: string
  probability?: number // 0-100
  priority?: "low" | "medium" | "high" | "urgent"
  nextStep?: string
  summary?: string
  notes?: string
  assignedAgentId?: string
}

export interface DealParty {
  id: string
  name: string
  role: string
  email: string
  phone?: string
  avatar?: string
}

export interface ChecklistItem {
  id: string
  title: string
  category: string
  completed: boolean
  dueDate?: string
}

export interface TimelineEvent {
  id: string
  title: string
  description?: string
  date: string
  type: "milestone" | "document" | "meeting" | "update"
}

export interface Activity {
  id: string
  type: "investor_added" | "property_listed" | "memo_created" | "task_completed" | "deal_updated"
  title: string
  description: string
  timestamp: string
  userId?: string
  investorId?: string
  propertyId?: string
}

// ============================================================================
// Off-Plan Property Analysis Types
// ============================================================================

/**
 * Off-Plan Project extracted from developer brochure
 */
export interface OffPlanProject {
  projectName: string
  developer: string
  location: {
    area: string
    subArea?: string
    landmark?: string
    coordinates?: { lat: number; lng: number }
  }
  completionDate: string // e.g., "Q4 2026"
  totalLevels: number
  totalUnits: number
  propertyType: "residential" | "commercial" | "mixed"
  amenities: string[]
  description: string
  contactInfo?: {
    phone?: string
    email?: string
    salesCenter?: string
    website?: string
  }
  developerTrackRecord?: {
    completedProjects: { name: string; location?: string; value?: string }[]
    currentProjects?: { name: string; location?: string; value?: string }[]
    totalDevelopmentValue?: string
    yearsInBusiness?: number
  }
  architectDesigner?: string
  interiorDesigner?: string
}

/**
 * Individual unit from availability sheet
 */
export interface OffPlanUnit {
  unitNumber: string
  level: number
  type: string // "Full Floor", "Half Floor", "Studio", "1BR", "2BR", etc.
  sizeSqft: number
  pricePerSqft: number
  totalPrice: number
  views?: string
  parking?: number
  status: "available" | "sold" | "reserved"
  commonAreaSqft?: number
  totalAreaSqft?: number
}

/**
 * Payment plan milestone
 */
export interface PaymentMilestone {
  milestone: number
  description: string
  percentage: number
  timing?: string // e.g., "On Booking", "3 months from SPA"
  amountAed?: number
}

/**
 * Complete payment plan structure
 */
export interface OffPlanPaymentPlan {
  milestones: PaymentMilestone[]
  dldFeePercent: number
  totalPercent: number
  postHandoverPercent: number
  constructionPercent: number
}

/**
 * Off-Plan extraction result from AI
 */
export interface OffPlanExtractionResult {
  project: OffPlanProject
  units: OffPlanUnit[]
  paymentPlan: OffPlanPaymentPlan
  rawText?: string
  extractedAt: string
  confidence: "high" | "medium" | "low"
  stats?: {
    totalUnits: number
    availableUnits: number
    soldUnits: number
    reservedUnits: number
    priceRange?: { min: number; max: number } | null
    sizeRange?: { min: number; max: number } | null
    avgPricePerSqft?: number | null
  }
}

/**
 * Developer assessment in the memo
 */
export interface DeveloperAssessment {
  score: number // 0-100
  grade: "A" | "B" | "C" | "D"
  strengths: string[]
  concerns: string[]
  trackRecordSummary: string
  financialStability?: "strong" | "moderate" | "weak" | "unknown"
}

/**
 * Cash flow item in payment schedule
 */
export interface PaymentCashFlow {
  month: number
  milestone: string
  payment: number
  cumulative: number
  percentPaid: number
}

/**
 * Financial projections for off-plan
 */
export interface OffPlanFinancialProjections {
  purchasePrice: number
  estimatedCompletionValue: number
  expectedAppreciation: number // percentage
  expectedAppreciationAed: number
  projectedRentalYieldGross: number
  projectedRentalYieldNet: number
  estimatedAnnualRent: number
  paymentPlanIRR?: number
  totalInvestmentReturn?: number
  breakEvenMonths?: number
}

/**
 * Market comparable for off-plan
 */
export interface OffPlanComparable {
  project: string
  developer: string
  area: string
  pricePerSqft: number
  completionStatus: "completed" | "under_construction" | "launching"
  completionDate?: string
  currentPricePsf?: number
  launchPricePsf?: number
  appreciation?: number
  note?: string
}

/**
 * Risk item with severity
 */
export interface OffPlanRisk {
  category: string
  level: "low" | "medium" | "high"
  description: string
  mitigation: string
  probability?: number
  impact?: number
}

/**
 * Off-Plan IC Memo content structure
 */
export interface OffPlanMemoContent {
  // Project summary
  projectSummary: string
  projectHighlights: string[]
  
  // Developer assessment
  developerAssessment: DeveloperAssessment
  
  // Location analysis
  locationAnalysis: {
    grade: string
    areaProfile: string
    highlights: string[]
    proximity: Record<string, string> // e.g., "Dubai Metro": "Direct Access"
    futureInfrastructure?: string[]
  }
  
  // Unit analysis (selected unit)
  unitAnalysis: {
    unitNumber: string
    type: string
    level: number
    sizeSqft: number
    totalPrice: number
    pricePerSqft: number
    views?: string
    parking?: number
    valueAssessment: string
    priceVsProjectAvg?: number // percentage
  }
  
  // Payment plan analysis
  paymentPlanAnalysis: {
    summary: string
    cashFlowSchedule: PaymentCashFlow[]
    totalDuringConstruction: number
    totalOnCompletion: number
    postHandoverMonths?: number
    insights: string[]
    attractivenessScore: number // 0-100
  }
  
  // Financial projections
  financialProjections: OffPlanFinancialProjections
  
  // Market comparables
  marketComparables: OffPlanComparable[]
  
  // Risk assessment
  riskAssessment: OffPlanRisk[]
  overallRiskLevel: "low" | "medium" | "high"
  
  // Investment thesis
  investmentThesis: string
  keyStrengths: string[]
  keyConsiderations: string[]
  
  // Final recommendation
  recommendation: {
    decision: "PROCEED" | "CONDITIONAL" | "PASS"
    reasoning: string
    conditions?: string[]
    suggestedNegotiationPoints?: string[]
  }
  
  // Metadata
  generatedBy: string
  generatedAt: string
}

/**
 * Off-Plan evaluation result
 */
export interface OffPlanEvaluationResult {
  overallScore: number
  factors: {
    developerCredibility: number // 0-25
    locationPremium: number // 0-25
    paymentPlanAttractiveness: number // 0-25
    appreciationPotential: number // 0-25
  }
  headline: string
  recommendation: "strong_buy" | "buy" | "hold" | "pass"
  memoContent: OffPlanMemoContent
}

// ============================================================================
// Market Signal Types (moved from mock-market-signals.ts)
// ============================================================================

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
  | "pricing_opportunity"

export type MarketSignalGeoType = "community" | "submarket" | "city"

export type MarketSignalMetric =
  | "median_price_psf"
  | "median_rent_annual"
  | "gross_yield"
  | "active_listings"
  | "price_cuts_count"
  | "stale_listings_count"
  | "asking_price"

export type MarketSignalItem = {
  id: string
  createdAt: string
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
  confidenceScore: number
  investorMatches?: number
  propertyTitle?: string | null
  metadata?: Record<string, unknown>
}

export function formatMarketSignalType(t: MarketSignalType): string {
  switch (t) {
    case "price_change": return "Price change"
    case "rent_change": return "Rent change"
    case "yield_opportunity": return "Yield opportunity"
    case "supply_spike": return "Supply spike"
    case "discounting_spike": return "Discounting spike"
    case "staleness_rise": return "Staleness rise"
    case "risk_flag": return "Risk flag"
    case "pricing_opportunity": return "Pricing opportunity"
    default: return t
  }
}

// ============================================================================
// Notification Type (moved from mock-session.ts)
// ============================================================================

export type Notification = {
  id: string
  title: string
  body: string
  createdAt: string
  unread?: boolean
  href?: string
}

