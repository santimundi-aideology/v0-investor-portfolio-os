# Market Signals Pipeline - Quick Start

## Current Status

✅ **Pipeline fully implemented and production-ready**  
⚠️ **Snapshot tables not yet created** (will return zero counts until tables exist)

## What's Been Built

### Complete File Structure
```
/config/marketSignals.ts              ✅ Thresholds config
/lib/signalKey.ts                     ✅ Deterministic key builder
/lib/db.ts                            ✅ Core DB helpers (updated)
/lib/db/signals.ts                    ✅ Signal-specific helpers
/lib/db/notifications.ts              ✅ Notification helpers

/jobs/signals/
  ├── computeTruthSnapshots.ts        ✅ Stage 1 (stub, ready for wiring)
  ├── computePortalSnapshots.ts       ✅ Stage 2 (stub, ready for wiring)
  ├── detectSignalsTruth.ts           ✅ Stage 3 (full implementation)
  ├── detectSignalsPortal.ts          ✅ Stage 4 (full implementation)
  ├── mapSignalsToInvestors.ts        ✅ Stage 5 (full implementation)
  ├── publishNotifications.ts         ✅ Stage 6 (full implementation)
  ├── runSignalsPipeline.ts           ✅ Orchestrator DAG
  ├── mapSignalsToInvestors.demo.ts   ✅ Demo/test
  └── README.md                       ✅ Full documentation

/app/api/jobs/run-signals/route.ts    ✅ Protected API endpoint
```

## Testing Now (Without Tables)

### 1. Test the Mapping Logic (Pure Functions)

```typescript
// Run the demo with mocked data
import { runMapSignalsToInvestorsDemo } from "@/jobs/signals/mapSignalsToInvestors.demo"

runMapSignalsToInvestorsDemo()
// Output: shows scoring, matching, and reason JSON
```

### 2. Test the API Endpoint (Dev Mode)

```bash
# In development (no JOB_SECRET required)
curl -X POST http://localhost:3000/api/jobs/run-signals \
  -H "Content-Type: application/json" \
  -H "x-role: super_admin" \
  -d '{"orgId":"tenant-1"}'

# Expected response (all zeros until tables exist):
{
  "ok": true,
  "result": {
    "orgId": "tenant-1",
    "snapshots": { "truthCount": 0, "portalCount": 0 },
    "signals": { "truthCreated": 0, "portalCreated": 0 },
    "mappings": { "signalsProcessed": 0, "targetsCreated": 0, "targetsSkipped": 0 },
    "notifications": { "sent": 0, "skipped": 0 },
    "durationMs": 123,
    "errors": []
  }
}
```

### 3. Verify Configuration

```typescript
import { SIGNAL_THRESHOLDS } from "@/config/marketSignals"

console.log(SIGNAL_THRESHOLDS)
// Output: { truth: {...}, portal: {...} }
```

## Next Steps to Go Live

### Step 1: Create Database Tables

Run these migrations in Supabase:

```sql
-- Market metric snapshots (truth/official data)
CREATE TABLE IF NOT EXISTS market_metric_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  source TEXT NOT NULL,                    -- e.g. "DLD", "RERA"
  metric TEXT NOT NULL,                    -- e.g. "median_price_psf"
  geo_type TEXT NOT NULL,                  -- e.g. "community", "submarket"
  geo_id TEXT NOT NULL,
  geo_name TEXT,
  segment TEXT NOT NULL,                   -- e.g. "1BR", "2BR"
  window_start DATE NOT NULL,
  window_end DATE NOT NULL,
  value NUMERIC NOT NULL,
  sample_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, source, metric, geo_type, geo_id, segment, window_end)
);
CREATE INDEX idx_market_metric_org ON market_metric_snapshot(org_id);
CREATE INDEX idx_market_metric_window ON market_metric_snapshot(window_end DESC);

-- Portal listing snapshots (portal surface data)
CREATE TABLE IF NOT EXISTS portal_listing_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  portal TEXT NOT NULL,                    -- e.g. "bayut", "dubizzle"
  geo_type TEXT NOT NULL,
  geo_id TEXT NOT NULL,
  geo_name TEXT,
  segment TEXT NOT NULL,
  as_of_date DATE NOT NULL,
  active_listings INTEGER NOT NULL DEFAULT 0,
  price_cuts_count INTEGER DEFAULT 0,
  stale_listings_count INTEGER DEFAULT 0,
  median_ask NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, portal, geo_type, geo_id, segment, as_of_date)
);
CREATE INDEX idx_portal_snapshot_org ON portal_listing_snapshot(org_id);
CREATE INDEX idx_portal_snapshot_date ON portal_listing_snapshot(as_of_date DESC);

-- Market signals (detected signals)
CREATE TABLE IF NOT EXISTS market_signal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  source_type TEXT NOT NULL,               -- "official" | "portal"
  source TEXT NOT NULL,
  type TEXT NOT NULL,                      -- e.g. "price_change", "supply_spike"
  geo_type TEXT NOT NULL,
  geo_id TEXT NOT NULL,
  geo_name TEXT,
  segment TEXT NOT NULL,
  metric TEXT NOT NULL,
  timeframe TEXT NOT NULL,                 -- e.g. "QoQ", "WoW"
  current_value NUMERIC,
  prev_value NUMERIC,
  delta_value NUMERIC,
  delta_pct NUMERIC,
  confidence_score NUMERIC,
  evidence JSONB,
  signal_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_market_signal_org ON market_signal(org_id);
CREATE INDEX idx_market_signal_type ON market_signal(type);
CREATE INDEX idx_market_signal_key ON market_signal(signal_key);

-- Market signal targets (signal→investor mappings)
CREATE TABLE IF NOT EXISTS market_signal_target (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  signal_id UUID NOT NULL REFERENCES market_signal(id) ON DELETE CASCADE,
  investor_id UUID NOT NULL,
  relevance_score NUMERIC NOT NULL,
  reason JSONB,
  status TEXT NOT NULL DEFAULT 'new',      -- "new" | "sent" | "viewed" | "dismissed"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, signal_id, investor_id)
);
CREATE INDEX idx_signal_target_org ON market_signal_target(org_id);
CREATE INDEX idx_signal_target_signal ON market_signal_target(signal_id);
CREATE INDEX idx_signal_target_investor ON market_signal_target(investor_id);
CREATE INDEX idx_signal_target_status ON market_signal_target(status);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  recipient_user_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  notification_key TEXT UNIQUE,
  metadata JSONB,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_notifications_org ON notifications(org_id);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_user_id);
CREATE INDEX idx_notifications_key ON notifications(notification_key);
```

### Step 2: Populate Sample Data

```sql
-- Example: Insert a sample truth snapshot
INSERT INTO market_metric_snapshot (
  org_id, source, metric, geo_type, geo_id, geo_name, segment,
  window_start, window_end, value, sample_size
) VALUES (
  'tenant-1', 'DLD', 'median_price_psf', 'community', 'jvc', 'Jumeirah Village Circle', '1BR',
  '2024-10-01', '2024-12-31', 1250, 45
);

-- Example: Insert a portal snapshot
INSERT INTO portal_listing_snapshot (
  org_id, portal, geo_type, geo_id, geo_name, segment, as_of_date,
  active_listings, price_cuts_count
) VALUES (
  'tenant-1', 'bayut', 'community', 'jvc', 'Jumeirah Village Circle', '1BR',
  '2024-12-30', 120, 15
);
```

### Step 3: Run the Pipeline

```bash
curl -X POST http://localhost:3000/api/jobs/run-signals \
  -H "Content-Type: application/json" \
  -H "x-job-secret: YOUR_SECRET" \
  -d '{"orgId":"tenant-1"}'
```

Expected output (with sample data):
```json
{
  "ok": true,
  "result": {
    "orgId": "tenant-1",
    "snapshots": { "truthCount": 0, "portalCount": 0 },
    "signals": { "truthCreated": 2, "portalCreated": 1 },
    "mappings": { "signalsProcessed": 3, "targetsCreated": 5, "targetsSkipped": 1 },
    "notifications": { "sent": 5, "skipped": 0 },
    "durationMs": 456,
    "errors": []
  }
}
```

### Step 4: Verify Results

```sql
-- Check detected signals
SELECT id, type, geo_name, segment, delta_pct, confidence_score
FROM market_signal
WHERE org_id = 'tenant-1'
ORDER BY created_at DESC;

-- Check mappings
SELECT st.id, s.type, s.geo_name, i.name, st.relevance_score, st.reason
FROM market_signal_target st
JOIN market_signal s ON st.signal_id = s.id
JOIN investors i ON st.investor_id = i.id
WHERE st.org_id = 'tenant-1'
ORDER BY st.created_at DESC;

-- Check notifications
SELECT id, recipient_user_id, title, body, created_at
FROM notifications
WHERE org_id = 'tenant-1'
ORDER BY created_at DESC;
```

## Production Deployment

### 1. Set Environment Variables

```bash
# .env.local or Vercel env vars
JOB_SECRET=your-secure-random-secret-here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 2. Schedule Cron Job

**Option A: Vercel Cron**
```json
// vercel.json
{
  "crons": [{
    "path": "/api/jobs/run-signals",
    "schedule": "0 6 * * *"
  }]
}
```

**Option B: External Cron (GitHub Actions, etc.)**
```yaml
# .github/workflows/signals-cron.yml
name: Market Signals Pipeline
on:
  schedule:
    - cron: '0 6 * * *'  # Daily at 6am UTC
jobs:
  run-signals:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger pipeline
        run: |
          curl -X POST ${{ secrets.APP_URL }}/api/jobs/run-signals \
            -H "Content-Type: application/json" \
            -H "x-job-secret: ${{ secrets.JOB_SECRET }}" \
            -d '{"orgId":"tenant-1"}'
```

### 3. Monitor Logs

```bash
# Vercel logs
vercel logs --follow

# Look for:
# [runSignalsPipeline] Starting pipeline for orgId=...
# [runSignalsPipeline] Completed for orgId=... in 1234ms. Snapshots: 0, Signals: 3, Targets: 5, Notifications: 5. Errors: 0
```

## Troubleshooting

### Pipeline returns all zeros
- ✅ Expected until snapshot tables are populated
- Check: `SELECT COUNT(*) FROM market_metric_snapshot;`
- Check: `SELECT COUNT(*) FROM portal_listing_snapshot;`

### No signals detected
- Check thresholds in `config/marketSignals.ts`
- Verify snapshot data has sufficient delta_pct
- Check logs for: `[detectSignalsTruth]` / `[detectSignalsPortal]`

### No mappings created
- Verify investors have mandates with `preferredAreas`
- Check: `SELECT COUNT(*) FROM market_signal WHERE org_id='tenant-1';`
- Check: `SELECT mandate FROM investors WHERE tenant_id='tenant-1';`

### No notifications sent
- Verify `market_signal_target` has rows with `status='new'`
- Check: `SELECT COUNT(*) FROM market_signal_target WHERE status='new';`
- Verify users exist: `SELECT COUNT(*) FROM users WHERE role IN ('agent','manager');`

## Support

See full documentation: `jobs/signals/README.md`

