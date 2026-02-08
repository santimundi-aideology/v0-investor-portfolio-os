import { getSupabaseAdminClient } from "@/lib/db/client"
import type { DealRoom, DealParty, ChecklistItem, TimelineEvent } from "@/lib/types"

// ---------------------------------------------------------------------------
// Row → DealRoom mapper
// ---------------------------------------------------------------------------

function mapDealRoomRow(row: Record<string, unknown>): DealRoom {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    title: row.title as string,
    investorId: (row.investor_id as string) ?? "",
    investorName: (row.investor_name as string) ?? "",
    propertyId: (row.property_id as string) ?? "",
    propertyTitle: (row.property_title as string) ?? "",
    status: (row.status as DealRoom["status"]) ?? "preparation",
    parties: Array.isArray(row.parties) ? (row.parties as DealParty[]) : [],
    checklist: Array.isArray(row.checklist) ? (row.checklist as ChecklistItem[]) : [],
    timeline: Array.isArray(row.timeline) ? (row.timeline as TimelineEvent[]) : [],
    createdAt: row.created_at as string,
    lastUpdatedAt: (row.updated_at as string) ?? undefined,
    ticketSizeAed: row.ticket_size_aed != null ? Number(row.ticket_size_aed) : undefined,
    offerPriceAed: row.offer_price_aed != null ? Number(row.offer_price_aed) : undefined,
    targetCloseDate: (row.target_close_date as string) ?? undefined,
    probability: row.probability != null ? Number(row.probability) : undefined,
    priority: (row.priority as DealRoom["priority"]) ?? "medium",
    nextStep: (row.next_step as string) ?? undefined,
    summary: (row.summary as string) ?? undefined,
    notes: (row.notes as string) ?? undefined,
    assignedAgentId: (row.assigned_agent_id as string) ?? undefined,
  }
}

// ---------------------------------------------------------------------------
// List deal rooms for a tenant
// ---------------------------------------------------------------------------

export async function listDealRooms(
  tenantId: string,
  filters?: { stage?: string; investorId?: string; assignedAgentId?: string },
) {
  const supabase = getSupabaseAdminClient()
  let query = supabase
    .from("deal_rooms")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("updated_at", { ascending: false })

  if (filters?.stage) {
    query = query.eq("status", filters.stage)
  }
  if (filters?.investorId) {
    query = query.eq("investor_id", filters.investorId)
  }
  if (filters?.assignedAgentId) {
    query = query.eq("assigned_agent_id", filters.assignedAgentId)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map(mapDealRoomRow)
}

// ---------------------------------------------------------------------------
// List deal rooms visible to a specific investor (by investor_id)
// ---------------------------------------------------------------------------

export async function listDealRoomsByInvestor(tenantId: string, investorId: string) {
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from("deal_rooms")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("investor_id", investorId)
    .order("updated_at", { ascending: false })

  if (error) throw error
  return (data ?? []).map(mapDealRoomRow)
}

// ---------------------------------------------------------------------------
// Get a single deal room by ID
// ---------------------------------------------------------------------------

export async function getDealRoomById(id: string) {
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from("deal_rooms")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error) throw error
  return data ? mapDealRoomRow(data) : null
}

// ---------------------------------------------------------------------------
// Create a new deal room
// ---------------------------------------------------------------------------

export interface CreateDealRoomInput {
  tenantId: string
  title: string
  propertyId?: string | null
  investorId?: string | null
  investorName?: string | null
  propertyTitle?: string | null
  status?: DealRoom["status"]
  ticketSizeAed?: number | null
  offerPriceAed?: number | null
  targetCloseDate?: string | null
  probability?: number | null
  priority?: DealRoom["priority"]
  nextStep?: string | null
  summary?: string | null
  assignedAgentId?: string | null
  parties?: DealParty[]
  checklist?: ChecklistItem[]
  timeline?: TimelineEvent[]
  notes?: string | null
}

export async function createDealRoom(input: CreateDealRoomInput) {
  const supabase = getSupabaseAdminClient()
  const now = new Date().toISOString()
  const payload = {
    tenant_id: input.tenantId,
    title: input.title,
    property_id: input.propertyId ?? null,
    investor_id: input.investorId ?? null,
    investor_name: input.investorName ?? null,
    property_title: input.propertyTitle ?? null,
    status: input.status ?? "preparation",
    ticket_size_aed: input.ticketSizeAed ?? null,
    offer_price_aed: input.offerPriceAed ?? null,
    target_close_date: input.targetCloseDate ?? null,
    probability: input.probability ?? 50,
    priority: input.priority ?? "medium",
    next_step: input.nextStep ?? null,
    summary: input.summary ?? null,
    assigned_agent_id: input.assignedAgentId ?? null,
    parties: input.parties ?? [],
    checklist: input.checklist ?? [],
    timeline: input.timeline ?? [],
    notes: input.notes ?? null,
    metadata: {},
    created_at: now,
    updated_at: now,
  }
  const { data, error } = await supabase
    .from("deal_rooms")
    .insert(payload)
    .select("*")
    .maybeSingle()
  if (error) throw error
  return data ? mapDealRoomRow(data) : null
}

// ---------------------------------------------------------------------------
// Update an existing deal room
// ---------------------------------------------------------------------------

export async function updateDealRoom(id: string, patch: Partial<DealRoom>) {
  const supabase = getSupabaseAdminClient()
  const payload: Record<string, unknown> = {}

  if (patch.title !== undefined) payload.title = patch.title
  if (patch.propertyId !== undefined) payload.property_id = patch.propertyId || null
  if (patch.investorId !== undefined) payload.investor_id = patch.investorId || null
  if (patch.investorName !== undefined) payload.investor_name = patch.investorName
  if (patch.propertyTitle !== undefined) payload.property_title = patch.propertyTitle
  if (patch.status !== undefined) payload.status = patch.status
  if (patch.ticketSizeAed !== undefined) payload.ticket_size_aed = patch.ticketSizeAed
  if (patch.offerPriceAed !== undefined) payload.offer_price_aed = patch.offerPriceAed
  if (patch.targetCloseDate !== undefined) payload.target_close_date = patch.targetCloseDate
  if (patch.probability !== undefined) payload.probability = patch.probability
  if (patch.priority !== undefined) payload.priority = patch.priority
  if (patch.nextStep !== undefined) payload.next_step = patch.nextStep
  if (patch.summary !== undefined) payload.summary = patch.summary
  if (patch.notes !== undefined) payload.notes = patch.notes
  if (patch.assignedAgentId !== undefined) payload.assigned_agent_id = patch.assignedAgentId || null
  if (patch.parties !== undefined) payload.parties = patch.parties
  if (patch.checklist !== undefined) payload.checklist = patch.checklist
  if (patch.timeline !== undefined) payload.timeline = patch.timeline

  if (Object.keys(payload).length === 0) {
    return getDealRoomById(id)
  }

  payload.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from("deal_rooms")
    .update(payload)
    .eq("id", id)
    .select("*")
    .maybeSingle()
  if (error) throw error
  return data ? mapDealRoomRow(data) : null
}

// ---------------------------------------------------------------------------
// Delete a deal room
// ---------------------------------------------------------------------------

export async function deleteDealRoom(id: string) {
  const supabase = getSupabaseAdminClient()
  const { error } = await supabase.from("deal_rooms").delete().eq("id", id)
  if (error) throw error
  return true
}
