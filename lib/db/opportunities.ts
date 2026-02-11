import { getSupabaseAdminClient } from "@/lib/db/client"

export type OpportunityStatus =
  | "recommended"
  | "shortlisted"
  | "memo_review"
  | "deal_room"
  | "acquired"
  | "rejected"
  | "expired"

export type InvestorDecision =
  | "pending"
  | "interested"
  | "very_interested"
  | "not_interested"

export type InvestorOpportunity = {
  id: string
  tenantId: string
  investorId: string
  listingId: string
  sharedBy: string
  sharedAt: string
  sharedMessage: string | null
  status: OpportunityStatus
  decision: InvestorDecision
  decisionAt: string | null
  decisionNote: string | null
  memoId: string | null
  dealRoomId: string | null
  holdingId: string | null
  shortlistItemId: string | null
  matchScore: number | null
  matchReasons: string[]
  createdAt: string
  updatedAt: string
}

export type OpportunityMessage = {
  id: string
  tenantId: string
  opportunityId: string
  senderId: string
  senderRole: "investor" | "agent" | "ai"
  body: string
  attachments: unknown[]
  createdAt: string
}

const MEMO_REQUIRED_STATUSES: OpportunityStatus[] = ["memo_review", "deal_room"]

export function validateOpportunityState(opportunity: {
  id: string
  status: OpportunityStatus
  memoId: string | null
}): { valid: boolean; warning?: string; normalizedStatus?: OpportunityStatus } {
  if (MEMO_REQUIRED_STATUSES.includes(opportunity.status) && !opportunity.memoId) {
    return {
      valid: false,
      warning: `[opportunity-invariant] Opportunity ${opportunity.id} has status ${opportunity.status} without memo_id`,
      normalizedStatus: "shortlisted",
    }
  }

  return { valid: true }
}

function mapOpportunityRow(row: Record<string, unknown>): InvestorOpportunity {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    investorId: row.investor_id as string,
    listingId: row.listing_id as string,
    sharedBy: row.shared_by as string,
    sharedAt: row.shared_at as string,
    sharedMessage: (row.shared_message as string) ?? null,
    status: row.status as OpportunityStatus,
    decision: row.decision as InvestorDecision,
    decisionAt: (row.decision_at as string) ?? null,
    decisionNote: (row.decision_note as string) ?? null,
    memoId: (row.memo_id as string) ?? null,
    dealRoomId: (row.deal_room_id as string) ?? null,
    holdingId: (row.holding_id as string) ?? null,
    shortlistItemId: (row.shortlist_item_id as string) ?? null,
    matchScore: row.match_score != null ? Number(row.match_score) : null,
    matchReasons: (row.match_reasons as string[]) ?? [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

function mapMessageRow(row: Record<string, unknown>): OpportunityMessage {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    opportunityId: row.opportunity_id as string,
    senderId: row.sender_id as string,
    senderRole: row.sender_role as "investor" | "agent" | "ai",
    body: row.body as string,
    attachments: (row.attachments as unknown[]) ?? [],
    createdAt: row.created_at as string,
  }
}

// ─── Opportunities CRUD ─────────────────────────────────────────────

/**
 * Get all opportunities for an investor, excluding acquired properties by default.
 * Ordered by most recent first.
 */
export async function getOpportunitiesByInvestor(
  investorId: string,
  opts?: { includeAcquired?: boolean; statuses?: OpportunityStatus[] }
): Promise<InvestorOpportunity[]> {
  const supabase = getSupabaseAdminClient()

  try {
    let query = supabase
      .from("investor_opportunities")
      .select("*")
      .eq("investor_id", investorId)
      .order("shared_at", { ascending: false })

    if (opts?.statuses?.length) {
      query = query.in("status", opts.statuses)
    } else if (!opts?.includeAcquired) {
      query = query.not("status", "in", '("acquired","expired")')
    }

    const { data, error } = await query
    if (error) {
      console.warn("[opportunities] Error fetching:", error.message)
      return []
    }
    return (data ?? []).map(mapOpportunityRow)
  } catch (err) {
    console.warn("[opportunities] Error:", err)
    return []
  }
}

/**
 * Get all opportunities for a tenant (realtor/manager views).
 * Ordered by most recent share first.
 */
export async function getOpportunitiesByTenant(
  tenantId: string,
  opts?: {
    includeClosed?: boolean
    statuses?: OpportunityStatus[]
    investorId?: string
    listingId?: string
  }
): Promise<InvestorOpportunity[]> {
  const supabase = getSupabaseAdminClient()

  try {
    let query = supabase
      .from("investor_opportunities")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("shared_at", { ascending: false })

    if (opts?.investorId) {
      query = query.eq("investor_id", opts.investorId)
    }
    if (opts?.listingId) {
      query = query.eq("listing_id", opts.listingId)
    }
    if (opts?.statuses?.length) {
      query = query.in("status", opts.statuses)
    } else if (!opts?.includeClosed) {
      query = query.not("status", "in", '("acquired","expired")')
    }

    const { data, error } = await query
    if (error) {
      console.warn("[opportunities] Error fetching tenant opportunities:", error.message)
      return []
    }
    return (data ?? []).map(mapOpportunityRow)
  } catch (err) {
    console.warn("[opportunities] Error:", err)
    return []
  }
}

/**
 * Get a single opportunity by ID
 */
export async function getOpportunityById(
  id: string
): Promise<InvestorOpportunity | null> {
  const supabase = getSupabaseAdminClient()

  try {
    const { data, error } = await supabase
      .from("investor_opportunities")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (error || !data) return null
    return mapOpportunityRow(data)
  } catch {
    return null
  }
}

/**
 * Update investor decision on an opportunity
 */
export async function updateOpportunityDecision(
  id: string,
  decision: InvestorDecision,
  opts?: { note?: string; status?: OpportunityStatus }
): Promise<InvestorOpportunity | null> {
  const supabase = getSupabaseAdminClient()

  const payload: Record<string, unknown> = {
    decision,
    decision_at: new Date().toISOString(),
  }
  if (opts?.note !== undefined) payload.decision_note = opts.note
  if (opts?.status !== undefined) payload.status = opts.status

  try {
    const { data, error } = await supabase
      .from("investor_opportunities")
      .update(payload)
      .eq("id", id)
      .select("*")
      .maybeSingle()

    if (error) {
      console.error("[opportunities] Error updating decision:", error)
      return null
    }
    return data ? mapOpportunityRow(data) : null
  } catch (err) {
    console.error("[opportunities] Error:", err)
    return null
  }
}

/**
 * Update opportunity status (lifecycle progression)
 */
export async function updateOpportunityStatus(
  id: string,
  status: OpportunityStatus,
  refs?: { memoId?: string; dealRoomId?: string; holdingId?: string }
): Promise<InvestorOpportunity | null> {
  const supabase = getSupabaseAdminClient()

  const payload: Record<string, unknown> = { status }
  if (refs?.memoId) payload.memo_id = refs.memoId
  if (refs?.dealRoomId) payload.deal_room_id = refs.dealRoomId
  if (refs?.holdingId) payload.holding_id = refs.holdingId

  try {
    const { data, error } = await supabase
      .from("investor_opportunities")
      .update(payload)
      .eq("id", id)
      .select("*")
      .maybeSingle()

    if (error) {
      console.error("[opportunities] Error updating status:", error)
      return null
    }
    return data ? mapOpportunityRow(data) : null
  } catch (err) {
    console.error("[opportunities] Error:", err)
    return null
  }
}

/**
 * Create a new opportunity (realtor shares a property with investor)
 */
export async function createOpportunity(input: {
  tenantId: string
  investorId: string
  listingId: string
  sharedBy: string
  sharedMessage?: string
  matchScore?: number
  matchReasons?: string[]
  shortlistItemId?: string
  memoId?: string
  status?: OpportunityStatus
}): Promise<InvestorOpportunity | null> {
  const supabase = getSupabaseAdminClient()

  try {
    const { data, error } = await supabase
      .from("investor_opportunities")
      .upsert(
        {
          tenant_id: input.tenantId,
          investor_id: input.investorId,
          listing_id: input.listingId,
          shared_by: input.sharedBy,
          shared_message: input.sharedMessage ?? null,
          status: input.status ?? "recommended",
          memo_id: input.memoId ?? null,
          match_score: input.matchScore ?? null,
          match_reasons: input.matchReasons ?? [],
          shortlist_item_id: input.shortlistItemId ?? null,
        },
        { onConflict: "investor_id,listing_id" }
      )
      .select("*")
      .maybeSingle()

    if (error) {
      console.error("[opportunities] Error creating:", error)
      return null
    }
    return data ? mapOpportunityRow(data) : null
  } catch (err) {
    console.error("[opportunities] Error:", err)
    return null
  }
}

/**
 * Get opportunity counts by status for an investor (for dashboard/tabs)
 */
export async function getOpportunityCounts(investorId: string): Promise<{
  recommended: number
  interested: number
  veryInterested: number
  pipeline: number
  rejected: number
  total: number
}> {
  const all = await getOpportunitiesByInvestor(investorId, { includeAcquired: false })

  const counts = {
    recommended: 0,
    interested: 0,
    veryInterested: 0,
    pipeline: 0,
    rejected: 0,
    total: all.length,
  }

  for (const opp of all) {
    if (opp.status === "rejected") {
      counts.rejected++
    } else if (["memo_review", "deal_room", "shortlisted"].includes(opp.status)) {
      counts.pipeline++
    } else if (opp.decision === "very_interested") {
      counts.veryInterested++
    } else if (opp.decision === "interested") {
      counts.interested++
    } else {
      counts.recommended++
    }
  }

  return counts
}

// ─── Opportunity Messages ───────────────────────────────────────────

/**
 * Get messages for an opportunity thread
 */
export async function getOpportunityMessages(
  opportunityId: string
): Promise<OpportunityMessage[]> {
  const supabase = getSupabaseAdminClient()

  try {
    const { data, error } = await supabase
      .from("opportunity_messages")
      .select("*")
      .eq("opportunity_id", opportunityId)
      .order("created_at", { ascending: true })

    if (error) {
      console.warn("[opportunity_messages] Error:", error.message)
      return []
    }
    return (data ?? []).map(mapMessageRow)
  } catch (err) {
    console.warn("[opportunity_messages] Error:", err)
    return []
  }
}

/**
 * Post a message to an opportunity thread
 */
export async function createOpportunityMessage(input: {
  tenantId: string
  opportunityId: string
  senderId: string
  senderRole: "investor" | "agent" | "ai"
  body: string
  attachments?: unknown[]
}): Promise<OpportunityMessage | null> {
  const supabase = getSupabaseAdminClient()

  try {
    const { data, error } = await supabase
      .from("opportunity_messages")
      .insert({
        tenant_id: input.tenantId,
        opportunity_id: input.opportunityId,
        sender_id: input.senderId,
        sender_role: input.senderRole,
        body: input.body,
        attachments: input.attachments ?? [],
      })
      .select("*")
      .maybeSingle()

    if (error) {
      console.error("[opportunity_messages] Error creating:", error)
      return null
    }
    return data ? mapMessageRow(data) : null
  } catch (err) {
    console.error("[opportunity_messages] Error:", err)
    return null
  }
}
