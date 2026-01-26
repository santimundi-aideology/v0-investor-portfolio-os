-- Fix ALL CHECK constraints on snapshot tables
-- -----------------------------------------------------------------------
-- Problem: Existing CHECK constraints don't allow the values our snapshot
-- writers insert (e.g., 'area', 'DLD', 'Bayut').
--
-- Solution: Drop old restrictive constraints and recreate with correct values.

-- ===========================
-- market_metric_snapshot
-- ===========================

-- Drop old constraints
ALTER TABLE IF EXISTS public.market_metric_snapshot
  DROP CONSTRAINT IF EXISTS market_metric_snapshot_geo_type_check;

ALTER TABLE IF EXISTS public.market_metric_snapshot
  DROP CONSTRAINT IF EXISTS market_metric_snapshot_source_check;

-- Recreate with correct values
ALTER TABLE public.market_metric_snapshot
  ADD CONSTRAINT market_metric_snapshot_geo_type_check
  CHECK (geo_type IN ('area', 'community', 'submarket', 'city', 'emirate', 'country'));

ALTER TABLE public.market_metric_snapshot
  ADD CONSTRAINT market_metric_snapshot_source_check
  CHECK (source IN ('DLD', 'Ejari', 'derived', 'external'));

-- ===========================
-- portal_listing_snapshot
-- ===========================

-- Drop old constraints
ALTER TABLE IF EXISTS public.portal_listing_snapshot
  DROP CONSTRAINT IF EXISTS portal_listing_snapshot_geo_type_check;

ALTER TABLE IF EXISTS public.portal_listing_snapshot
  DROP CONSTRAINT IF EXISTS portal_listing_snapshot_portal_check;

-- Recreate with correct values
ALTER TABLE public.portal_listing_snapshot
  ADD CONSTRAINT portal_listing_snapshot_geo_type_check
  CHECK (geo_type IN ('area', 'community', 'submarket', 'city', 'emirate', 'country'));

ALTER TABLE public.portal_listing_snapshot
  ADD CONSTRAINT portal_listing_snapshot_portal_check
  CHECK (portal IN ('Bayut', 'PropertyFinder', 'Dubizzle', 'external'));

-- ===========================
-- Verify all constraints
-- ===========================
SELECT 
  conname as constraint_name,
  conrelid::regclass as table_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid IN (
  'public.market_metric_snapshot'::regclass,
  'public.portal_listing_snapshot'::regclass
)
AND contype = 'c'  -- CHECK constraints only
ORDER BY table_name, conname;

