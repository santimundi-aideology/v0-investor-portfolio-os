import "server-only"

import { getSupabaseAdminClient } from "@/lib/db/client"

/**
 * STEP 2 — SNAPSHOT COMPUTATION (TRUTH)
 * ------------------------------------
 * Market Signals NEVER read raw data directly.
 * This job reads raw ingestion tables and writes ONLY to `market_metric_snapshot`.
 *
 * Inputs (raw tables):
 *  - `raw_dld_transactions` (sale transactions)
 *  - `raw_ejari_contracts` (rental contracts)
 *
 * Output (snapshot table):
 *  - `market_metric_snapshot`
 *
 * Metrics computed per (geo_type, geo_id, segment, quarter):
 *  - median_price_psf      (from DLD sale_price / area_sqft)
 *  - median_rent_annual    (from Ejari annual_rent)
 *  - gross_yield           (derived: median_rent_annual / median_sale_price)
 *
 * Idempotency:
 *  - upsert on (org_id, source, metric, geo_type, geo_id, segment, timeframe, window_end)
 *
 * NOTE: `orgId` here is treated as the tenant UUID (see `app/api/jobs/run-signals`).
 */
export async function computeTruthSnapshots(orgId: string): Promise<{ snapshotsCreated: number }> {
  const supabase = getSupabaseAdminClient()
  const started = Date.now()

  // --- CODEBASE AUDIT (mandatory, inline) ---
  // Findings:
  // - Detectors exist (`detectSignalsTruth.ts`) but were starved because snapshot writers were stubs.
  // - Detectors read snapshots via `lib/db.ts`. We updated that adapter to read `market_metric_snapshot`
  //   per the "NON-NEGOTIABLE" architecture. Previously it pointed at placeholder `truth_snapshots`.

  // Fetch raw sales (DLD) and rents (Ejari) for the last ~9 months (enough to cover 2 full quarters).
  const since = new Date()
  since.setMonth(since.getMonth() - 9)
  const sinceIso = since.toISOString().slice(0, 10)

  const [{ data: dldRows, error: dldErr }, { data: ejariRows, error: ejariErr }] = await Promise.all([
    supabase
      .from("raw_dld_transactions")
      .select("transaction_date, geo_type, geo_id, geo_name, segment, sale_price, area_sqft")
      .eq("org_id", orgId)
      .gte("transaction_date", sinceIso),
    supabase
      .from("raw_ejari_contracts")
      .select("contract_start, geo_type, geo_id, geo_name, segment, annual_rent")
      .eq("org_id", orgId)
      .gte("contract_start", sinceIso),
  ])

  if (dldErr) throw dldErr
  if (ejariErr) throw ejariErr

  const dld = (dldRows ?? []) as Array<{
    transaction_date: string
    geo_type: string
    geo_id: string
    geo_name?: string | null
    segment: string
    sale_price: number
    area_sqft?: number | null
  }>

  const ejari = (ejariRows ?? []) as Array<{
    contract_start: string
    geo_type: string
    geo_id: string
    geo_name?: string | null
    segment: string
    annual_rent: number
  }>

  if (dld.length === 0 && ejari.length === 0) {
    console.log(`[computeTruthSnapshots] orgId=${orgId} no raw rows found; snapshotsCreated=0`)
    return { snapshotsCreated: 0 }
  }

  // Determine the latest two quarters present (based on max date across both feeds).
  const maxDateStr = [dld.map((r) => r.transaction_date), ejari.map((r) => r.contract_start)].flat().sort().slice(-1)[0]
  const maxDate = maxDateStr ? new Date(maxDateStr) : new Date()

  const quarters = getLastNQuarters(maxDate, 2)
  const timeframe = "QoQ"

  const snapshotRows: Array<Record<string, unknown>> = []

  for (const q of quarters) {
    const dldInQ = dld.filter((r) => r.transaction_date >= q.start && r.transaction_date <= q.end)
    const ejariInQ = ejari.filter((r) => r.contract_start >= q.start && r.contract_start <= q.end)

    // Group DLD by geo+segment
    const dldGroups = groupBy(dldInQ, (r) => `${r.geo_type}|${r.geo_id}|${r.segment}`)
    for (const [k, rows] of dldGroups) {
      const [geo_type, geo_id, segment] = k.split("|")
      const geo_name = rows.find((x) => x.geo_name)?.geo_name ?? null

      const pricePsf = rows
        .map((r) => {
          const sqft = r.area_sqft ?? null
          if (!sqft || sqft <= 0) return null
          return r.sale_price / sqft
        })
        .filter((n): n is number => typeof n === "number" && Number.isFinite(n) && n > 0)

      const salePrices = rows
        .map((r) => r.sale_price)
        .filter((n): n is number => typeof n === "number" && Number.isFinite(n) && n > 0)

      if (pricePsf.length > 0) {
        snapshotRows.push({
          org_id: orgId,
          source: "official_dld",
          metric: "median_price_psf",
          geo_type,
          geo_id,
          geo_name,
          segment,
          timeframe,
          window_start: q.start,
          window_end: q.end,
          value: median(pricePsf),
          sample_size: pricePsf.length,
          evidence: { raw_table: "raw_dld_transactions", sample_size: pricePsf.length },
        })
      }

      // Keep median sale_price for yield derivation (not stored as a snapshot metric).
      if (salePrices.length > 0) {
        // stash in memory via map
        // (we'll recompute later by key; this is intentionally deterministic)
      }
    }

    // Group Ejari by geo+segment
    const ejariGroups = groupBy(ejariInQ, (r) => `${r.geo_type}|${r.geo_id}|${r.segment}`)
    for (const [k, rows] of ejariGroups) {
      const [geo_type, geo_id, segment] = k.split("|")
      const geo_name = rows.find((x) => x.geo_name)?.geo_name ?? null

      const rents = rows
        .map((r) => r.annual_rent)
        .filter((n): n is number => typeof n === "number" && Number.isFinite(n) && n > 0)

      if (rents.length > 0) {
        snapshotRows.push({
          org_id: orgId,
          source: "official_ejari",
          metric: "median_rent_annual",
          geo_type,
          geo_id,
          geo_name,
          segment,
          timeframe,
          window_start: q.start,
          window_end: q.end,
          value: median(rents),
          sample_size: rents.length,
          evidence: { raw_table: "raw_ejari_contracts", sample_size: rents.length },
        })
      }
    }

    // Derived gross_yield (median_rent_annual / median_sale_price)
    // We recompute medians deterministically from raw inputs per quarter/key.
    const keys = new Set<string>([
      ...dldInQ.map((r) => `${r.geo_type}|${r.geo_id}|${r.segment}`),
      ...ejariInQ.map((r) => `${r.geo_type}|${r.geo_id}|${r.segment}`),
    ])
    for (const key of keys) {
      const [geo_type, geo_id, segment] = key.split("|")

      const salePrices = dldInQ
        .filter((r) => r.geo_type === geo_type && r.geo_id === geo_id && r.segment === segment)
        .map((r) => r.sale_price)
        .filter((n): n is number => typeof n === "number" && Number.isFinite(n) && n > 0)

      const rents = ejariInQ
        .filter((r) => r.geo_type === geo_type && r.geo_id === geo_id && r.segment === segment)
        .map((r) => r.annual_rent)
        .filter((n): n is number => typeof n === "number" && Number.isFinite(n) && n > 0)

      if (salePrices.length === 0 || rents.length === 0) continue

      const mSale = median(salePrices)
      if (!Number.isFinite(mSale) || mSale <= 0) continue
      const mRent = median(rents)
      const yieldVal = mRent / mSale
      const geo_name =
        dldInQ.find((r) => r.geo_type === geo_type && r.geo_id === geo_id && r.segment === segment)?.geo_name ??
        ejariInQ.find((r) => r.geo_type === geo_type && r.geo_id === geo_id && r.segment === segment)?.geo_name ??
        null

      snapshotRows.push({
        org_id: orgId,
        source: "derived",
        metric: "gross_yield",
        geo_type,
        geo_id,
        geo_name,
        segment,
        timeframe,
        window_start: q.start,
        window_end: q.end,
        value: yieldVal,
        sample_size: Math.min(salePrices.length, rents.length),
        evidence: {
          derived_from: {
            median_sale_price: mSale,
            sale_sample_size: salePrices.length,
            median_rent_annual: mRent,
            rent_sample_size: rents.length,
          },
        },
      })
    }
  }

  if (snapshotRows.length === 0) {
    console.log(`[computeTruthSnapshots] orgId=${orgId} computed 0 snapshots (raw rows present but insufficient data)`)
    return { snapshotsCreated: 0 }
  }

  const { data: upserted, error: upsertErr } = await supabase
    .from("market_metric_snapshot")
    .upsert(snapshotRows, {
      onConflict: "org_id,source,metric,geo_type,geo_id,segment,timeframe,window_end",
    })
    .select("id")

  if (upsertErr) throw upsertErr

  const duration = Date.now() - started
  console.log(
    `[computeTruthSnapshots] orgId=${orgId} raw(dld=${dld.length},ejari=${ejari.length}) computed=${snapshotRows.length} upserted=${upserted?.length ?? 0} in ${duration}ms`
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

function median(values: number[]) {
  const a = [...values].sort((x, y) => x - y)
  const n = a.length
  if (n === 0) return 0
  const mid = Math.floor(n / 2)
  return n % 2 === 0 ? (a[mid - 1]! + a[mid]!) / 2 : a[mid]!
}

function toIsoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function getLastNQuarters(anchor: Date, n: number): Array<{ start: string; end: string }> {
  const out: Array<{ start: string; end: string }> = []
  // Normalize to date-only
  const y = anchor.getUTCFullYear()
  const m = anchor.getUTCMonth() // 0..11
  const q = Math.floor(m / 3) // 0..3

  for (let i = 0; i < n; i++) {
    const qIndex = q - i
    const year = y + Math.floor(qIndex / 4)
    const qMod = ((qIndex % 4) + 4) % 4
    const startMonth = qMod * 3
    const start = new Date(Date.UTC(year, startMonth, 1))
    const end = new Date(Date.UTC(year, startMonth + 3, 0)) // day 0 of next quarter = last day of quarter
    out.push({ start: toIsoDate(start), end: toIsoDate(end) })
  }
  // oldest -> newest so downstream pairing by window_end is correct
  return out.reverse()
}


