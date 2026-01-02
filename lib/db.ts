import "server-only"

import { getSupabaseAdminClient } from "@/lib/db/client"

export { getSupabaseAdminClient }
export type { SupabaseClient } from "@supabase/supabase-js"

/**
 * MARKET SIGNALS - SNAPSHOT READS (AUDIT NOTE)
 * -------------------------------------------
 * Codebase audit finding:
 * - Earlier scaffold code referenced placeholder tables `truth_snapshots` and `portal_snapshots`.
 * - CRITICAL ARCHITECTURE (non-negotiable): Market Signals must ONLY read from:
 *     - `market_metric_snapshot`
 *     - `portal_listing_snapshot`
 *
 * This module is the single adapter used by detectors (`detectSignalsTruth`/`detectSignalsPortal`).
 * If you ever need to change snapshot table names, do it here and update migrations accordingly.
 */

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

    // IMPORTANT (hardening):
    // - For WoW signals we must compare *week-over-week*, not "previous snapshot in time".
    // - If snapshots are daily, using i-1 would create day-over-day deltas and can violate WoW semantics.
    // - Therefore, for timeframe === "WoW", we only pair with the snapshot exactly 7 days prior (if present).
    const byDate = new Map<string, PortalSnapshotRow>()
    for (const r of list) byDate.set(r.as_of_date, r)

    for (const r of list) {
      let prev: PortalSnapshotRow | null = null
      if (r.timeframe === "WoW") {
        const prevDate = isoDate(addDays(parseIsoDate(r.as_of_date), -7))
        prev = byDate.get(prevDate) ?? null
      } else {
        // Fallback: adjacent pairing for any other timeframe (not used by current pipeline).
        const idx = list.findIndex((x) => x.id === r.id)
        prev = idx > 0 ? list[idx - 1] : null
      }

      out.push({
        portal: r.portal,
        geo_type: r.geo_type,
        geo_id: r.geo_id,
        geo_name: r.geo_name ?? null,
        segment: r.segment,
        timeframe: r.timeframe,
        current: r,
        prev,
      })
    }
  }
  return out
}

function parseIsoDate(s: string) {
  // `as_of_date` is stored as DATE; Supabase returns YYYY-MM-DD.
  // We parse as UTC midnight to keep deterministic -7 day math.
  return new Date(`${s}T00:00:00Z`)
}

function addDays(d: Date, days: number) {
  const out = new Date(d.getTime())
  out.setUTCDate(out.getUTCDate() + days)
  return out
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

export const db = {
  /**
   * Returns ordered snapshot pairs for QoQ logic.
   *
   * IMPORTANT: signals read ONLY from `market_metric_snapshot`.
   */
  async getTruthSnapshotPairs(orgId: string, timeframe: string): Promise<SnapshotPair[]> {
    const rows = await safeSelectSnapshots("market_metric_snapshot", orgId, timeframe)
    return buildPairs(rows)
  },

  /**
   * Returns ordered snapshot pairs for WoW logic.
   *
   * IMPORTANT: signals read ONLY from `portal_listing_snapshot`.
   */
  async getPortalSnapshotPairs(orgId: string, timeframe: string): Promise<PortalSnapshotPair[]> {
    const rows = await safeSelectPortalSnapshots("portal_listing_snapshot", orgId, timeframe)
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


