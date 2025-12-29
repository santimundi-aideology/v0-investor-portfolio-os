import { getSupabaseAdminClient } from "@/lib/db/client"
import type { UnderwritingCompRecord } from "@/lib/data/store"

function mapRow(row: any): UnderwritingCompRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    underwritingId: row.underwriting_id,
    description: row.description,
    price: row.price ?? undefined,
    pricePerSqft: row.price_per_sqft ?? undefined,
    rentPerYear: row.rent_per_year ?? undefined,
    source: row.source,
    sourceDetail: row.source_detail ?? undefined,
    observedDate: row.observed_date ?? undefined,
    attachmentId: row.attachment_id ?? undefined,
    addedBy: row.added_by ?? undefined,
    addedAt: row.added_at,
  }
}

export async function listComps(tenantId: string, underwritingId: string) {
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from("underwriting_comps")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("underwriting_id", underwritingId)
  if (error) throw error
  return (data ?? []).map(mapRow)
}

export async function getCompById(id: string) {
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase.from("underwriting_comps").select("*").eq("id", id).maybeSingle()
  if (error) throw error
  return data ? mapRow(data) : null
}

export async function addCompDb(input: Omit<UnderwritingCompRecord, "id" | "tenantId" | "addedAt"> & { tenantId: string }) {
  const supabase = getSupabaseAdminClient()
  const payload = {
    tenant_id: input.tenantId,
    underwriting_id: input.underwritingId,
    description: input.description,
    price: input.price ?? null,
    price_per_sqft: input.pricePerSqft ?? null,
    rent_per_year: input.rentPerYear ?? null,
    source: input.source,
    source_detail: input.sourceDetail ?? null,
    observed_date: input.observedDate ?? null,
    attachment_id: input.attachmentId ?? null,
    added_by: input.addedBy ?? null,
    added_at: new Date().toISOString(),
  }
  const { data, error } = await supabase.from("underwriting_comps").insert(payload).select("*").maybeSingle()
  if (error) throw error
  return data ? mapRow(data) : null
}

export async function deleteCompDb(id: string) {
  const supabase = getSupabaseAdminClient()
  const { error } = await supabase.from("underwriting_comps").delete().eq("id", id)
  if (error) throw error
  return true
}

