import "server-only"

import { getSupabaseAdminClient } from "@/lib/db/client"

/**
 * STEP 2 — SNAPSHOT COMPUTATION (PORTAL)
 * -------------------------------------
 * Market Signals NEVER read raw data directly.
 * This job reads raw portal ingestion rows and writes ONLY to `portal_listing_snapshot`.
 *
 * Input (raw):
 *  - `raw_portal_listings` (daily observed listing states)
 *
 * Output (snapshot):
 *  - `portal_listing_snapshot` with aggregated daily inventory metrics
 *
 * Metrics per (portal, geo_type, geo_id, segment, as_of_date):
 *  - active_listings
 *  - price_cuts_count
 *  - stale_listings_count (days_on_market >= 60)
 *
 * Idempotency:
 *  - upsert on (org_id, portal, geo_type, geo_id, segment, timeframe, as_of_date)
 */
export async function computePortalSnapshots(orgId: string): Promise<{ snapshotsCreated: number }> {
  const supabase = getSupabaseAdminClient()
  const started = Date.now()

  // Fetch last ~28 days of portal rows, then compute snapshots for:
  // - latest as_of_date
  // - exactly 7 days prior (WoW comparison)
  //
  // This avoids accidentally computing day-over-day deltas while labeling them "WoW".
  const since = new Date()
  since.setDate(since.getDate() - 28)
  const sinceIso = since.toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from("raw_portal_listings")
    .select("portal, listing_id, as_of_date, geo_type, geo_id, geo_name, segment, is_active, had_price_cut, days_on_market")
    .eq("org_id", orgId)
    .gte("as_of_date", sinceIso)

  if (error) throw error

  const rows = (data ?? []) as Array<{
    portal: string
    listing_id: string
    as_of_date: string
    geo_type: string
    geo_id: string
    geo_name?: string | null
    segment: string
    is_active: boolean
    had_price_cut: boolean
    days_on_market?: number | null
  }>

  if (rows.length === 0) {
    console.log(`[computePortalSnapshots] orgId=${orgId} no raw portal rows found; snapshotsCreated=0`)
    return { snapshotsCreated: 0 }
  }

  const dates = Array.from(new Set(rows.map((r) => r.as_of_date))).sort()
  const latest = dates[dates.length - 1]
  const prevWeek = latest ? isoDate(addDays(parseIsoDate(latest), -7)) : null
  const selectedDates = latest && prevWeek && dates.includes(prevWeek) ? [prevWeek, latest] : latest ? [latest] : []
  const timeframe = "WoW"

  const snapshotRows: Array<Record<string, unknown>> = []
  const STALE_DAYS = 60

  for (const asOf of selectedDates) {
    const onDay = rows.filter((r) => r.as_of_date === asOf)
    const groups = groupBy(onDay, (r) => `${r.portal}|${r.geo_type}|${r.geo_id}|${r.segment}`)

    for (const [k, list] of groups) {
      const [portal, geo_type, geo_id, segment] = k.split("|")
      const geo_name = list.find((x) => x.geo_name)?.geo_name ?? null

      const active = list.filter((r) => r.is_active).length
      const cuts = list.filter((r) => r.is_active && r.had_price_cut).length
      const stale = list.filter((r) => r.is_active && (r.days_on_market ?? 0) >= STALE_DAYS).length

      snapshotRows.push({
        org_id: orgId,
        portal,
        geo_type,
        geo_id,
        geo_name,
        segment,
        timeframe,
        as_of_date: asOf,
        active_listings: active,
        price_cuts_count: cuts,
        stale_listings_count: stale,
        evidence: {
          raw_table: "raw_portal_listings",
          row_count: list.length,
          stale_days_threshold: STALE_DAYS,
          wow_anchor: latest,
          wow_prev: prevWeek,
        },
      })
    }
  }

  if (selectedDates.length === 1) {
    console.warn(
      `[computePortalSnapshots] orgId=${orgId} only one snapshot date available (${selectedDates[0]}). ` +
        `WoW detection requires snapshots 7 days apart; portal signals may be 0 until enough history exists.`
    )
  }

  const { data: upserted, error: upsertErr } = await supabase
    .from("portal_listing_snapshot")
    .upsert(snapshotRows, { onConflict: "org_id,portal,geo_type,geo_id,segment,timeframe,as_of_date" })
    .select("id")

  if (upsertErr) throw upsertErr

  const duration = Date.now() - started
  console.log(
    `[computePortalSnapshots] orgId=${orgId} raw=${rows.length} computed=${snapshotRows.length} upserted=${upserted?.length ?? 0} in ${duration}ms`
  )

  return { snapshotsCreated: upserted?.length ?? 0 }
}

function groupBy<T>(rows: T[], keyFn: (row: T) => string) {
  const m = new Map<string, T[]>()
  for (const r of rows) {
    const k = keyFn(r)
    const list = m.get(k) ?? []
    list.push(r)
    m.set(k, list)
  }
  return m
}

function parseIsoDate(s: string) {
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


