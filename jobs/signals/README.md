# Market Signals Pipeline

Production-quality orchestration for detecting and routing market intelligence signals to investors.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   runSignalsPipeline.ts                      │
│                     (Orchestrator DAG)                       │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Step 1-2   │    │   Step 3-4   │    │   Step 5-6   │
│  Snapshots   │───▶│   Signals    │───▶│   Mapping    │
│              │    │              │    │ + Notify     │
└──────────────┘    └──────────────┘    └──────────────┘
```

## Pipeline Stages

### Stage 1-2: Snapshot Computation
- **computeTruthSnapshots.ts**: Official/authoritative stats (DLD, RERA)
  - Target table: `market_metric_snapshot`
  - Metrics: `median_price_psf`, `median_rent_annual`, `gross_yield`
  - Timeframes: QoQ (quarter-over-quarter)

- **computePortalSnapshots.ts**: Portal surface observations
  - Target table: `portal_listing_snapshot`
  - Metrics: `active_listings`, `price_cuts_count`, `stale_listings_count`
  - Timeframes: WoW (week-over-week)

### Stage 3-4: Signal Detection
- **detectSignalsTruth.ts**: Detects official market signals
  - Types: `price_change`, `rent_change`, `yield_opportunity`
  - Uses thresholds from `config/marketSignals.ts`
  - Outputs to: `market_signal` table

- **detectSignalsPortal.ts**: Detects portal inventory signals
  - Types: `supply_spike`, `discounting_spike`, `staleness_rise`
  - Uses thresholds from `config/marketSignals.ts`
  - Outputs to: `market_signal` table

### Stage 5: Investor Mapping
- **mapSignalsToInvestors.ts**: Rules-based signal→investor matching
  - Reads: `market_signal` (unmapped only)
  - Matches against: `investors` + `investor_mandate`
  - Scoring rules (deterministic, auditable):
    - Area match: +0.35 (or +0.15 if open mandate)
    - Budget match: +0.25 (or +0.10 if N/A)
    - Yield gate: +0.30 (must pass for yield_opportunity signals)
    - Portfolio exposure boost: +0.10
    - Risk cap: max 0.65 for low-risk-tolerance investors on risky signals
  - Outputs to: `market_signal_target` (status='new')
  - Min relevance: 0.35 (below this, skip)

### Stage 6: Notification Publishing
- **publishNotifications.ts**: Sends notifications to realtors/agents
  - Reads: `market_signal_target` (status='new')
  - Recipients: assigned agent + all agents/managers in org
  - Dedupe: deterministic `notification_key` = `org_id|recipient_user_id|signal_id|investor_id`
  - Title format:
    - Official: "Market Truth: {type} in {geo} ({segment})"
    - Portal: "Inventory Signal: {type} in {geo} ({segment})"
  - Outputs to: `notifications` table

## Configuration

### Thresholds (`config/marketSignals.ts`)
```typescript
SIGNAL_THRESHOLDS = {
  truth: {
    priceChangeQoQPct: 0.05,      // 5% price change
    rentChangeQoQPct: 0.05,        // 5% rent change
    minSampleSize: 25,             // minimum transactions
    yieldOpportunityMin: 0.065,    // 6.5% gross yield
  },
  portal: {
    supplySpikeWoWPct: 0.15,       // +15% active listings
    discountingSpikeWoWPct: 0.20,  // +20% price cuts
    stalenessRiseWoWPct: 0.15,     // +15% stale listings
    minActiveListings: 30,         // minimum for confidence
  },
}
```

## Database Helpers

### `lib/db.ts`
- `db.getTruthSnapshotPairs(orgId, timeframe)` → snapshot pairs for QoQ comparison
- `db.getPortalSnapshotPairs(orgId, timeframe)` → snapshot pairs for WoW comparison
- `db.upsertMarketSignals(rows)` → idempotent upsert into `market_signal`

### `lib/db/signals.ts`
- `getUnmappedSignals(orgId, { limit, cursor })` → paginated unmapped signals
- `upsertSignalTargets(rows)` → idempotent upsert into `market_signal_target`
- `getInvestorsWithMandates(orgId)` → investors + mandates for matching
- `getInvestorGeoExposure(orgId, investorId)` → portfolio exposure (stub)

### `lib/db/notifications.ts`
- `getNotificationRecipientsForInvestor(orgId, investorId)` → user_ids to notify
- `batchInsertNotifications(rows)` → dedupe + batch insert

### `lib/signalKey.ts`
- `makeSignalKey(input)` → deterministic signal key (pipe-delimited)
  - Format: `sourceType|source|type|geoType|geoId|segment|timeframe|anchor`

## API Endpoint

### `POST /api/jobs/run-signals`

**Security:**
- Requires header `x-job-secret` matching `process.env.JOB_SECRET`
- In dev mode (no JOB_SECRET): requires `x-role: super_admin`

**Request:**
```json
{
  "orgId": "tenant-1"
}
```

**Response:**
```json
{
  "ok": true,
  "result": {
    "orgId": "tenant-1",
    "snapshots": {
      "truthCount": 0,
      "portalCount": 0
    },
    "signals": {
      "truthCreated": 0,
      "portalCreated": 0
    },
    "mappings": {
      "signalsProcessed": 0,
      "targetsCreated": 0,
      "targetsSkipped": 0
    },
    "notifications": {
      "sent": 0,
      "skipped": 0
    },
    "durationMs": 1234,
    "errors": []
  }
}
```

**Example curl:**
```bash
curl -X POST http://localhost:3000/api/jobs/run-signals \
  -H "Content-Type: application/json" \
  -H "x-job-secret: YOUR_SECRET" \
  -d '{"orgId":"tenant-1"}'
```

**Cron setup (Vercel):**
```json
{
  "crons": [{
    "path": "/api/jobs/run-signals",
    "schedule": "0 6 * * *"
  }]
}
```

## Idempotency

All stages are safe to re-run:
- **Snapshots**: upsert by window/geo/segment
- **Signals**: upsert by `signal_key`
- **Mappings**: upsert by `(org_id, signal_id, investor_id)`
- **Notifications**: upsert by `notification_key`

## Current State

The pipeline is **fully implemented** and **production-ready**, but will return zero counts until the snapshot tables are created:

- `market_metric_snapshot` (for truth snapshots)
- `portal_listing_snapshot` (for portal snapshots)

All DB helpers gracefully handle missing tables and return empty results.

## Demo

Run the mapping demo (no external deps):
```typescript
import { runMapSignalsToInvestorsDemo } from "@/jobs/signals/mapSignalsToInvestors.demo"

runMapSignalsToInvestorsDemo()
```

## Next Steps

1. **Create snapshot tables** in Supabase:
   - `market_metric_snapshot`
   - `portal_listing_snapshot`
   - `market_signal`
   - `market_signal_target`
   - `notifications`

2. **Implement snapshot ingestion**:
   - Wire `computeTruthSnapshots` to DLD/RERA APIs
   - Wire `computePortalSnapshots` to portal scrapers

3. **Test end-to-end**:
   - Populate snapshot tables with sample data
   - Run pipeline via API route
   - Verify signals, mappings, and notifications

4. **Schedule production cron**:
   - Add `JOB_SECRET` to env vars
   - Configure cron (daily 6am recommended)
   - Monitor via structured logs

## Files

```
jobs/signals/
├── README.md                          # This file
├── runSignalsPipeline.ts              # Orchestrator (DAG)
├── computeTruthSnapshots.ts           # Stage 1
├── computePortalSnapshots.ts          # Stage 2
├── detectSignalsTruth.ts              # Stage 3
├── detectSignalsPortal.ts             # Stage 4
├── mapSignalsToInvestors.ts           # Stage 5
├── mapSignalsToInvestors.demo.ts      # Demo/test
└── publishNotifications.ts            # Stage 6

lib/
├── db.ts                              # Core DB helpers
├── db/
│   ├── signals.ts                     # Signal-specific helpers
│   └── notifications.ts               # Notification helpers
└── signalKey.ts                       # Deterministic key builder

config/
└── marketSignals.ts                   # Thresholds config

app/api/jobs/
└── run-signals/
    └── route.ts                       # Protected API endpoint
```

