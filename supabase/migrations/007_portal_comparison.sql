-- Migration: Portal Comparison System
-- Enables comparison of Bayut/PropertyFinder asking prices against DLD historical sales
-- to identify pricing opportunities (underpriced listings)

-- -----------------------------
-- 1. PORTAL LISTINGS TABLE
-- -----------------------------
-- Stores current listings from Bayut/PropertyFinder for price comparison

CREATE TABLE IF NOT EXISTS public.portal_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal TEXT NOT NULL, -- 'bayut', 'property_finder'
  listing_id TEXT NOT NULL,
  listing_url TEXT,
  
  -- Location
  area_name TEXT,
  building_name TEXT,
  project_name TEXT,
  
  -- Property details
  property_type TEXT, -- 'Apartment', 'Villa', 'Townhouse', etc.
  bedrooms INTEGER,
  bathrooms INTEGER,
  size_sqm NUMERIC(12,2),
  
  -- Pricing
  asking_price NUMERIC(18,2) NOT NULL,
  price_per_sqm NUMERIC(12,2),
  listing_type TEXT DEFAULT 'sale', -- 'sale' or 'rent'
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  listed_date DATE,
  days_on_market INTEGER,
  
  -- Agent info
  agent_name TEXT,
  agency_name TEXT,
  
  -- Extras
  has_parking BOOLEAN,
  furnished TEXT, -- 'furnished', 'unfurnished', 'partly_furnished'
  amenities TEXT[],
  photos TEXT[],
  
  -- Metadata
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(portal, listing_id)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS portal_listings_area_idx ON public.portal_listings(area_name);
CREATE INDEX IF NOT EXISTS portal_listings_type_idx ON public.portal_listings(property_type);
CREATE INDEX IF NOT EXISTS portal_listings_price_idx ON public.portal_listings(asking_price);
CREATE INDEX IF NOT EXISTS portal_listings_active_idx ON public.portal_listings(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS portal_listings_portal_idx ON public.portal_listings(portal);

COMMENT ON TABLE public.portal_listings IS 'Current listings from real estate portals (Bayut, PropertyFinder) for price comparison against DLD data';

-- -----------------------------
-- 2. DLD AREA MEDIANS VIEW
-- -----------------------------
-- Materialized view of median prices per area from DLD transactions
-- Used as the baseline for comparing portal listing prices

CREATE MATERIALIZED VIEW IF NOT EXISTS public.dld_area_medians AS
SELECT
  area_name_en,
  property_type_en,
  COUNT(*) as transaction_count,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY actual_worth) as median_price,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY meter_sale_price) as median_price_per_sqm,
  AVG(actual_worth) as avg_price,
  AVG(meter_sale_price) as avg_price_per_sqm,
  MIN(actual_worth) as min_price,
  MAX(actual_worth) as max_price,
  MIN(instance_date) as earliest_date,
  MAX(instance_date) as latest_date
FROM public.dld_transactions
WHERE 
  trans_group_en = 'Sales'
  AND actual_worth > 0
  AND area_name_en IS NOT NULL
  -- Filter to recent transactions (last 18 months for better coverage)
  AND instance_date >= (CURRENT_DATE - INTERVAL '18 months')
GROUP BY area_name_en, property_type_en
HAVING COUNT(*) >= 3; -- Require at least 3 transactions for statistical validity

-- Unique index for efficient refreshes
CREATE UNIQUE INDEX IF NOT EXISTS dld_area_medians_pk 
  ON public.dld_area_medians(area_name_en, property_type_en);

CREATE INDEX IF NOT EXISTS dld_area_medians_area_idx 
  ON public.dld_area_medians(area_name_en);

COMMENT ON MATERIALIZED VIEW public.dld_area_medians IS 'Median prices per area/property-type from DLD transactions (last 18 months)';

-- -----------------------------
-- 3. PORTAL AREA SUMMARY VIEW
-- -----------------------------
-- Aggregate portal listings by area for comparison

CREATE OR REPLACE VIEW public.portal_area_summary AS
SELECT
  area_name,
  property_type,
  COUNT(*) as listing_count,
  AVG(asking_price) as avg_price,
  AVG(price_per_sqm) as avg_price_per_sqm,
  MIN(asking_price) as min_price,
  MAX(asking_price) as max_price,
  AVG(days_on_market) as avg_days_on_market
FROM public.portal_listings
WHERE is_active = true AND listing_type = 'sale'
GROUP BY area_name, property_type;

COMMENT ON VIEW public.portal_area_summary IS 'Aggregate summary of active portal listings by area';

-- -----------------------------
-- 4. AREA PRICE COMPARISON VIEW
-- -----------------------------
-- Join DLD medians with portal listings to identify price gaps

CREATE OR REPLACE VIEW public.area_price_comparison AS
SELECT
  COALESCE(d.area_name_en, p.area_name) as area_name,
  COALESCE(d.property_type_en, p.property_type) as property_type,
  
  -- DLD data
  d.transaction_count as dld_count,
  ROUND(d.median_price::numeric, 0) as dld_median_price,
  ROUND(d.median_price_per_sqm::numeric, 0) as dld_median_psm,
  ROUND(d.avg_price::numeric, 0) as dld_avg_price,
  
  -- Portal data
  p.listing_count as portal_count,
  ROUND(p.avg_price::numeric, 0) as portal_avg_price,
  ROUND(p.avg_price_per_sqm::numeric, 0) as portal_avg_psm,
  
  -- Comparison metrics
  CASE 
    WHEN d.median_price > 0 THEN
      ROUND(((p.avg_price - d.median_price) / d.median_price * 100)::numeric, 1)
    ELSE NULL
  END as price_premium_pct,
  
  -- Flags
  CASE 
    WHEN d.transaction_count IS NOT NULL AND p.listing_count IS NOT NULL THEN 1 
    ELSE 0 
  END as has_both
  
FROM public.dld_area_medians d
FULL OUTER JOIN public.portal_area_summary p 
  ON LOWER(d.area_name_en) = LOWER(p.area_name)
  AND LOWER(d.property_type_en) = LOWER(p.property_type)
ORDER BY has_both DESC, d.transaction_count DESC NULLS LAST;

COMMENT ON VIEW public.area_price_comparison IS 'Comparison of DLD historical prices vs current portal asking prices';

-- -----------------------------
-- 5. LISTING COMPARISON FUNCTION
-- -----------------------------
-- Function to compare a single listing against DLD comparable sales

CREATE OR REPLACE FUNCTION public.compare_listing_to_dld(
  p_area_name TEXT,
  p_property_type TEXT,
  p_size_sqm NUMERIC,
  p_asking_price NUMERIC
)
RETURNS TABLE (
  comparable_count INTEGER,
  dld_median_price NUMERIC,
  dld_median_psm NUMERIC,
  price_discount_pct NUMERIC,
  is_good_deal BOOLEAN,
  confidence TEXT
) AS $$
DECLARE
  v_comparable_count INTEGER;
  v_median_price NUMERIC;
  v_median_psm NUMERIC;
  v_discount NUMERIC;
  v_size_min NUMERIC;
  v_size_max NUMERIC;
BEGIN
  -- Calculate size range (±15%)
  v_size_min := p_size_sqm * 0.85;
  v_size_max := p_size_sqm * 1.15;
  
  -- Find comparable DLD transactions
  SELECT 
    COUNT(*),
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY actual_worth),
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY meter_sale_price)
  INTO v_comparable_count, v_median_price, v_median_psm
  FROM public.dld_transactions
  WHERE 
    trans_group_en = 'Sales'
    AND actual_worth > 0
    AND LOWER(area_name_en) = LOWER(p_area_name)
    AND (
      p_property_type IS NULL 
      OR LOWER(property_type_en) ILIKE '%' || LOWER(p_property_type) || '%'
    )
    AND (
      p_size_sqm IS NULL 
      OR procedure_area BETWEEN v_size_min AND v_size_max
    )
    AND instance_date >= (CURRENT_DATE - INTERVAL '18 months');
  
  -- Calculate discount (positive = cheaper than market)
  IF v_median_price > 0 THEN
    v_discount := ((v_median_price - p_asking_price) / v_median_price) * 100;
  ELSE
    v_discount := NULL;
  END IF;
  
  RETURN QUERY SELECT
    v_comparable_count,
    ROUND(v_median_price, 0),
    ROUND(v_median_psm, 0),
    ROUND(v_discount, 1),
    v_discount > 10, -- Good deal if >10% below market
    CASE
      WHEN v_comparable_count >= 20 THEN 'high'
      WHEN v_comparable_count >= 10 THEN 'medium'
      WHEN v_comparable_count >= 3 THEN 'low'
      ELSE 'insufficient'
    END;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.compare_listing_to_dld IS 'Compare a portal listing against DLD comparable sales to determine if it is a good deal';

-- -----------------------------
-- 6. REFRESH FUNCTION
-- -----------------------------
-- Function to refresh the materialized view (call periodically)

CREATE OR REPLACE FUNCTION public.refresh_dld_area_medians()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.dld_area_medians;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.refresh_dld_area_medians IS 'Refresh DLD area medians materialized view';
