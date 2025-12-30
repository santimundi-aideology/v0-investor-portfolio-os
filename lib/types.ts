// Domain types for UAE Investor Portfolio OS

// Minimum roles for Investor Portfolio OS
export type UserRole = "owner" | "admin" | "realtor" | "investor"

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
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
    expected?: any
    actual?: any
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
  meta?: any
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

export interface Memo {
  id: string
  title: string
  investorId: string
  investorName: string
  propertyId: string
  propertyTitle: string
  status: "draft" | "review" | "approved" | "sent"
  content: string
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
}

export interface DealParty {
  id: string
  name: string
  role: string
  email: string
  phone?: string
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



