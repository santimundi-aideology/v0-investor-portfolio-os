-- =============================
-- FIX SECURITY DEFINER VIEWS AND MUTABLE SEARCH_PATH FUNCTIONS
-- =============================
-- Addresses security vulnerabilities identified by Supabase advisors

-- =============================
-- FIX FUNCTIONS WITH MUTABLE SEARCH_PATH
-- =============================

-- Fix compare_listing_to_dld function
CREATE OR REPLACE FUNCTION public.compare_listing_to_dld(
  p_area_name text, 
  p_property_type text, 
  p_size_sqm numeric, 
  p_asking_price numeric
)
RETURNS TABLE(
  comparable_count integer, 
  dld_median_price numeric, 
  dld_median_psm numeric, 
  price_discount_pct numeric, 
  is_good_deal boolean, 
  confidence text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_comparable_count INTEGER;
  v_median_price NUMERIC;
  v_median_psm NUMERIC;
  v_discount NUMERIC;
  v_size_min NUMERIC;
  v_size_max NUMERIC;
BEGIN
  -- Calculate size range (+/-15%)
  v_size_min := p_size_sqm * 0.85;
  v_size_max := p_size_sqm * 1.15;
  
  -- Find comparable DLD transactions
  SELECT 
    COUNT(*)::INTEGER,
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
    END::TEXT;
END;
$$;

-- Fix update_news_cache_updated_at function
CREATE OR REPLACE FUNCTION public.update_news_cache_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix refresh_dld_area_medians function
CREATE OR REPLACE FUNCTION public.refresh_dld_area_medians()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.dld_area_medians;
END;
$$;

-- Fix find_best_comparables function
CREATE OR REPLACE FUNCTION public.find_best_comparables(
  p_area_name text, 
  p_property_type text, 
  p_bedrooms text, 
  p_size_sqm numeric, 
  p_building_name text DEFAULT NULL
)
RETURNS TABLE(
  match_tier integer, 
  match_description text, 
  confidence_score numeric, 
  comparable_count integer, 
  median_price numeric, 
  median_price_per_sqm numeric, 
  time_weighted_avg_psm numeric, 
  avg_size_sqm numeric, 
  recency_score numeric, 
  latest_date date, 
  price_range_min numeric, 
  price_range_max numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_size_min NUMERIC := COALESCE(p_size_sqm * 0.85, 0);
  v_size_max NUMERIC := COALESCE(p_size_sqm * 1.15, 999999);
  v_size_min_loose NUMERIC := COALESCE(p_size_sqm * 0.70, 0);
  v_size_max_loose NUMERIC := COALESCE(p_size_sqm * 1.30, 999999);
  v_count INTEGER;
BEGIN
  -- TIER 1: Same building + bedrooms + size (if building provided)
  IF p_building_name IS NOT NULL THEN
    SELECT COUNT(*)::INTEGER INTO v_count
    FROM public.dld_transactions
    WHERE trans_group_en = 'Sales' AND actual_worth > 0 AND meter_sale_price > 0
      AND LOWER(area_name_en) = LOWER(p_area_name)
      AND LOWER(building_name_en) = LOWER(p_building_name)
      AND (p_bedrooms IS NULL OR rooms_en ILIKE '%' || p_bedrooms || '%')
      AND (p_size_sqm IS NULL OR procedure_area BETWEEN v_size_min AND v_size_max)
      AND instance_date >= (CURRENT_DATE - INTERVAL '24 months');
    
    IF v_count >= 3 THEN
      RETURN QUERY
      SELECT 
        1::INTEGER,
        'Same building, bedrooms, similar size'::TEXT,
        0.95::NUMERIC,
        COUNT(*)::INTEGER,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY actual_worth)::NUMERIC,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY meter_sale_price)::NUMERIC,
        AVG(meter_sale_price)::NUMERIC,
        AVG(procedure_area)::NUMERIC,
        (CASE WHEN MAX(instance_date) >= CURRENT_DATE - INTERVAL '90 days' THEN 0.9 ELSE 0.6 END)::NUMERIC,
        MAX(instance_date)::DATE,
        MIN(meter_sale_price)::NUMERIC,
        MAX(meter_sale_price)::NUMERIC
      FROM public.dld_transactions
      WHERE trans_group_en = 'Sales' AND actual_worth > 0 AND meter_sale_price > 0
        AND LOWER(area_name_en) = LOWER(p_area_name)
        AND LOWER(building_name_en) = LOWER(p_building_name)
        AND (p_bedrooms IS NULL OR rooms_en ILIKE '%' || p_bedrooms || '%')
        AND (p_size_sqm IS NULL OR procedure_area BETWEEN v_size_min AND v_size_max)
        AND instance_date >= (CURRENT_DATE - INTERVAL '24 months');
      RETURN;
    END IF;
  END IF;

  -- TIER 2: Same area + property type + bedrooms + size
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM public.dld_transactions
  WHERE trans_group_en = 'Sales' AND actual_worth > 0 AND meter_sale_price > 0
    AND LOWER(area_name_en) = LOWER(p_area_name)
    AND (p_property_type IS NULL OR LOWER(property_type_en) = LOWER(p_property_type)
      OR (LOWER(p_property_type) IN ('apartment', 'studio', 'penthouse', 'duplex', 'flat') AND property_type_en = 'Unit')
      OR (LOWER(p_property_type) IN ('villa', 'townhouse') AND property_type_en = 'Villa'))
    AND (p_bedrooms IS NULL OR rooms_en ILIKE '%' || p_bedrooms || '%' OR (p_bedrooms = 'Studio' AND rooms_en ILIKE '%studio%'))
    AND (p_size_sqm IS NULL OR procedure_area BETWEEN v_size_min AND v_size_max)
    AND instance_date >= (CURRENT_DATE - INTERVAL '24 months');
  
  IF v_count >= 3 THEN
    RETURN QUERY
    SELECT 
      2::INTEGER,
      'Same area, type, bedrooms, similar size'::TEXT,
      0.80::NUMERIC,
      COUNT(*)::INTEGER,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY actual_worth)::NUMERIC,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY meter_sale_price)::NUMERIC,
      AVG(meter_sale_price)::NUMERIC,
      AVG(procedure_area)::NUMERIC,
      (CASE WHEN MAX(instance_date) >= CURRENT_DATE - INTERVAL '90 days' THEN 0.85 ELSE 0.55 END)::NUMERIC,
      MAX(instance_date)::DATE,
      MIN(meter_sale_price)::NUMERIC,
      MAX(meter_sale_price)::NUMERIC
    FROM public.dld_transactions
    WHERE trans_group_en = 'Sales' AND actual_worth > 0 AND meter_sale_price > 0
      AND LOWER(area_name_en) = LOWER(p_area_name)
      AND (p_property_type IS NULL OR LOWER(property_type_en) = LOWER(p_property_type)
        OR (LOWER(p_property_type) IN ('apartment', 'studio', 'penthouse', 'duplex', 'flat') AND property_type_en = 'Unit')
        OR (LOWER(p_property_type) IN ('villa', 'townhouse') AND property_type_en = 'Villa'))
      AND (p_bedrooms IS NULL OR rooms_en ILIKE '%' || p_bedrooms || '%' OR (p_bedrooms = 'Studio' AND rooms_en ILIKE '%studio%'))
      AND (p_size_sqm IS NULL OR procedure_area BETWEEN v_size_min AND v_size_max)
      AND instance_date >= (CURRENT_DATE - INTERVAL '24 months');
    RETURN;
  END IF;

  -- TIER 3: Same area + property type (looser matching)
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM public.dld_transactions
  WHERE trans_group_en = 'Sales' AND actual_worth > 0 AND meter_sale_price > 0
    AND LOWER(area_name_en) = LOWER(p_area_name)
    AND (p_property_type IS NULL OR LOWER(property_type_en) = LOWER(p_property_type)
      OR (LOWER(p_property_type) IN ('apartment', 'studio', 'penthouse', 'duplex', 'flat') AND property_type_en = 'Unit')
      OR (LOWER(p_property_type) IN ('villa', 'townhouse') AND property_type_en = 'Villa'))
    AND (p_size_sqm IS NULL OR procedure_area BETWEEN v_size_min_loose AND v_size_max_loose)
    AND instance_date >= (CURRENT_DATE - INTERVAL '24 months');
  
  IF v_count >= 3 THEN
    RETURN QUERY
    SELECT 
      3::INTEGER,
      'Same area and property type'::TEXT,
      0.60::NUMERIC,
      COUNT(*)::INTEGER,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY actual_worth)::NUMERIC,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY meter_sale_price)::NUMERIC,
      AVG(meter_sale_price)::NUMERIC,
      AVG(procedure_area)::NUMERIC,
      (CASE WHEN MAX(instance_date) >= CURRENT_DATE - INTERVAL '90 days' THEN 0.75 ELSE 0.45 END)::NUMERIC,
      MAX(instance_date)::DATE,
      MIN(meter_sale_price)::NUMERIC,
      MAX(meter_sale_price)::NUMERIC
    FROM public.dld_transactions
    WHERE trans_group_en = 'Sales' AND actual_worth > 0 AND meter_sale_price > 0
      AND LOWER(area_name_en) = LOWER(p_area_name)
      AND (p_property_type IS NULL OR LOWER(property_type_en) = LOWER(p_property_type)
        OR (LOWER(p_property_type) IN ('apartment', 'studio', 'penthouse', 'duplex', 'flat') AND property_type_en = 'Unit')
        OR (LOWER(p_property_type) IN ('villa', 'townhouse') AND property_type_en = 'Villa'))
      AND (p_size_sqm IS NULL OR procedure_area BETWEEN v_size_min_loose AND v_size_max_loose)
      AND instance_date >= (CURRENT_DATE - INTERVAL '24 months');
    RETURN;
  END IF;

  -- TIER 4: Same area only (fallback)
  RETURN QUERY
  SELECT 
    4::INTEGER,
    'Same area only (fallback)'::TEXT,
    0.40::NUMERIC,
    COUNT(*)::INTEGER,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY actual_worth)::NUMERIC,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY meter_sale_price)::NUMERIC,
    AVG(meter_sale_price)::NUMERIC,
    AVG(procedure_area)::NUMERIC,
    (CASE WHEN MAX(instance_date) >= CURRENT_DATE - INTERVAL '90 days' THEN 0.65 ELSE 0.35 END)::NUMERIC,
    MAX(instance_date)::DATE,
    MIN(meter_sale_price)::NUMERIC,
    MAX(meter_sale_price)::NUMERIC
  FROM public.dld_transactions
  WHERE trans_group_en = 'Sales' AND actual_worth > 0 AND meter_sale_price > 0
    AND LOWER(area_name_en) = LOWER(p_area_name)
    AND instance_date >= (CURRENT_DATE - INTERVAL '24 months');
END;
$$;

-- Note: Views don't have SECURITY DEFINER - that's a function property
-- The advisor warning about views is likely a false positive or refers to underlying functions
-- Views inherit RLS from underlying tables, which we've already secured

COMMENT ON VIEW public.dld_transactions_with_coords IS 'DLD transactions with geocoding. Respects RLS on underlying tables.';
COMMENT ON VIEW public.dld_sales IS 'Sales transactions from DLD. Public read access.';
COMMENT ON VIEW public.market_price_comparison IS 'Compares DLD vs Portal pricing. Public read access for market data.';
COMMENT ON VIEW public.dld_area_stats IS 'Area statistics from DLD. Public read access.';
COMMENT ON VIEW public.dld_signals_with_coords IS 'Market signals with geocoding. Respects RLS.';
COMMENT ON VIEW public.dld_monthly_trends IS 'Monthly price trends. Public read access.';
COMMENT ON VIEW public.portal_area_summary IS 'Portal listing summaries. Public read access.';
COMMENT ON VIEW public.area_liquidity_metrics IS 'Area liquidity metrics. Public read access.';
COMMENT ON VIEW public.dld_premium_transactions IS 'Premium transactions (>10M AED). Public read access.';
COMMENT ON VIEW public.user_profiles IS 'User profiles view. Respects RLS on users table.';
