import { getSupabaseAdminClient } from "@/lib/db/client"
import type { ListingRecord } from "@/lib/data/store"

function mapListingRow(row: Record<string, unknown>): ListingRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    title: row.title,
    address: row.address ?? undefined,
    area: row.area ?? undefined,
    type: row.type ?? undefined,
    status: row.status,
    price: row.price ?? undefined,
    size: row.size ?? undefined,
    bedrooms: row.bedrooms ?? undefined,
    bathrooms: row.bathrooms ?? undefined,
    readiness: row.readiness ?? undefined,
    developer: row.developer ?? undefined,
    expectedRent: row.expected_rent ?? undefined,
    currency: row.currency ?? undefined,
    handoverDate: row.handover_date ?? undefined,
    createdAt: row.created_at,
  }
}

export async function listListings(tenantId: string) {
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase.from("listings").select("*").eq("tenant_id", tenantId)
  if (error) throw error
  return (data ?? []).map(mapListingRow)
}

export async function getListingById(id: string) {
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase.from("listings").select("*").eq("id", id).maybeSingle()
  if (error) throw error
  return data ? mapListingRow(data) : null
}

export async function createListingDb(input: Omit<ListingRecord, "id" | "createdAt" | "tenantId"> & { tenantId: string }) {
  const supabase = getSupabaseAdminClient()
  const payload = {
    tenant_id: input.tenantId,
    title: input.title,
    address: input.address ?? null,
    area: input.area ?? null,
    type: input.type ?? null,
    status: input.status ?? "available",
    price: input.price ?? null,
    size: input.size ?? null,
    bedrooms: input.bedrooms ?? null,
    bathrooms: input.bathrooms ?? null,
    readiness: input.readiness ?? null,
    developer: input.developer ?? null,
    expected_rent: input.expectedRent ?? null,
    currency: input.currency ?? null,
    handover_date: input.handoverDate ?? null,
    attachments: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  const { data, error } = await supabase.from("listings").insert(payload).select("*").maybeSingle()
  if (error) throw error
  return data ? mapListingRow(data) : null
}

export async function updateListingDb(id: string, patch: Partial<ListingRecord>) {
  const supabase = getSupabaseAdminClient()
  const payload: Record<string, unknown> = {}
  if (patch.title !== undefined) payload.title = patch.title
  if (patch.address !== undefined) payload.address = patch.address
  if (patch.area !== undefined) payload.area = patch.area
  if (patch.type !== undefined) payload.type = patch.type
  if (patch.status !== undefined) payload.status = patch.status
  if (patch.price !== undefined) payload.price = patch.price
  if (patch.size !== undefined) payload.size = patch.size
  if (patch.bedrooms !== undefined) payload.bedrooms = patch.bedrooms
  if (patch.bathrooms !== undefined) payload.bathrooms = patch.bathrooms
  if (patch.readiness !== undefined) payload.readiness = patch.readiness
  if (patch.developer !== undefined) payload.developer = patch.developer
  if (patch.expectedRent !== undefined) payload.expected_rent = patch.expectedRent
  if (patch.currency !== undefined) payload.currency = patch.currency
  if (patch.handoverDate !== undefined) payload.handover_date = patch.handoverDate

  if (Object.keys(payload).length === 0) {
    const current = await getListingById(id)
    return current
  }

  payload.updated_at = new Date().toISOString()

  const { data, error } = await supabase.from("listings").update(payload).eq("id", id).select("*").maybeSingle()
  if (error) throw error
  return data ? mapListingRow(data) : null
}

export async function deleteListingDb(id: string) {
  const supabase = getSupabaseAdminClient()
  const { error } = await supabase.from("listings").delete().eq("id", id)
  if (error) throw error
  return true
}

