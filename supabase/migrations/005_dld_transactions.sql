-- Migration: Add DLD (Dubai Land Department) transactions table for market data
-- Source: Dubai Pulse Open Data (https://dubaipulse.gov.ae)
-- Data: Free open data from Dubai Government

-- =============================================================================
-- 1. TRANSACTIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.dld_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id text UNIQUE NOT NULL,
  procedure_id integer,
  trans_group_en text,
  procedure_name_en text,
  instance_date date,
  property_type_en text,
  property_sub_type_en text,
  property_usage_en text,
  reg_type_en text,
  area_id integer,
  area_name_en text,
  building_name_en text,
  project_name_en text,
  master_project_en text,
  nearest_landmark_en text,
  nearest_metro_en text,
  nearest_mall_en text,
  rooms_en text,
  has_parking boolean DEFAULT false,
  procedure_area numeric(18,2),
  actual_worth numeric(20,2),
  meter_sale_price numeric(18,2),
  rent_value numeric(20,2),
  meter_rent_price numeric(20,2),
  created_at timestamptz DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS dld_transactions_area_idx ON public.dld_transactions(area_name_en);
CREATE INDEX IF NOT EXISTS dld_transactions_date_idx ON public.dld_transactions(instance_date DESC);
CREATE INDEX IF NOT EXISTS dld_transactions_type_idx ON public.dld_transactions(property_type_en);
CREATE INDEX IF NOT EXISTS dld_transactions_group_idx ON public.dld_transactions(trans_group_en);
CREATE INDEX IF NOT EXISTS dld_transactions_worth_idx ON public.dld_transactions(actual_worth);

COMMENT ON TABLE public.dld_transactions IS 'Official Dubai Land Department transaction data from Dubai Pulse Open Data';

-- =============================================================================
-- 2. MARKET SIGNALS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.dld_market_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_type text NOT NULL,
  area_name_en text,
  property_type_en text,
  title text NOT NULL,
  description text,
  severity text DEFAULT 'info',
  metrics jsonb DEFAULT '{}',
  detected_at timestamptz DEFAULT now(),
  valid_until timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dld_signals_type_idx ON public.dld_market_signals(signal_type);
CREATE INDEX IF NOT EXISTS dld_signals_area_idx ON public.dld_market_signals(area_name_en);
CREATE INDEX IF NOT EXISTS dld_signals_active_idx ON public.dld_market_signals(is_active);

COMMENT ON TABLE public.dld_market_signals IS 'Computed market signals based on DLD transaction analysis';

-- =============================================================================
-- 3. VIEWS FOR ANALYSIS
-- =============================================================================

-- Sales transactions only
CREATE OR REPLACE VIEW public.dld_sales AS
SELECT * FROM public.dld_transactions WHERE trans_group_en = 'Sales';

-- Market statistics by area
CREATE OR REPLACE VIEW public.dld_area_stats AS
SELECT 
  area_name_en,
  property_type_en,
  COUNT(*) as transaction_count,
  ROUND(AVG(actual_worth)::numeric, 0) as avg_price,
  ROUND(AVG(meter_sale_price)::numeric, 0) as avg_price_per_sqm,
  ROUND(MIN(actual_worth)::numeric, 0) as min_price,
  ROUND(MAX(actual_worth)::numeric, 0) as max_price,
  MAX(instance_date) as latest_transaction
FROM public.dld_transactions
WHERE trans_group_en = 'Sales' AND actual_worth > 0
GROUP BY area_name_en, property_type_en;

-- Monthly price trends
CREATE OR REPLACE VIEW public.dld_monthly_trends AS
SELECT 
  area_name_en,
  DATE_TRUNC('month', instance_date)::date as month,
  COUNT(*) as transaction_count,
  ROUND(AVG(actual_worth)::numeric, 0) as avg_price,
  ROUND(AVG(meter_sale_price)::numeric, 0) as avg_price_per_sqm,
  ROUND(SUM(actual_worth)::numeric, 0) as total_volume
FROM public.dld_transactions
WHERE trans_group_en = 'Sales' AND actual_worth > 0 AND instance_date IS NOT NULL
GROUP BY area_name_en, DATE_TRUNC('month', instance_date)
ORDER BY area_name_en, month DESC;

-- Premium transactions (>10M AED)
CREATE OR REPLACE VIEW public.dld_premium_transactions AS
SELECT 
  transaction_id,
  instance_date,
  area_name_en,
  property_type_en,
  building_name_en,
  project_name_en,
  rooms_en,
  procedure_area as size_sqm,
  actual_worth as price_aed,
  meter_sale_price as price_per_sqm
FROM public.dld_transactions
WHERE trans_group_en = 'Sales' AND actual_worth >= 10000000
ORDER BY actual_worth DESC;

-- =============================================================================
-- 4. GEOCODING TABLE FOR MAP VISUALIZATION
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.dubai_area_coordinates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_name_en text UNIQUE NOT NULL,
  latitude numeric(10,7) NOT NULL,
  longitude numeric(10,7) NOT NULL,
  area_type text,
  emirate text DEFAULT 'Dubai',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dubai_coords_area_idx ON public.dubai_area_coordinates(area_name_en);

-- View joining transactions with coordinates
CREATE OR REPLACE VIEW public.dld_transactions_with_coords AS
SELECT 
  t.transaction_id, t.instance_date, t.area_name_en, t.property_type_en,
  t.building_name_en, t.project_name_en, t.rooms_en,
  t.procedure_area as size_sqm, t.actual_worth as price_aed,
  t.meter_sale_price as price_per_sqm, t.trans_group_en,
  c.latitude, c.longitude, c.area_type
FROM dld_transactions t
LEFT JOIN dubai_area_coordinates c ON t.area_name_en = c.area_name_en;

-- View for market signals with coordinates
CREATE OR REPLACE VIEW public.dld_signals_with_coords AS
SELECT s.*, c.latitude, c.longitude, c.area_type
FROM dld_market_signals s
LEFT JOIN dubai_area_coordinates c ON s.area_name_en = c.area_name_en;

COMMENT ON TABLE public.dubai_area_coordinates IS 'Geocoding lookup for Dubai area centroids';
COMMENT ON VIEW public.dld_sales IS 'Filtered view of sales transactions only';
COMMENT ON VIEW public.dld_area_stats IS 'Aggregated market statistics by area and property type';
COMMENT ON VIEW public.dld_monthly_trends IS 'Monthly price and volume trends by area';
COMMENT ON VIEW public.dld_premium_transactions IS 'High-value transactions (>10M AED)';
COMMENT ON VIEW public.dld_transactions_with_coords IS 'Transactions with area coordinates for mapping';
COMMENT ON VIEW public.dld_signals_with_coords IS 'Market signals with area coordinates for mapping';
