import { SIGNAL_THRESHOLDS } from "../../config/marketSignals"
import type { InvestorWithMandate, MarketSignalRow, SignalTargetUpsertRow } from "../../lib/db/signals"
import { getInvestorGeoExposure, getInvestorsWithMandates, getUnmappedSignals, upsertSignalTargets } from "../../lib/db/signals"

export type MapSignalsSummary = {
  signalsProcessed: number
  targetsCreated: number
  targetsSkipped: number
  nextCursor: string | null
}

export type MapSignalsOptions = {
  batchSize?: number
  cursor?: string
  maxBatches?: number
}

function clamp01(n: number) {
  if (n < 0) return 0
  if (n > 1) return 1
  return n
}

function isPriceRelatedMetric(metric: string) {
  const m = (metric ?? "").toLowerCase()
  return m.includes("price") || m.includes("ask") || m.includes("psf")
}

function coerceNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string") {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  return null
}

export async function computeTargetsForSignal(args: {
  orgId: string
  signal: MarketSignalRow
  investors: InvestorWithMandate[]
  getExposure: (orgId: string, investorId: string, geoId: string) => Promise<{ hasExposure: boolean; details: Record<string, unknown> }>
}) {
  const { orgId, signal, investors, getExposure } = args

  const out: SignalTargetUpsertRow[] = []
  const skipped: { investorId: string; reason: string }[] = []

  // Basic validation / missing fields
  if (!signal?.id || !signal?.geo_id || !signal?.type || !signal?.metric) {
    console.warn("[mapSignalsToInvestors] skipping signal with missing fields", { signalId: signal?.id })
    return { rows: out, skipped, signalSkipped: true }
  }

  for (const inv of investors) {
    if (!inv?.id) continue

    let score = 0
    const matched: string[] = []
    const details: Record<string, unknown> = {}

    const mandate = inv.mandate ?? {}

    // --- Yield match gate (only for yield_opportunity) ---
    if (signal.type === "yield_opportunity") {
      const target = coerceNumber(mandate.yield_target)
      if (target === null) {
        skipped.push({ investorId: inv.id, reason: "missing_yield_target" })
        continue
      }
      if (signal.current_value >= target) {
        score += 0.3
        matched.push("yield")
        details.yield = { yield_target: target, signal_yield: signal.current_value }
      } else {
        skipped.push({ investorId: inv.id, reason: "yield_below_target" })
        continue
      }
    }

    // --- Area match ---
    const preferredAreas = (mandate.preferred_areas ?? []) as string[]
    const preferredProjects = (mandate.preferred_projects ?? []) as string[]
    const open = Boolean(mandate.open) || (preferredAreas.length === 0 && preferredProjects.length === 0)

    const areaMatched = preferredAreas.includes(signal.geo_id) || preferredProjects.includes(signal.geo_id)
    if (areaMatched) {
      score += 0.35
      matched.push("area")
      details.area = { matched_geo_id: signal.geo_id }
    } else if (open) {
      score += 0.15
      matched.push("area_open")
      details.area = { open: true }
    } else {
      details.area = { open: false, preferred_areas: preferredAreas, preferred_projects: preferredProjects }
    }

    // --- Budget match ---
    const priceRelated = isPriceRelatedMetric(signal.metric)
    const budgetMin = coerceNumber(mandate.budget_min)
    const budgetMax = coerceNumber(mandate.budget_max)

    if (!priceRelated || budgetMin === null || budgetMax === null) {
      score += 0.1
      matched.push("budget_soft")
      details.budget = { applied: "soft", price_related: priceRelated, budget_min: budgetMin, budget_max: budgetMax }
    } else {
      const within = signal.current_value >= budgetMin && signal.current_value <= budgetMax
      details.budget = { applied: "hard", price_related: true, budget_min: budgetMin, budget_max: budgetMax, within }
      if (within) {
        score += 0.25
        matched.push("budget")
      }
    }

    // --- Portfolio exposure boost (hook) ---
    const exposure = await getExposure(orgId, inv.id, signal.geo_id)
    if (exposure?.hasExposure) {
      score += 0.1
      matched.push("portfolio_exposure")
      details.portfolio_exposure = exposure.details ?? { geo_id: signal.geo_id }
    }

    // --- Risk tolerance cap ---
    const riskyTypes = new Set(["risk_flag", "discounting_spike", "supply_spike", "staleness_rise"])
    const riskTolerance = (mandate.risk_tolerance ?? "medium") as string
    if (riskyTypes.has(signal.type) && riskTolerance === "low") {
      if (score > 0.65) score = 0.65
      details.risk_note = "low_risk_tolerance_cap_applied"
    }

    score = clamp01(score)

    if (score < 0.35) {
      skipped.push({ investorId: inv.id, reason: "below_threshold" })
      continue
    }

    out.push({
      org_id: orgId,
      signal_id: signal.id,
      investor_id: inv.id,
      relevance_score: score,
      reason: {
        matched,
        details,
        thresholds_used: {
          portal: SIGNAL_THRESHOLDS.portal,
          truth: SIGNAL_THRESHOLDS.truth,
          mapping: {
            min_score: 0.35,
            area_match: 0.35,
            area_open: 0.15,
            budget_match: 0.25,
            budget_soft: 0.1,
            yield_match: 0.3,
            portfolio_exposure: 0.1,
            low_risk_cap: 0.65,
          },
        },
      },
      status: "new",
    })
  }

  return { rows: out, skipped, signalSkipped: false }
}

/**
 * Step 4: map unmapped market signals to investors.
 * - Multi-tenant: filters by org_id
 * - Idempotent: upsert into market_signal_target
 * - Batched: pagination via cursor
 */
export async function mapSignalsToInvestors(orgId: string, options: MapSignalsOptions = {}): Promise<MapSignalsSummary> {
  const batchSize = options.batchSize ?? 50
  const maxBatches = options.maxBatches ?? 10

  const investors = await getInvestorsWithMandates(orgId)

  let cursor = options.cursor ?? null
  let signalsProcessed = 0
  let targetsCreated = 0
  let targetsSkipped = 0

  for (let b = 0; b < maxBatches; b++) {
    const page = await getUnmappedSignals(orgId, { limit: batchSize, cursor: cursor ?? undefined })
    cursor = page.nextCursor

    if (page.signals.length === 0) break

    for (const signal of page.signals) {
      signalsProcessed += 1

      try {
        const { rows, skipped, signalSkipped } = await computeTargetsForSignal({
          orgId,
          signal,
          investors,
          getExposure: getInvestorGeoExposure,
        })

        if (signalSkipped) {
          targetsSkipped += 1
          continue
        }

        if (rows.length === 0) {
          targetsSkipped += skipped.length
          continue
        }

        await upsertSignalTargets(rows)
        targetsCreated += rows.length
        targetsSkipped += skipped.length
      } catch (e) {
        console.warn("[mapSignalsToInvestors] error mapping signal; skipping", { signalId: signal?.id, error: e })
        targetsSkipped += 1
      }
    }

    if (!cursor) break
  }

  return { signalsProcessed, targetsCreated, targetsSkipped, nextCursor: cursor }
}


