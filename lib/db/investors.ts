import { getSupabaseAdminClient } from "@/lib/db/client"
import type { InvestorRecord } from "@/lib/data/types"

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
    created_at: new Date().toISOString(),
    last_contact: input.lastContact ?? null,
    total_deals: 0,
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
  if (patch.description !== undefined) payload.description = patch.description

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

function mapRow(row: Record<string, unknown>): InvestorRecord {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    name: row.name as string,
    company: (row.company as string) ?? undefined,
    email: (row.email as string) ?? undefined,
    phone: (row.phone as string) ?? undefined,
    status: row.status as InvestorRecord["status"],
    mandate: (row.mandate as InvestorRecord["mandate"]) ?? undefined,
    description: (row.description as string) ?? undefined,
    createdAt: row.created_at as string,
    lastContact: (row.last_contact as string) ?? undefined,
    totalDeals: (row.total_deals as number) ?? 0,
    assignedAgentId: row.assigned_agent_id as string,
    ownerUserId: (row.owner_user_id as string) ?? undefined,
    avatar: (row.avatar as string) ?? undefined,
  }
}

