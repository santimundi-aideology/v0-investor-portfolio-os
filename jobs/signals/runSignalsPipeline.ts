import "server-only"
import { computeTruthSnapshots } from "./computeTruthSnapshots"
import { computePortalSnapshots } from "./computePortalSnapshots"
import { detectSignalsTruth } from "./detectSignalsTruth"
import { detectSignalsPortal } from "./detectSignalsPortal"
import { detectPricingOpportunities } from "./detectPricingOpportunities"
import { mapSignalsToInvestors } from "./mapSignalsToInvestors"
import { publishNotifications } from "./publishNotifications"

export interface SignalsPipelineResult {
  orgId: string
  snapshots: {
    truthCount: number
    portalCount: number
  }
  signals: {
    truthCreated: number
    portalCreated: number
    pricingCreated: number
  }
  mappings: {
    signalsProcessed: number
    targetsCreated: number
    targetsSkipped: number
  }
  notifications: {
    sent: number
    skipped: number
  }
  durationMs: number
  errors: string[]
}

/**
 * HOW MARKET SIGNALS WORK (for future devs)
 * ----------------------------------------
 * External sources (DLD/Ejari/Bayut/PF) → raw ingestion tables → SNAPSHOT tables → signals → mapping → notifications.
 *
 * Non‑negotiable rule:
 *   Detectors MUST ONLY read snapshot tables:
 *     - `market_metric_snapshot`
 *     - `portal_listing_snapshot`
 *
 * Codebase audit (what was missing / why signals were empty):
 * - Snapshot writers were stubs (`computeTruthSnapshots` / `computePortalSnapshots` returned 0).
 * - The snapshot adapter (`lib/db.ts`) previously pointed at placeholder tables; detectors were effectively starved.
 * - UI was mock-driven (`mockMarketSignals`) and never queried DB.
 *
 * This pipeline fixes the missing links:
 * 1) Writes snapshots
 * 2) Detects signals deterministically (idempotent via `signal_key`)
 * 3) Maps signals to investors deterministically (idempotent via unique keys)
 * 4) Publishes notifications (idempotent via `notification_key`)
 *
 * Orchestrates the full Market Signals pipeline (DAG):
 *
 * 1) computeTruthSnapshots(orgId)
 * 2) computePortalSnapshots(orgId)
 * 3) detectSignalsTruth(orgId)
 * 4) detectSignalsPortal(orgId)
 * 5) detectPricingOpportunities(orgId) - compares Bayut vs DLD prices
 * 6) mapSignalsToInvestors(orgId)
 * 7) publishNotifications(orgId)
 *
 * Returns structured result with counts for each stage.
 * Idempotent: safe to re-run; will not create duplicates.
 */
export async function runSignalsPipeline(orgId: string): Promise<SignalsPipelineResult> {
  const startTime = Date.now()
  const errors: string[] = []

  console.log(`[runSignalsPipeline] Starting pipeline for orgId=${orgId}`)

  // Initialize result with safe defaults
  const result: SignalsPipelineResult = {
    orgId,
    snapshots: { truthCount: 0, portalCount: 0 },
    signals: { truthCreated: 0, portalCreated: 0, pricingCreated: 0 },
    mappings: { signalsProcessed: 0, targetsCreated: 0, targetsSkipped: 0 },
    notifications: { sent: 0, skipped: 0 },
    durationMs: 0,
    errors: [],
  }

  try {
    // Step 1: Compute truth snapshots
    console.log(`[runSignalsPipeline] Step 1: computeTruthSnapshots`)
    const truthSnapshotsResult = await computeTruthSnapshots(orgId)
    result.snapshots.truthCount = truthSnapshotsResult.snapshotsCreated
  } catch (e) {
    const error = e as Error
    const msg = `computeTruthSnapshots failed: ${error?.message ?? String(e)}`
    console.error(`[runSignalsPipeline] ${msg}`)
    errors.push(msg)
  }

  try {
    // Step 2: Compute portal snapshots
    console.log(`[runSignalsPipeline] Step 2: computePortalSnapshots`)
    const portalSnapshotsResult = await computePortalSnapshots(orgId)
    result.snapshots.portalCount = portalSnapshotsResult.snapshotsCreated
  } catch (e) {
    const error = e as Error; const msg = `computePortalSnapshots failed: ${error?.message ?? String(e)}`
    console.error(`[runSignalsPipeline] ${msg}`)
    errors.push(msg)
  }

  try {
    // Step 3: Detect truth signals
    console.log(`[runSignalsPipeline] Step 3: detectSignalsTruth`)
    const truthSignalsResult = await detectSignalsTruth(orgId)
    result.signals.truthCreated = truthSignalsResult.created
  } catch (e) {
    const error = e as Error; const msg = `detectSignalsTruth failed: ${error?.message ?? String(e)}`
    console.error(`[runSignalsPipeline] ${msg}`)
    errors.push(msg)
  }

  try {
    // Step 4: Detect portal signals
    console.log(`[runSignalsPipeline] Step 4: detectSignalsPortal`)
    const portalSignalsResult = await detectSignalsPortal(orgId)
    result.signals.portalCreated = portalSignalsResult.created
  } catch (e) {
    const error = e as Error; const msg = `detectSignalsPortal failed: ${error?.message ?? String(e)}`
    console.error(`[runSignalsPipeline] ${msg}`)
    errors.push(msg)
  }

  try {
    // Step 5: Detect pricing opportunities (Bayut vs DLD comparison)
    console.log(`[runSignalsPipeline] Step 5: detectPricingOpportunities`)
    const pricingResult = await detectPricingOpportunities(orgId)
    result.signals.pricingCreated = pricingResult.created
  } catch (e) {
    const error = e as Error; const msg = `detectPricingOpportunities failed: ${error?.message ?? String(e)}`
    console.error(`[runSignalsPipeline] ${msg}`)
    errors.push(msg)
  }

  try {
    // Step 6: Map signals to investors (batch all unmapped signals)
    console.log(`[runSignalsPipeline] Step 5: mapSignalsToInvestors`)
    let totalSignalsProcessed = 0
    let totalTargetsCreated = 0
    let totalTargetsSkipped = 0
    let cursor: string | undefined = undefined

    // Paginate through all unmapped signals
    do {
      const mappingResult = await mapSignalsToInvestors(orgId, { batchSize: 100, cursor })
      totalSignalsProcessed += mappingResult.signalsProcessed
      totalTargetsCreated += mappingResult.targetsCreated
      totalTargetsSkipped += mappingResult.targetsSkipped
      cursor = mappingResult.nextCursor ?? undefined
    } while (cursor)

    result.mappings = {
      signalsProcessed: totalSignalsProcessed,
      targetsCreated: totalTargetsCreated,
      targetsSkipped: totalTargetsSkipped,
    }
  } catch (e) {
    const error = e as Error; const msg = `mapSignalsToInvestors failed: ${error?.message ?? String(e)}`
    console.error(`[runSignalsPipeline] ${msg}`)
    errors.push(msg)
  }

  try {
    // Step 7: Publish notifications
    console.log(`[runSignalsPipeline] Step 7: publishNotifications`)
    const notificationsResult = await publishNotifications(orgId)
    result.notifications = notificationsResult
  } catch (e) {
    const error = e as Error; const msg = `publishNotifications failed: ${error?.message ?? String(e)}`
    console.error(`[runSignalsPipeline] ${msg}`)
    errors.push(msg)
  }

  result.durationMs = Date.now() - startTime
  result.errors = errors

  console.log(
    `[runSignalsPipeline] Completed for orgId=${orgId} in ${result.durationMs}ms. ` +
      `Snapshots: ${result.snapshots.truthCount + result.snapshots.portalCount}, ` +
      `Signals: ${result.signals.truthCreated + result.signals.portalCreated + result.signals.pricingCreated} (${result.signals.pricingCreated} pricing), ` +
      `Targets: ${result.mappings.targetsCreated}, ` +
      `Notifications: ${result.notifications.sent}. ` +
      `Errors: ${errors.length}`
  )

  return result
}

