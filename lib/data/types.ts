/**
 * Shared record types used across lib/db/ and lib/ai/ modules.
 * These map to Supabase table rows in camelCase format.
 */

export type InvestorRecord = {
  id: string
  tenantId: string
  name: string
  company?: string
  email?: string
  phone?: string
  avatar?: string
  status: "active" | "pending" | "inactive"
  mandate?: unknown
  createdAt: string
  lastContact?: string
  totalDeals: number
  assignedAgentId: string
  ownerUserId?: string | null
}

export type ListingRecord = {
  id: string
  tenantId: string
  title: string
  area?: string
  address?: string
  type?: string
  status: "available" | "under-offer" | "sold" | "off-market"
  price?: number
  size?: number
  bedrooms?: number
  bathrooms?: number
  readiness?: string
  developer?: string
  expectedRent?: number
  currency?: string
  handoverDate?: string
  imageUrl?: string
  createdAt: string
}

export type TrustRecord = {
  id: string
  tenantId: string
  listingId: string
  status: "verified" | "unknown" | "flagged"
  reason?: string
  evidenceId?: string
  verifiedAt?: string
  verifiedBy?: string
}

export type MemoState = "draft" | "pending_review" | "ready" | "sent" | "opened" | "decided"

export type MemoVersion = {
  version: number
  content: unknown
  createdAt: string
  createdBy: string
}

export type MemoRecord = {
  id: string
  tenantId: string
  investorId: string | null
  listingId?: string
  underwritingId?: string
  state: MemoState
  currentVersion: number
  versions: MemoVersion[]
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type DecisionRecord = {
  id: string
  tenantId: string
  memoId: string
  investorId: string
  decisionType: "approved" | "rejected" | "approved_conditional"
  reasonTags: string[]
  conditionText?: string
  deadline?: string
  resolvedStatus: "pending" | "met" | "not_met" | "withdrawn"
  resolvedBy?: string
  resolvedAt?: string
  createdAt: string
  resolvedNotes?: string
}

export type MessageRecord = {
  id: string
  tenantId: string
  memoId: string
  body: string
  versionContext?: number
  senderId?: string
  createdAt: string
}

export type MemoShareToken = {
  token: string
  memoId: string
  investorId: string
  tenantId: string
  createdAt: string
}

export type UnderwritingRecord = {
  id: string
  tenantId: string
  investorId: string
  listingId: string
  inputs: Record<string, unknown>
  scenarios: Record<string, unknown>
  confidence?: string
  createdBy?: string
  createdAt: string
  updatedAt: string
}

export type UnderwritingCompRecord = {
  id: string
  tenantId: string
  underwritingId: string
  description: string
  price?: number
  pricePerSqft?: number
  rentPerYear?: number
  source: string
  sourceDetail?: string
  observedDate?: string
  attachmentId?: string
  addedBy?: string
  addedAt: string
}
