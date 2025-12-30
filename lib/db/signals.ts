import "server-only"

import { getSupabaseAdminClient } from "@/lib/db/client"

export type MarketSignalRow = {
  id: string
  org_id: string
  source_type: "official" | "portal"
  source: string
  type: string
  geo_type: string
  geo_id: string
  geo_name?: string | null
  segment: string
  metric: string
  timeframe: string
  current_value: number
  prev_value?: number | null
  delta_value?: number | null
  delta_pct?: number | null
  confidence_score?: number | null
  evidence?: unknown
  signal_key: string
}

export type InvestorWithMandate = {
  id: string
  org_id: string
  name?: string | null
  // mandate fields we need for deterministic matching
  mandate: {
    preferred_areas?: string[] | null
    preferred_projects?: string[] | null
    open?: boolean | null
    budget_min?: number | null
    budget_max?: number | null
    yield_target?: number | string | null
    risk_tolerance?: "low" | "medium" | "high" | string | null
  }
}

export type SignalTargetUpsertRow = {
  org_id: string
  signal_id: string
  investor_id: string
  relevance_score: number
  reason: unknown
  status: "new" | string
}

export type UnmappedSignalsPage = {
  signals: MarketSignalRow[]
  nextCursor: string | null
}

type GetUnmappedSignalsOptions = {
  limit?: number
  cursor?: string // last seen signal id
}

function clamp01(n: number) {
  if (n < 0) return 0
  if (n > 1) return 1
  return n
}

/**
 * Fetch market signals that have NOT been mapped to any investors yet.
 *
 * Definition of "unmapped": there are zero rows in `market_signal_target` for that signal_id.
 * Supports cursor pagination via `id` ordering.
 */
export async function getUnmappedSignals(orgId: string, options: GetUnmappedSignalsOptions = {}): Promise<UnmappedSignalsPage> {
  const limit = options.limit ?? 100
  const pageScan = Math.max(limit * 3, 200) // scan more to compensate for filtering mapped signals

  const supabase = getSupabaseAdminClient()

  // We may need multiple scans to fill `limit` unmapped signals.
  let cursor = options.cursor ?? null
  const out: MarketSignalRow[] = []

  while (out.length < limit) {
    let q = supabase
      .from("market_signal")
      .select("*")
      .eq("org_id", orgId)
      .order("id", { ascending: true })
      .limit(pageScan)

    if (cursor) q = q.gt("id", cursor)

    const { data: signals, error } = await q
    if (error) throw error

    const batch = ((signals ?? []) as MarketSignalRow[]).filter((s) => s && s.id && s.org_id === orgId)
    if (batch.length === 0) return { signals: out, nextCursor: null }

    cursor = batch[batch.length - 1]!.id

    // Check which of these already have targets
    const ids = batch.map((s) => s.id)
    const { data: targets, error: targetsErr } = await supabase
      .from("market_signal_target")
      .select("signal_id")
      .eq("org_id", orgId)
      .in("signal_id", ids)

    if (targetsErr) throw targetsErr

    const mapped = new Set<string>((targets ?? []).map((t: Record<string, unknown>) => t.signal_id as string).filter(Boolean))

    for (const s of batch) {
      if (!mapped.has(s.id)) out.push(s)
      if (out.length >= limit) break
    }
  }

  return { signals: out, nextCursor: cursor }
}

/**
 * Idempotently upsert mapping rows into `market_signal_target`.
 * Expected uniqueness: (org_id, signal_id, investor_id)
 */
export async function upsertSignalTargets(rows: SignalTargetUpsertRow[]) {
  if (rows.length === 0) return
  const supabase = getSupabaseAdminClient()
  const { error } = await supabase
    .from("market_signal_target")
    .upsert(rows, { onConflict: "org_id,signal_id,investor_id" })
  if (error) throw error
}

/**
 * Adapter: fetch investors and their mandates.
 *
 * We try a few likely schemas:
 * - `investor` + `investor_mandate`
 * - `investor` with `mandate` jsonb
 * - `investors` with `mandate` jsonb (legacy in this repo)
 */
export async function getInvestorsWithMandates(orgId: string): Promise<InvestorWithMandate[]> {
  const supabase = getSupabaseAdminClient()

  // 1) Try `investor` table with `investor_mandate` relationship
  try {
    const { data, error } = await supabase
      .from("investor")
      .select("id, org_id, name, investor_mandate:investor_mandate(mandate)")
      .eq("org_id", orgId)
    if (error) throw error
    const mapped = (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id,
      org_id: row.org_id,
      name: row.name ?? null,
      mandate: (row.investor_mandate?.[0]?.mandate ?? {}) as InvestorWithMandate["mandate"],
    }))
    return mapped
  } catch {
    // fall through
  }

  // 2) Try `investor` table with `mandate` column
  try {
    const { data, error } = await supabase.from("investor").select("id, org_id, name, mandate").eq("org_id", orgId)
    if (error) throw error
    return (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id,
      org_id: row.org_id,
      name: row.name ?? null,
      mandate: (row.mandate ?? {}) as InvestorWithMandate["mandate"],
    }))
  } catch {
    // fall through
  }

  // 3) Try repo's existing `investors` table keyed by tenant_id (treat tenant_id == org_id)
  try {
    const { data, error } = await supabase.from("investors").select("id, tenant_id, name, mandate").eq("tenant_id", orgId)
    if (error) throw error
    return (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id,
      org_id: row.tenant_id,
      name: row.name ?? null,
      mandate: (row.mandate ?? {}) as InvestorWithMandate["mandate"],
    }))
  } catch (e) {
    console.warn("[db/signals] unable to load investors/mandates; returning [].", e)
    return []
  }
}

/**
 * Portfolio exposure hook.
 * If your schema has holdings/portfolio tables, wire them here.
 */
export async function getInvestorGeoExposure(_orgId: string, _investorId: string, _geoId: string) {
  return { hasExposure: false, details: null as Record<string, unknown> | null }
}

export const signalDbUtils = { clamp01 }


