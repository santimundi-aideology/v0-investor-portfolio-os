import { getSupabaseAdminClient } from "@/lib/db/client"
import type { InvestorRecord } from "@/lib/data/store"

export async function listInvestorsByAgent(tenantId: string, agentId: string) {
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from("investors")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("assigned_agent_id", agentId)
  if (error) throw error
  return data?.map(mapRow) ?? []
}

export async function listInvestorsByTenant(tenantId: string) {
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase.from("investors").select("*").eq("tenant_id", tenantId)
  if (error) throw error
  return data?.map(mapRow) ?? []
}

export async function getInvestorById(id: string) {
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase.from("investors").select("*").eq("id", id).maybeSingle()
  if (error) throw error
  return data ? mapRow(data) : null
}

export async function createInvestorDb(input: Omit<InvestorRecord, "id" | "createdAt" | "tenantId" | "totalDeals"> & { tenantId: string }) {
  const supabase = getSupabaseAdminClient()
  const payload = {
    tenant_id: input.tenantId,
    name: input.name,
    company: input.company ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
    status: input.status,
    mandate: input.mandate ?? null,
    created_at: input.createdAt ?? new Date().toISOString(),
    last_contact: input.lastContact ?? null,
    total_deals: input.totalDeals ?? 0,
    assigned_agent_id: input.assignedAgentId,
    owner_user_id: input.ownerUserId ?? null,
    avatar: input.avatar ?? null,
  }
  const { data, error } = await supabase.from("investors").insert(payload).select("*").maybeSingle()
  if (error) throw error
  return data ? mapRow(data) : null
}

export async function updateInvestorDb(id: string, patch: Partial<InvestorRecord>) {
  const supabase = getSupabaseAdminClient()
  const payload: Record<string, unknown> = {}
  if (patch.name !== undefined) payload.name = patch.name
  if (patch.company !== undefined) payload.company = patch.company
  if (patch.email !== undefined) payload.email = patch.email
  if (patch.phone !== undefined) payload.phone = patch.phone
  if (patch.status !== undefined) payload.status = patch.status
  if (patch.mandate !== undefined) payload.mandate = patch.mandate
  if (patch.lastContact !== undefined) payload.last_contact = patch.lastContact
  if (patch.totalDeals !== undefined) payload.total_deals = patch.totalDeals
  if (patch.assignedAgentId !== undefined) payload.assigned_agent_id = patch.assignedAgentId
  if (patch.ownerUserId !== undefined) payload.owner_user_id = patch.ownerUserId
  if (patch.avatar !== undefined) payload.avatar = patch.avatar

  const { data, error } = await supabase.from("investors").update(payload).eq("id", id).select("*").maybeSingle()
  if (error) throw error
  return data ? mapRow(data) : null
}

export async function deleteInvestorDb(id: string) {
  const supabase = getSupabaseAdminClient()
  const { error } = await supabase.from("investors").delete().eq("id", id)
  if (error) throw error
  return true
}

function mapRow(row: any): InvestorRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    company: row.company ?? undefined,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    status: row.status,
    mandate: row.mandate ?? undefined,
    createdAt: row.created_at,
    lastContact: row.last_contact ?? undefined,
    totalDeals: row.total_deals ?? 0,
    assignedAgentId: row.assigned_agent_id,
    ownerUserId: row.owner_user_id ?? undefined,
    avatar: row.avatar ?? undefined,
  }
}

