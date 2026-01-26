-- Seed: Market Signals raw ingestion tables
-- ----------------------------------------
-- Purpose: provide deterministic raw inputs so snapshot writers + detectors can produce real signals end-to-end.
--
-- IMPORTANT ARCHITECTURE:
-- - Signals NEVER read raw tables directly.
-- - Snapshot jobs read raw tables and write ONLY to snapshot tables.
-- - Detectors read ONLY snapshot tables.
--
-- This seed is optional but makes local/dev demos work immediately.

DO $$
DECLARE
  -- Keep in sync with `supabase/seed-holdings.sql` demo tenant id (so mapping + notifications have investors/users).
  v_tenant_id uuid := '550e8400-e29b-41d4-a716-446655440000';

  q0_start date := (date_trunc('quarter', current_date) - interval '6 months')::date;
  q0_end   date := ((date_trunc('quarter', current_date) - interval '3 months')::date - 1);
  q1_start date := (date_trunc('quarter', current_date) - interval '3 months')::date;
  q1_end   date := (date_trunc('quarter', current_date)::date - 1);

  d_prev date := (current_date - interval '7 days')::date;
  d_now  date := current_date;
BEGIN
  -- Clear only this tenant's market-signal-related raw tables
  DELETE FROM raw_portal_listings WHERE org_id = v_tenant_id;
  DELETE FROM raw_ejari_contracts WHERE org_id = v_tenant_id;
  DELETE FROM raw_dld_transactions WHERE org_id = v_tenant_id;

  -- ----------------------------
  -- Raw DLD transactions (2 quarters)
  -- We target a ~10% QoQ increase in median price psf.
  -- ----------------------------
  INSERT INTO raw_dld_transactions (org_id, external_id, transaction_date, geo_type, geo_id, geo_name, segment, sale_price, area_sqft)
  SELECT
    v_tenant_id,
    'dld-q0-' || gs::text,
    (q0_start + ((gs % GREATEST((q0_end - q0_start), 1))::int))::date,
    'area',
    'Dubai Marina',
    'Dubai Marina',
    '2BR',
    -- price psf ~2000
    (2000 * 1200) + (gs * 1000),
    1200
  FROM generate_series(1, 30) gs;

  INSERT INTO raw_dld_transactions (org_id, external_id, transaction_date, geo_type, geo_id, geo_name, segment, sale_price, area_sqft)
  SELECT
    v_tenant_id,
    'dld-q1-' || gs::text,
    (q1_start + ((gs % GREATEST((q1_end - q1_start), 1))::int))::date,
    'area',
    'Dubai Marina',
    'Dubai Marina',
    '2BR',
    -- price psf ~2200 (10% QoQ)
    (2200 * 1200) + (gs * 1000),
    1200
  FROM generate_series(1, 30) gs;

  -- ----------------------------
  -- Raw Ejari contracts (2 quarters)
  -- We target a ~10% QoQ increase in median rent.
  -- ----------------------------
  INSERT INTO raw_ejari_contracts (org_id, external_id, contract_start, geo_type, geo_id, geo_name, segment, annual_rent)
  SELECT
    v_tenant_id,
    'ejari-q0-' || gs::text,
    (q0_start + ((gs % GREATEST((q0_end - q0_start), 1))::int))::date,
    'area',
    'Dubai Marina',
    'Dubai Marina',
    '2BR',
    180000 + (gs * 100)  -- ~180k
  FROM generate_series(1, 30) gs;

  INSERT INTO raw_ejari_contracts (org_id, external_id, contract_start, geo_type, geo_id, geo_name, segment, annual_rent)
  SELECT
    v_tenant_id,
    'ejari-q1-' || gs::text,
    (q1_start + ((gs % GREATEST((q1_end - q1_start), 1))::int))::date,
    'area',
    'Dubai Marina',
    'Dubai Marina',
    '2BR',
    198000 + (gs * 100)  -- ~198k (10% QoQ)
  FROM generate_series(1, 30) gs;

  -- ----------------------------
  -- Raw Portal listings (2 dates, 7 days apart)
  -- We target:
  -- - supply spike: 50 -> 60 active listings (+20% WoW)
  -- - discounting spike: 5 -> 8 price cuts (+60% WoW)
  -- - staleness rise: 5 -> 10 stale listings (+100% WoW)
  -- ----------------------------
  INSERT INTO raw_portal_listings (org_id, portal, listing_id, as_of_date, geo_type, geo_id, geo_name, segment, is_active, price, had_price_cut, days_on_market)
  SELECT
    v_tenant_id,
    'Bayut',
    'bayut-prev-' || gs::text,
    d_prev,
    'area',
    'Dubai Marina',
    'Dubai Marina',
    '2BR',
    true,
    6500000 + (gs * 1000),
    (gs <= 5),
    CASE WHEN gs <= 5 THEN 70 ELSE 30 END
  FROM generate_series(1, 50) gs;

  INSERT INTO raw_portal_listings (org_id, portal, listing_id, as_of_date, geo_type, geo_id, geo_name, segment, is_active, price, had_price_cut, days_on_market)
  SELECT
    v_tenant_id,
    'Bayut',
    'bayut-now-' || gs::text,
    d_now,
    'area',
    'Dubai Marina',
    'Dubai Marina',
    '2BR',
    true,
    6400000 + (gs * 1000),
    (gs <= 8),
    CASE WHEN gs <= 10 THEN 75 ELSE 25 END
  FROM generate_series(1, 60) gs;
END $$;


