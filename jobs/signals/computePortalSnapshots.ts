/**
 * Portal snapshots are market "surface" observations (active listings, price cuts, staleness, etc.)
 * computed over rolling windows (e.g. WoW).
 *
 * This repo doesn't yet define the underlying `portal_listing_snapshot` table or ingestion, so this is
 * intentionally a stub for now.
 *
 * Returns: { snapshotsCreated: number }
 */
export async function computePortalSnapshots(_orgId: string): Promise<{ snapshotsCreated: number }> {
  // TODO: implement when portal_listing_snapshot table exists
  // Example: fetch portal data, group by geo/segment, compute WoW metrics, upsert snapshots
  return { snapshotsCreated: 0 }
}


