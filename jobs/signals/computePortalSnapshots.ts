/**
 * Portal snapshots are market “surface” observations (active listings, price cuts, staleness, etc.)
 * computed over rolling windows (e.g. WoW).
 *
 * This repo doesn't yet define the underlying `portal_snapshots` table or ingestion, so this is
 * intentionally a stub for now.
 */
export async function computePortalSnapshots(_orgId: string) {
  return { inserted: 0, updated: 0 }
}


