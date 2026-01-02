import { randomUUID } from "node:crypto"

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
  investorId: string
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

const tenantId = "tenant-1"

export const store = {
  tenantId,
  investors: [
    {
      id: "inv-1",
      tenantId,
      name: "Mohammed Al-Fayed",
      company: "Al-Fayed Investments",
      email: "m.alfayed@investments.ae",
      phone: "+971 50 123 4567",
      avatar: "/placeholder-user.jpg",
      status: "active",
      createdAt: new Date().toISOString(),
      lastContact: new Date().toISOString(),
      totalDeals: 3,
      assignedAgentId: "agent-1",
      ownerUserId: "investor-1",
    },
  ] as InvestorRecord[],
  listings: [
    {
      id: "listing-1",
      tenantId,
      title: "Marina Tower Office Suite",
      area: "Dubai Marina",
      status: "available",
      price: 8500000,
      size: 2500,
      createdAt: new Date().toISOString(),
    },
  ] as ListingRecord[],
  trust: [] as TrustRecord[],
  memos: [] as MemoRecord[],
  decisions: [] as DecisionRecord[],
  underwritings: [] as UnderwritingRecord[],
  underwritingComps: [] as UnderwritingCompRecord[],
  messages: [] as MessageRecord[],
  memoShareTokens: [] as MemoShareToken[],
}

export function createInvestor(input: Omit<InvestorRecord, "id" | "createdAt" | "totalDeals" | "tenantId">) {
  const record: InvestorRecord = {
    ...input,
    id: randomUUID(),
    tenantId,
    createdAt: new Date().toISOString(),
    totalDeals: 0,
  }
  store.investors.push(record)
  return record
}

export function updateInvestor(id: string, patch: Partial<InvestorRecord>) {
  const idx = store.investors.findIndex((i) => i.id === id)
  if (idx === -1) return undefined
  store.investors[idx] = { ...store.investors[idx], ...patch }
  return store.investors[idx]
}

export function deleteInvestor(id: string) {
  const idx = store.investors.findIndex((i) => i.id === id)
  if (idx === -1) return false
  store.investors.splice(idx, 1)
  return true
}

export function createListing(input: Omit<ListingRecord, "id" | "createdAt" | "tenantId">) {
  const record: ListingRecord = {
    ...input,
    id: randomUUID(),
    tenantId,
    createdAt: new Date().toISOString(),
  }
  store.listings.push(record)
  return record
}

export function updateListing(id: string, patch: Partial<ListingRecord>) {
  const idx = store.listings.findIndex((l) => l.id === id)
  if (idx === -1) return undefined
  store.listings[idx] = { ...store.listings[idx], ...patch }
  return store.listings[idx]
}

export function deleteListing(id: string) {
  const idx = store.listings.findIndex((l) => l.id === id)
  if (idx === -1) return false
  store.listings.splice(idx, 1)
  return true
}

export function upsertTrustRecord(input: Omit<TrustRecord, "id" | "tenantId">) {
  const existingIdx = store.trust.findIndex((t) => t.listingId === input.listingId)
  const record: TrustRecord = {
    ...input,
    id: existingIdx === -1 ? randomUUID() : store.trust[existingIdx].id,
    tenantId,
  }
  if (existingIdx === -1) {
    store.trust.push(record)
  } else {
    store.trust[existingIdx] = { ...store.trust[existingIdx], ...record }
  }
  return record
}

export function getInvestor(investorId: string) {
  return store.investors.find((inv) => inv.id === investorId)
}

export function createMemo(input: {
  investorId: string
  listingId?: string
  underwritingId?: string
  content: unknown
  createdBy: string
}) {
  const now = new Date().toISOString()
  const memo: MemoRecord = {
    id: randomUUID(),
    tenantId,
    investorId: input.investorId,
    listingId: input.listingId,
    underwritingId: input.underwritingId,
    state: "draft",
    currentVersion: 1,
    versions: [{ version: 1, content: input.content, createdAt: now, createdBy: input.createdBy }],
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  }
  store.memos.push(memo)
  return memo
}

export function getMemo(id: string) {
  return store.memos.find((m) => m.id === id)
}

export function saveMemo(updated: MemoRecord) {
  const idx = store.memos.findIndex((m) => m.id === updated.id)
  if (idx === -1) return
  store.memos[idx] = { ...updated, updatedAt: new Date().toISOString() }
}

export function addDecision(decision: Omit<DecisionRecord, "id" | "tenantId" | "createdAt" | "resolvedStatus"> & { resolvedStatus?: DecisionRecord["resolvedStatus"] }) {
  const record: DecisionRecord = {
    ...decision,
    id: randomUUID(),
    tenantId,
    createdAt: new Date().toISOString(),
    resolvedStatus: decision.resolvedStatus ?? "pending",
  }
  store.decisions.push(record)
  return record
}

export function getDecisionByMemo(memoId: string) {
  return store.decisions.find((d) => d.memoId === memoId)
}

export function resolveDecision(memoId: string, resolution: DecisionRecord["resolvedStatus"], resolvedBy: string, notes?: string) {
  const decision = store.decisions.find((d) => d.memoId === memoId)
  if (!decision) return undefined
  const updated: DecisionRecord = {
    ...decision,
    resolvedStatus: resolution,
    resolvedBy,
    resolvedAt: new Date().toISOString(),
    resolvedNotes: notes,
  }
  const idx = store.decisions.findIndex((d) => d.memoId === memoId)
  store.decisions[idx] = updated
  return updated
}

export function addMessage(input: Omit<MessageRecord, "id" | "tenantId" | "createdAt">) {
  const record: MessageRecord = {
    ...input,
    id: randomUUID(),
    tenantId,
    createdAt: new Date().toISOString(),
  }
  store.messages.push(record)
  return record
}

export function getMessagesByMemo(memoId: string) {
  return store.messages.filter((m) => m.memoId === memoId)
}

export function createShareToken(memoId: string, investorId: string) {
  const token = randomUUID()
  const record: MemoShareToken = {
    token,
    memoId,
    investorId,
    tenantId,
    createdAt: new Date().toISOString(),
  }
  store.memoShareTokens.push(record)
  return record
}

export function resolveShareToken(token: string) {
  return store.memoShareTokens.find((t) => t.token === token)
}

export function createUnderwriting(input: {
  investorId: string
  listingId: string
  inputs?: Record<string, unknown>
  scenarios?: Record<string, unknown>
  createdBy?: string
}) {
  const now = new Date().toISOString()
  const record: UnderwritingRecord = {
    id: randomUUID(),
    tenantId,
    investorId: input.investorId,
    listingId: input.listingId,
    inputs: input.inputs ?? {},
    scenarios: input.scenarios ?? {},
    confidence: undefined,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  }
  store.underwritings.push(record)
  return record
}

export function getUnderwriting(id: string) {
  return store.underwritings.find((u) => u.id === id)
}

export function updateUnderwriting(id: string, patch: Partial<UnderwritingRecord>) {
  const idx = store.underwritings.findIndex((u) => u.id === id)
  if (idx === -1) return undefined
  store.underwritings[idx] = { ...store.underwritings[idx], ...patch, updatedAt: new Date().toISOString() }
  return store.underwritings[idx]
}

export function deleteUnderwriting(id: string) {
  const idx = store.underwritings.findIndex((u) => u.id === id)
  if (idx === -1) return false
  store.underwritings.splice(idx, 1)
  return true
}

export function addUnderwritingComp(input: Omit<UnderwritingCompRecord, "id" | "tenantId" | "addedAt">) {
  const record: UnderwritingCompRecord = {
    ...input,
    id: randomUUID(),
    tenantId,
    addedAt: new Date().toISOString(),
  }
  store.underwritingComps.push(record)
  return record
}

export function deleteUnderwritingComp(id: string) {
  const idx = store.underwritingComps.findIndex((c) => c.id === id)
  if (idx === -1) return false
  store.underwritingComps.splice(idx, 1)
  return true
}

