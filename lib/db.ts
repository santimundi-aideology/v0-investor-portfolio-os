import "server-only"

import { getSupabaseAdminClient } from "@/lib/db/client"

export { getSupabaseAdminClient }
export type { SupabaseClient } from "@supabase/supabase-js"

export type SnapshotRow = {
  id: string
  org_id: string
  source: string
  metric: string
  geo_type: string
  geo_id: string
  geo_name?: string | null
  segment: string
  timeframe: string
  value: number
  sample_size?: number | null
  window_start: string
  window_end: string
}

export type SnapshotPair = {
  source: string
  metric: string
  geo_type: string
  geo_id: string
  geo_name?: string | null
  segment: string
  current: SnapshotRow
  prev: SnapshotRow | null
}

type UpsertMarketSignalInput = Record<string, unknown> & { signal_key: string; org_id: string }

async function safeSelectSnapshots(
  table: string,
  orgId: string,
  timeframe: string
): Promise<SnapshotRow[]> {
  try {
    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("org_id", orgId)
      .eq("timeframe", timeframe)
      .order("window_end", { ascending: true })

    if (error) throw error
    return (data ?? []) as SnapshotRow[]
  } catch (e) {
    // Table likely doesn't exist yet in this repo; keep jobs safe by returning empty.
    console.warn(`[db] unable to select from ${table}; returning [].`, e)
    return []
  }
}

function buildPairs(rows: SnapshotRow[]): SnapshotPair[] {
  const groups = new Map<string, SnapshotRow[]>()
  for (const r of rows) {
    const k = [r.source, r.metric, r.geo_type, r.geo_id, r.segment].join("|")
    const list = groups.get(k) ?? []
    list.push(r)
    groups.set(k, list)
  }

  const out: SnapshotPair[] = []
  for (const list of groups.values()) {
    list.sort((a, b) => a.window_end.localeCompare(b.window_end))
    for (let i = 0; i < list.length; i++) {
      out.push({
        source: list[i].source,
        metric: list[i].metric,
        geo_type: list[i].geo_type,
        geo_id: list[i].geo_id,
        geo_name: list[i].geo_name ?? null,
        segment: list[i].segment,
        current: list[i],
        prev: i > 0 ? list[i - 1] : null,
      })
    }
  }
  return out
}

export type PortalSnapshotRow = {
  id: string
  org_id: string
  portal: string
  geo_type: string
  geo_id: string
  geo_name?: string | null
  segment: string
  timeframe: string
  as_of_date: string
  active_listings: number
  price_cuts_count?: number | null
  stale_listings_count?: number | null
}

export type PortalSnapshotPair = {
  portal: string
  geo_type: string
  geo_id: string
  geo_name?: string | null
  segment: string
  timeframe: string
  current: PortalSnapshotRow
  prev: PortalSnapshotRow | null
}

async function safeSelectPortalSnapshots(
  table: string,
  orgId: string,
  timeframe: string
): Promise<PortalSnapshotRow[]> {
  try {
    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("org_id", orgId)
      .eq("timeframe", timeframe)
      .order("as_of_date", { ascending: true })

    if (error) throw error
    return (data ?? []) as PortalSnapshotRow[]
  } catch (e) {
    console.warn(`[db] unable to select from ${table}; returning [].`, e)
    return []
  }
}

function buildPortalPairs(rows: PortalSnapshotRow[]): PortalSnapshotPair[] {
  const groups = new Map<string, PortalSnapshotRow[]>()
  for (const r of rows) {
    const k = [r.portal, r.geo_type, r.geo_id, r.segment, r.timeframe].join("|")
    const list = groups.get(k) ?? []
    list.push(r)
    groups.set(k, list)
  }

  const out: PortalSnapshotPair[] = []
  for (const list of groups.values()) {
    list.sort((a, b) => a.as_of_date.localeCompare(b.as_of_date))
    for (let i = 0; i < list.length; i++) {
      out.push({
        portal: list[i].portal,
        geo_type: list[i].geo_type,
        geo_id: list[i].geo_id,
        geo_name: list[i].geo_name ?? null,
        segment: list[i].segment,
        timeframe: list[i].timeframe,
        current: list[i],
        prev: i > 0 ? list[i - 1] : null,
      })
    }
  }
  return out
}

export const db = {
  /**
   * Returns ordered snapshot pairs for QoQ logic. Backed by `truth_snapshots` when present.
   */
  async getTruthSnapshotPairs(orgId: string, timeframe: string): Promise<SnapshotPair[]> {
    const rows = await safeSelectSnapshots("truth_snapshots", orgId, timeframe)
    return buildPairs(rows)
  },

  /**
   * Returns ordered snapshot pairs for WoW logic. Backed by `portal_snapshots` when present.
   */
  async getPortalSnapshotPairs(orgId: string, timeframe: string): Promise<PortalSnapshotPair[]> {
    const rows = await safeSelectPortalSnapshots("portal_snapshots", orgId, timeframe)
    return buildPortalPairs(rows)
  },

  /**
   * Upserts market signals into `market_signal` when present; otherwise logs and no-ops.
   * Returns the number of rows upserted (or 0 if table doesn't exist).
   */
  async upsertMarketSignals(rows: UpsertMarketSignalInput[]): Promise<number> {
    if (rows.length === 0) return 0
    try {
      const supabase = getSupabaseAdminClient()
      const { data, error } = await supabase
        .from("market_signal")
        .upsert(rows, { onConflict: "signal_key" })
        .select("id")
      if (error) throw error
      return data?.length ?? rows.length
    } catch (e) {
      console.warn("[db] unable to upsert into market_signal; skipping.", e)
      return 0
    }
  },
}


