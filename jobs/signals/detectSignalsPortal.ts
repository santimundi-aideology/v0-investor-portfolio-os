import { SIGNAL_THRESHOLDS } from "../../config/marketSignals"
import { db } from "../../lib/db"
import { makeSignalKey } from "../../lib/signalKey"

function severityFromDeltaPct(deltaPct: number) {
  if (deltaPct >= 0.25) return "urgent"
  if (deltaPct >= 0.15) return "watch"
  return "info"
}

export async function detectSignalsPortal(orgId: string) {
  const pairs = await db.getPortalSnapshotPairs(orgId, "WoW") // current vs prev week (same portal/geo/segment)

  const toUpsert: Array<Record<string, unknown> & { org_id: string; signal_key: string }> = []

  for (const p of pairs) {
    if (!p.prev) continue

    if (p.current.active_listings < SIGNAL_THRESHOLDS.portal.minActiveListings) continue

    const anchor = p.current.as_of_date

    const supplyDeltaPct =
      p.prev.active_listings > 0
        ? (p.current.active_listings - p.prev.active_listings) / p.prev.active_listings
        : null

    if (supplyDeltaPct !== null && supplyDeltaPct >= SIGNAL_THRESHOLDS.portal.supplySpikeWoWPct) {
      const signalKey = makeSignalKey({
        sourceType: "portal",
        source: p.portal,
        type: "supply_spike",
        geoType: p.geo_type,
        geoId: p.geo_id,
        segment: p.segment,
        timeframe: "WoW",
        anchor,
      })

      toUpsert.push({
        org_id: orgId,
        source_type: "portal",
        source: p.portal,
        type: "supply_spike",
        severity: severityFromDeltaPct(supplyDeltaPct),
        status: "new",
        geo_type: p.geo_type,
        geo_id: p.geo_id,
        geo_name: p.geo_name,
        segment: p.segment,
        metric: "active_listings",
        timeframe: "WoW",
        current_value: p.current.active_listings,
        prev_value: p.prev.active_listings,
        delta_value: p.current.active_listings - p.prev.active_listings,
        delta_pct: supplyDeltaPct,
        confidence_score: 0.55, // portal = lower by default
        evidence: { snapshot_current_id: p.current.id, snapshot_prev_id: p.prev.id, portal: p.portal },
        signal_key: signalKey,
      })
    }

    // discounting spike (price cuts)
    const prevCuts = p.prev.price_cuts_count ?? 0
    const currCuts = p.current.price_cuts_count ?? 0
    const cutsDeltaPct = prevCuts > 0 ? (currCuts - prevCuts) / prevCuts : currCuts > 0 ? 1 : 0

    if (cutsDeltaPct >= SIGNAL_THRESHOLDS.portal.discountingSpikeWoWPct) {
      const signalKey = makeSignalKey({
        sourceType: "portal",
        source: p.portal,
        type: "discounting_spike",
        geoType: p.geo_type,
        geoId: p.geo_id,
        segment: p.segment,
        timeframe: "WoW",
        anchor,
      })

      toUpsert.push({
        org_id: orgId,
        source_type: "portal",
        source: p.portal,
        type: "discounting_spike",
        severity: severityFromDeltaPct(cutsDeltaPct),
        status: "new",
        geo_type: p.geo_type,
        geo_id: p.geo_id,
        geo_name: p.geo_name,
        segment: p.segment,
        metric: "price_cuts_count",
        timeframe: "WoW",
        current_value: currCuts,
        prev_value: prevCuts,
        delta_value: currCuts - prevCuts,
        delta_pct: cutsDeltaPct,
        confidence_score: 0.5,
        evidence: { snapshot_current_id: p.current.id, snapshot_prev_id: p.prev.id },
        signal_key: signalKey,
      })
    }

    // staleness rise (stale listings)
    const prevStale = p.prev.stale_listings_count ?? 0
    const currStale = p.current.stale_listings_count ?? 0
    const staleDeltaPct = prevStale > 0 ? (currStale - prevStale) / prevStale : currStale > 0 ? 1 : 0

    if (staleDeltaPct >= SIGNAL_THRESHOLDS.portal.stalenessRiseWoWPct) {
      const signalKey = makeSignalKey({
        sourceType: "portal",
        source: p.portal,
        type: "staleness_rise",
        geoType: p.geo_type,
        geoId: p.geo_id,
        segment: p.segment,
        timeframe: "WoW",
        anchor,
      })

      toUpsert.push({
        org_id: orgId,
        source_type: "portal",
        source: p.portal,
        type: "staleness_rise",
        severity: severityFromDeltaPct(staleDeltaPct),
        status: "new",
        geo_type: p.geo_type,
        geo_id: p.geo_id,
        geo_name: p.geo_name,
        segment: p.segment,
        metric: "stale_listings_count",
        timeframe: "WoW",
        current_value: currStale,
        prev_value: prevStale,
        delta_value: currStale - prevStale,
        delta_pct: staleDeltaPct,
        confidence_score: 0.5,
        evidence: { snapshot_current_id: p.current.id, snapshot_prev_id: p.prev.id },
        signal_key: signalKey,
      })
    }
  }

  const created = await db.upsertMarketSignals(toUpsert)
  return { created }
}


