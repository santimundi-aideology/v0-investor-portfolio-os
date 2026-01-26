-- Migration: Copy dld_transactions to raw_dld_transactions
-- Required for market signals pipeline
-- 
-- This script copies data from the imported dld_transactions table
-- to the raw_dld_transactions table with proper field mapping.
--
-- Run with: psql $DATABASE_URL -f supabase/migrate-dld-to-raw.sql

-- First, show count of source data
DO $$
DECLARE
  source_count INTEGER;
  existing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO source_count FROM dld_transactions WHERE trans_group_en = 'Sales' AND actual_worth > 0;
  SELECT COUNT(*) INTO existing_count FROM raw_dld_transactions WHERE org_id = '11111111-1111-1111-1111-111111111111';
  RAISE NOTICE 'Source transactions (Sales with price > 0): %', source_count;
  RAISE NOTICE 'Existing raw_dld_transactions for tenant: %', existing_count;
END $$;

-- Insert transactions with proper mapping
INSERT INTO raw_dld_transactions (
  org_id,
  external_id,
  transaction_date,
  geo_type,
  geo_id,
  geo_name,
  segment,
  sale_price,
  area_sqft,
  currency,
  metadata
)
SELECT 
  '11111111-1111-1111-1111-111111111111'::uuid as org_id,
  transaction_id as external_id,
  instance_date::date as transaction_date,
  'area' as geo_type,
  lower(regexp_replace(area_name_en, '[^a-zA-Z0-9]+', '-', 'g')) as geo_id,
  area_name_en as geo_name,
  COALESCE(NULLIF(rooms_en, ''), property_type_en, 'Unknown') as segment,
  actual_worth as sale_price,
  procedure_area * 10.764 as area_sqft,
  'AED' as currency,
  jsonb_build_object(
    'property_type', property_type_en,
    'property_sub_type', property_sub_type_en,
    'property_usage', property_usage_en,
    'building_name', building_name_en,
    'project_name', project_name_en,
    'meter_sale_price', meter_sale_price,
    'has_parking', has_parking,
    'trans_group', trans_group_en,
    'procedure_name', procedure_name_en
  ) as metadata
FROM dld_transactions
WHERE trans_group_en = 'Sales'
  AND actual_worth > 0
ON CONFLICT (org_id, external_id) DO NOTHING;

-- Show results
DO $$
DECLARE
  new_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO new_count FROM raw_dld_transactions WHERE org_id = '11111111-1111-1111-1111-111111111111';
  RAISE NOTICE 'Total raw_dld_transactions after migration: %', new_count;
END $$;

-- Show sample of migrated data
SELECT 
  geo_name as area,
  segment,
  COUNT(*) as transactions,
  ROUND(AVG(sale_price)::numeric, 0) as avg_price,
  ROUND(AVG(area_sqft)::numeric, 0) as avg_sqft
FROM raw_dld_transactions
WHERE org_id = '11111111-1111-1111-1111-111111111111'
GROUP BY geo_name, segment
ORDER BY COUNT(*) DESC
LIMIT 10;
