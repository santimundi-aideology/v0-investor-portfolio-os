import { SIGNAL_THRESHOLDS } from "../../config/marketSignals"
import { db } from "../../lib/db"
import { makeSignalKey } from "../../lib/signalKey"

export async function detectSignalsTruth(orgId: string) {
  // Pull snapshot pairs for QoQ (you implement getTruthSnapshotPairs)
  const pairs = await db.getTruthSnapshotPairs(orgId, "QoQ")

  const toUpsert: Record<string, unknown>[] = []

  for (const p of pairs) {
    if (!p.prev || p.prev.value === 0) continue

    const deltaPct = (p.current.value - p.prev.value) / p.prev.value

    const minN = SIGNAL_THRESHOLDS.truth.minSampleSize
    const confidence = (p.current.sample_size ?? 0) >= minN ? 0.85 : 0.6

    const anchor = p.current.window_end // date string

    // price change
    if (
      p.metric === "median_price_psf" &&
      Math.abs(deltaPct) >= SIGNAL_THRESHOLDS.truth.priceChangeQoQPct &&
      (p.current.sample_size ?? 0) >= minN
    ) {
      const signalKey = makeSignalKey({
        sourceType: "official",
        source: p.source,
        type: "price_change",
        geoType: p.geo_type,
        geoId: p.geo_id,
        segment: p.segment,
        timeframe: "QoQ",
        anchor,
      })

      toUpsert.push({
        org_id: orgId,
        source_type: "official",
        source: p.source,
        type: "price_change",
        geo_type: p.geo_type,
        geo_id: p.geo_id,
        geo_name: p.geo_name,
        segment: p.segment,
        metric: p.metric,
        timeframe: "QoQ",
        current_value: p.current.value,
        prev_value: p.prev.value,
        delta_value: p.current.value - p.prev.value,
        delta_pct: deltaPct,
        confidence_score: confidence,
        evidence: {
          snapshot_current_id: p.current.id,
          snapshot_prev_id: p.prev.id,
          sample_size: p.current.sample_size,
          window_current: [p.current.window_start, p.current.window_end],
          window_prev: [p.prev.window_start, p.prev.window_end],
        },
        signal_key: signalKey,
      })
    }

    // rent change
    if (
      p.metric === "median_rent_annual" &&
      Math.abs(deltaPct) >= SIGNAL_THRESHOLDS.truth.rentChangeQoQPct &&
      (p.current.sample_size ?? 0) >= minN
    ) {
      const signalKey = makeSignalKey({
        sourceType: "official",
        source: p.source,
        type: "rent_change",
        geoType: p.geo_type,
        geoId: p.geo_id,
        segment: p.segment,
        timeframe: "QoQ",
        anchor,
      })

      toUpsert.push({
        org_id: orgId,
        source_type: "official",
        source: p.source,
        type: "rent_change",
        geo_type: p.geo_type,
        geo_id: p.geo_id,
        geo_name: p.geo_name,
        segment: p.segment,
        metric: p.metric,
        timeframe: "QoQ",
        current_value: p.current.value,
        prev_value: p.prev.value,
        delta_value: p.current.value - p.prev.value,
        delta_pct: deltaPct,
        confidence_score: confidence,
        evidence: {
          snapshot_current_id: p.current.id,
          snapshot_prev_id: p.prev.id,
          sample_size: p.current.sample_size,
          window_current: [p.current.window_start, p.current.window_end],
          window_prev: [p.prev.window_start, p.prev.window_end],
        },
        signal_key: signalKey,
      })
    }

    // yield opportunity (if you store computed yield snapshots)
    if (p.metric === "gross_yield" && p.current.value >= SIGNAL_THRESHOLDS.truth.yieldOpportunityMin) {
      const signalKey = makeSignalKey({
        sourceType: "official",
        source: "derived",
        type: "yield_opportunity",
        geoType: p.geo_type,
        geoId: p.geo_id,
        segment: p.segment,
        timeframe: "QoQ",
        anchor,
      })

      toUpsert.push({
        org_id: orgId,
        source_type: "official",
        source: "derived",
        type: "yield_opportunity",
        geo_type: p.geo_type,
        geo_id: p.geo_id,
        geo_name: p.geo_name,
        segment: p.segment,
        metric: "gross_yield",
        timeframe: "QoQ",
        current_value: p.current.value,
        prev_value: p.prev.value,
        delta_value: p.current.value - p.prev.value,
        delta_pct: p.prev.value ? (p.current.value - p.prev.value) / p.prev.value : null,
        confidence_score: confidence,
        evidence: { snapshot_current_id: p.current.id, snapshot_prev_id: p.prev.id },
        signal_key: signalKey,
      })
    }
  }

  await db.upsertMarketSignals(toUpsert)
}


