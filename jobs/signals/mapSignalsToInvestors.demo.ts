import type { InvestorWithMandate, MarketSignalRow } from "../../lib/db/signals"
import { computeTargetsForSignal } from "./mapSignalsToInvestors"

/**
 * Minimal unit-test-like demo (no external libs).
 * Run by importing/calling from anywhere (e.g. a script or a one-off route).
 */
export async function runMapSignalsToInvestorsDemo() {
  const orgId = "org_demo"

  const investors: InvestorWithMandate[] = [
    {
      id: "inv-a",
      org_id: orgId,
      name: "Low Risk Marina",
      mandate: {
        preferred_areas: ["dubai_marina"],
        budget_min: 1_000_000,
        budget_max: 3_000_000,
        yield_target: 0.06,
        risk_tolerance: "low",
      },
    },
    {
      id: "inv-b",
      org_id: orgId,
      name: "Open Mandate",
      mandate: { open: true, risk_tolerance: "medium" },
    },
  ]

  const signal: MarketSignalRow = {
    id: "sig-1",
    org_id: orgId,
    source_type: "portal",
    source: "propertyfinder",
    type: "supply_spike",
    geo_type: "area",
    geo_id: "dubai_marina",
    geo_name: "Dubai Marina",
    segment: "all",
    metric: "active_listings",
    timeframe: "WoW",
    current_value: 120,
    prev_value: 90,
    delta_value: 30,
    delta_pct: 0.3333,
    confidence_score: 0.55,
    evidence: { portal: "propertyfinder" },
    signal_key: "portal|propertyfinder|supply_spike|area|dubai_marina|all|WoW|2025-01-01",
  }

  const res = await computeTargetsForSignal({
    orgId,
    signal,
    investors,
    getExposure: async () => ({ hasExposure: false, details: null }),
  })

  return {
    signalId: signal.id,
    targets: res.rows,
    skipped: res.skipped,
  }
}


