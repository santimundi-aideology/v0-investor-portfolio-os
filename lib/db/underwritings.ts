import { getSupabaseAdminClient } from "@/lib/db/client"
import type { UnderwritingRecord } from "@/lib/data/types"

function mapRow(row: Record<string, unknown>): UnderwritingRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    investorId: row.investor_id,
    listingId: row.listing_id,
    inputs: row.inputs ?? {},
    scenarios: row.scenarios ?? {},
    confidence: row.confidence ?? undefined,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listUnderwritingsForAgent(tenantId: string, agentId: string, investorAgentLookup: (investorId: string) => Promise<boolean>) {
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase.from("underwritings").select("*").eq("tenant_id", tenantId)
  if (error) throw error
  const rows = data ?? []
  const filtered: UnderwritingRecord[] = []
  for (const row of rows) {
    const allowed = await investorAgentLookup(row.investor_id)
    if (allowed) filtered.push(mapRow(row))
  }
  return filtered
}

export async function listUnderwritingsForTenant(tenantId: string) {
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase.from("underwritings").select("*").eq("tenant_id", tenantId)
  if (error) throw error
  return (data ?? []).map(mapRow)
}

export async function getUnderwritingById(id: string) {
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase.from("underwritings").select("*").eq("id", id).maybeSingle()
  if (error) throw error
  return data ? mapRow(data) : null
}

export async function createUnderwritingDb(input: {
  tenantId: string
  investorId: string
  listingId: string
  inputs?: Record<string, unknown>
  scenarios?: Record<string, unknown>
  createdBy?: string
  confidence?: string
}) {
  const supabase = getSupabaseAdminClient()
  const payload = {
    tenant_id: input.tenantId,
    investor_id: input.investorId,
    listing_id: input.listingId,
    inputs: input.inputs ?? {},
    scenarios: input.scenarios ?? {},
    confidence: input.confidence ?? null,
    created_by: input.createdBy ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  const { data, error } = await supabase.from("underwritings").insert(payload).select("*").maybeSingle()
  if (error) throw error
  return data ? mapRow(data) : null
}

export async function updateUnderwritingDb(id: string, patch: Partial<UnderwritingRecord>) {
  const supabase = getSupabaseAdminClient()
  const payload: Record<string, unknown> = {}
  if (patch.inputs !== undefined) payload.inputs = patch.inputs
  if (patch.scenarios !== undefined) payload.scenarios = patch.scenarios
  if (patch.confidence !== undefined) payload.confidence = patch.confidence
  payload.updated_at = new Date().toISOString()

  const { data, error } = await supabase.from("underwritings").update(payload).eq("id", id).select("*").maybeSingle()
  if (error) throw error
  return data ? mapRow(data) : null
}

export async function deleteUnderwritingDb(id: string) {
  const supabase = getSupabaseAdminClient()
  const { error } = await supabase.from("underwritings").delete().eq("id", id)
  if (error) throw error
  return true
}

