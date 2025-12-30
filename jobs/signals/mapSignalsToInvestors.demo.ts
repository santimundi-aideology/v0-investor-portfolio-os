import type { InvestorWithMandate, MarketSignalRow } from "../../lib/db/signals"
import { computeTargetsForSignal } from "./mapSignalsToInvestors"

/**
 * Minimal unit-test-like demo (no external libs).
 * Run by importing/calling from anywhere (e.g. a script or a one-off route).
 * 
 * Returns: { signalsProcessed, targetsCreated, targetsSkipped, details }
 */
export async function runMapSignalsToInvestorsDemo() {
  const orgId = "org_demo"

  console.log("\n🧪 === Market Signals Mapping Demo ===\n")

  const investors: InvestorWithMandate[] = [
    {
      id: "inv-a",
      org_id: orgId,
      name: "Sarah Al-Maktoum (Family Office)",
      mandate: {
        preferred_areas: ["dubai_marina", "jvc"],
        preferred_projects: [],
        budget_min: 1_500_000,
        budget_max: 3_000_000,
        yield_target: 0.065,
        risk_tolerance: "medium",
      },
    },
    {
      id: "inv-b",
      org_id: orgId,
      name: "John Smith (Low Risk)",
      mandate: {
        // Set up to demonstrate the low-risk cap on risky signals.
        preferred_areas: ["jvc"],
        budget_min: 2_000_000,
        budget_max: 3_000_000,
        yield_target: 0.07,
        risk_tolerance: "low",
      },
    },
    {
      id: "inv-c",
      org_id: orgId,
      name: "Open Mandate Investor",
      // Open mandate but still passes threshold via a hard budget match on a price-related metric.
      mandate: { open: true, budget_min: 2_000_000, budget_max: 3_000_000, risk_tolerance: "medium" },
    },
  ]

  const signals: MarketSignalRow[] = [
    {
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
    },
    {
      id: "sig-2",
      org_id: orgId,
      source_type: "official",
      source: "DLD",
      type: "price_change",
      geo_type: "community",
      geo_id: "jvc",
      geo_name: "Jumeirah Village Circle",
      segment: "1BR",
      // Price-related metric so budget can be a hard match (+0.25).
      metric: "median_ask_price",
      timeframe: "QoQ",
      current_value: 2_500_000,
      prev_value: 2_300_000,
      delta_value: 200_000,
      delta_pct: 0.087,
      confidence_score: 0.85,
      evidence: { sample_size: 45 },
      signal_key: "official|DLD|price_change|community|jvc|1BR|QoQ|2024-12-31",
    },
    {
      id: "sig-3",
      org_id: orgId,
      source_type: "official",
      source: "derived",
      type: "yield_opportunity",
      geo_type: "community",
      geo_id: "jvc",
      geo_name: "Jumeirah Village Circle",
      segment: "2BR",
      metric: "gross_yield",
      timeframe: "QoQ",
      current_value: 0.068,
      prev_value: 0.065,
      delta_value: 0.003,
      delta_pct: 0.046,
      confidence_score: 0.85,
      evidence: {},
      signal_key: "official|derived|yield_opportunity|community|jvc|2BR|QoQ|2024-12-31",
    },
    {
      id: "sig-4",
      org_id: orgId,
      source_type: "portal",
      source: "bayut",
      // Risky signal type to demonstrate low-risk relevance capping.
      type: "discounting_spike",
      geo_type: "community",
      geo_id: "jvc",
      geo_name: "Jumeirah Village Circle",
      segment: "all",
      // Make it price-related so budget hard match can push score above 0.65 before cap.
      metric: "median_ask_price",
      timeframe: "WoW",
      current_value: 2_600_000,
      prev_value: 2_900_000,
      delta_value: -300_000,
      delta_pct: -0.103,
      confidence_score: 0.55,
      evidence: { portal: "bayut" },
      signal_key: "portal|bayut|discounting_spike|community|jvc|all|WoW|2025-01-01",
    },
  ]

  let signalsProcessed = 0
  let targetsCreated = 0
  let targetsSkipped = 0
  const details: Array<{
    signalId: string
    signalType: string
    geoName: string
    targets: Array<{ investorId: string; score: number; matched: string[] }>
    skipped: Array<{ investorId: string; reason: string }>
  }> = []

  for (const signal of signals) {
    console.log(`\n📊 Signal: ${signal.type} in ${signal.geo_name} (${signal.segment})`)
    console.log(`   Source: ${signal.source_type}/${signal.source}`)
    console.log(`   Delta: ${(signal.delta_pct! * 100).toFixed(1)}%, Confidence: ${(signal.confidence_score! * 100).toFixed(0)}%\n`)

    const res = await computeTargetsForSignal({
      orgId,
      signal,
      investors,
      getExposure: async (orgId, investorId, geoId) => {
        // Mock: investor "inv-a" has exposure in "jvc"
        if ((investorId === "inv-a" || investorId === "inv-b") && geoId === "jvc") {
          return { hasExposure: true, details: { geo_id: geoId, property_count: 2 } }
        }
        return { hasExposure: false, details: null }
      },
    })

    signalsProcessed += 1
    targetsCreated += res.rows.length
    targetsSkipped += res.skipped.length

    console.log(`   👥 Results:`)
    for (const target of res.rows) {
      const investor = investors.find((inv) => inv.id === target.investor_id)
      const reason = target.reason as Record<string, unknown>
      const matched = (reason?.matched as string[]) || []
      console.log(`      ✅ ${investor?.name || target.investor_id}`)
      console.log(`         Score: ${(target.relevance_score * 100).toFixed(0)}%`)
      console.log(`         Matched: ${matched.join(", ")}`)
    }

    if (res.skipped.length > 0) {
      console.log(`   ⏭️  Skipped:`)
      for (const skip of res.skipped) {
        const investor = investors.find((inv) => inv.id === skip.investorId)
        console.log(`      ❌ ${investor?.name || skip.investorId}: ${skip.reason}`)
      }
    }

    details.push({
      signalId: signal.id,
      signalType: signal.type,
      geoName: signal.geo_name || signal.geo_id,
      targets: res.rows.map((t) => ({
        investorId: t.investor_id,
        score: t.relevance_score,
        matched: ((t.reason as Record<string, unknown>)?.matched as string[]) || [],
      })),
      skipped: res.skipped,
    })
  }

  console.log(`\n📈 Summary:`)
  console.log(`   Signals processed: ${signalsProcessed}`)
  console.log(`   Targets created: ${targetsCreated}`)
  console.log(`   Targets skipped: ${targetsSkipped}`)
  console.log(`\n✅ Demo complete!\n`)

  return {
    signalsProcessed,
    targetsCreated,
    targetsSkipped,
    details,
  }
}


