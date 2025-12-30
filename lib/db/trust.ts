import { getSupabaseAdminClient } from "@/lib/db/client"
import type { TrustRecord } from "@/lib/data/store"

function mapRow(row: Record<string, unknown>): TrustRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    listingId: row.listing_id,
    status: row.status,
    reason: row.reason ?? undefined,
    evidenceId: row.evidence_id ?? undefined,
    verifiedAt: row.verified_at ?? undefined,
    verifiedBy: row.verified_by ?? undefined,
  }
}

export async function upsertTrustRecordDb(input: {
  tenantId: string
  listingId: string
  status: "verified" | "unknown" | "flagged"
  reason?: string
  evidenceId?: string
  verifiedAt?: string
  verifiedBy?: string
}) {
  const supabase = getSupabaseAdminClient()
  const existing = await supabase
    .from("trust_records")
    .select("*")
    .eq("tenant_id", input.tenantId)
    .eq("listing_id", input.listingId)
    .maybeSingle()

  if (existing.error) throw existing.error

  const payload = {
    tenant_id: input.tenantId,
    listing_id: input.listingId,
    status: input.status,
    reason: input.reason ?? null,
    evidence_id: input.evidenceId ?? null,
    verified_at: input.verifiedAt ?? null,
    verified_by: input.verifiedBy ?? null,
  }

  if (existing.data) {
    const { data, error } = await supabase
      .from("trust_records")
      .update(payload)
      .eq("id", existing.data.id)
      .select("*")
      .maybeSingle()
    if (error) throw error
    return data ? mapRow(data) : null
  }

  const { data, error } = await supabase.from("trust_records").insert(payload).select("*").maybeSingle()
  if (error) throw error
  return data ? mapRow(data) : null
}

export async function getTrustRecord(tenantId: string, listingId: string) {
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from("trust_records")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("listing_id", listingId)
    .maybeSingle()
  if (error) throw error
  return data ? mapRow(data) : null
}

