-- Portfolio snapshots: track portfolio values over time for historical charts
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  investor_id uuid NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
  holding_id uuid NOT NULL REFERENCES holdings(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL,
  market_value numeric NOT NULL,
  monthly_rent numeric,
  occupancy_rate numeric,
  area_median_price numeric,
  created_at timestamptz DEFAULT now(),
  UNIQUE(holding_id, snapshot_date)
);

-- Create indexes for common queries
CREATE INDEX idx_portfolio_snapshots_investor ON portfolio_snapshots(investor_id, snapshot_date);
CREATE INDEX idx_portfolio_snapshots_holding ON portfolio_snapshots(holding_id, snapshot_date);
CREATE INDEX idx_portfolio_snapshots_tenant ON portfolio_snapshots(tenant_id);

-- Enable RLS
ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "portfolio_snapshots_tenant_read" ON portfolio_snapshots
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "portfolio_snapshots_tenant_insert" ON portfolio_snapshots
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- Service role can do anything (for edge functions / cron jobs)
CREATE POLICY "portfolio_snapshots_service_role" ON portfolio_snapshots
  FOR ALL USING (auth.role() = 'service_role');

-- Backfill initial snapshots from existing holdings
INSERT INTO portfolio_snapshots (tenant_id, investor_id, holding_id, snapshot_date, market_value, monthly_rent, occupancy_rate)
SELECT
  h.tenant_id,
  h.investor_id,
  h.id AS holding_id,
  gs.snapshot_date::date,
  h.purchase_price + (h.current_value - h.purchase_price) *
    EXTRACT(EPOCH FROM (gs.snapshot_date::timestamp - h.purchase_date::timestamp)) /
    NULLIF(EXTRACT(EPOCH FROM (CURRENT_DATE::timestamp - h.purchase_date::timestamp)), 0)
  AS market_value,
  h.monthly_rent,
  h.occupancy_rate
FROM holdings h
CROSS JOIN LATERAL generate_series(
  date_trunc('month', h.purchase_date::timestamp),
  date_trunc('month', CURRENT_DATE::timestamp),
  interval '1 month'
) AS gs(snapshot_date)
ON CONFLICT (holding_id, snapshot_date) DO NOTHING;
