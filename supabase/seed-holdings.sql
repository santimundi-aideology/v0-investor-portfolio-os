-- Seed data for testing AI agents with Supabase
-- This creates sample tenants, investors, listings, and holdings

-- Define UUIDs as variables (for consistency)
-- NOTE: Using proper UUID format
DO $$ 
DECLARE
  v_tenant_id uuid := '550e8400-e29b-41d4-a716-446655440000';
  v_agent_id uuid := '550e8400-e29b-41d4-a716-446655440001';
  v_investor_1_id uuid := '550e8400-e29b-41d4-a716-446655440002';
  v_investor_2_id uuid := '550e8400-e29b-41d4-a716-446655440003';
  v_listing_1_id uuid := '550e8400-e29b-41d4-a716-446655440010';
  v_listing_2_id uuid := '550e8400-e29b-41d4-a716-446655440011';
  v_listing_3_id uuid := '550e8400-e29b-41d4-a716-446655440012';
  v_listing_4_id uuid := '550e8400-e29b-41d4-a716-446655440013';
  v_listing_5_id uuid := '550e8400-e29b-41d4-a716-446655440014';
  v_listing_6_id uuid := '550e8400-e29b-41d4-a716-446655440015';
  v_listing_7_id uuid := '550e8400-e29b-41d4-a716-446655440016';
BEGIN

-- Clean up existing test data (optional)
DELETE FROM holdings WHERE tenant_id = v_tenant_id;
DELETE FROM listings WHERE tenant_id = v_tenant_id;
DELETE FROM investors WHERE tenant_id = v_tenant_id;
DELETE FROM users WHERE tenant_id = v_tenant_id;
DELETE FROM tenants WHERE id = v_tenant_id;

-- 1. Create demo tenant
INSERT INTO tenants (id, name, created_at)
VALUES (
  v_tenant_id,
  'Demo Real Estate Agency',
  now()
);

-- 2. Create demo agent user
INSERT INTO users (id, tenant_id, name, email, role, created_at, updated_at)
VALUES (
  v_agent_id,
  v_tenant_id,
  'Sarah Agent',
  'sarah.agent@demo.com',
  'agent',
  now(),
  now()
);

-- 3. Create demo investors
INSERT INTO investors (id, tenant_id, name, company, email, phone, status, mandate, assigned_agent_id, created_at)
VALUES 
  (
    v_investor_1_id,
    v_tenant_id,
    'Mohammed Al-Rashid',
    'Al-Rashid Investments',
    'mohammed@alrashid.ae',
    '+971501234567',
    'active',
    '{
      "propertyTypes": ["residential", "commercial"],
      "preferredAreas": ["Dubai Marina", "Downtown Dubai", "Business Bay"],
      "yieldTarget": "8-10%",
      "minInvestment": 5000000,
      "maxInvestment": 20000000,
      "investmentHorizon": "5-10 years",
      "riskTolerance": "moderate"
    }'::jsonb,
    v_agent_id,
    now()
  ),
  (
    v_investor_2_id,
    v_tenant_id,
    'Patricia Chen',
    'Chen Capital',
    'patricia@chencapital.com',
    '+971509876543',
    'active',
    '{
      "propertyTypes": ["residential"],
      "preferredAreas": ["Palm Jumeirah", "Emirates Hills"],
      "yieldTarget": "6-8%",
      "minInvestment": 10000000,
      "maxInvestment": 50000000,
      "investmentHorizon": "10+ years",
      "riskTolerance": "conservative"
    }'::jsonb,
    v_agent_id,
    now()
  );

-- 4. Create demo listings
INSERT INTO listings (id, tenant_id, title, address, area, type, status, price, size, bedrooms, bathrooms, readiness, developer, expected_rent, currency, handover_date, created_at, updated_at)
VALUES 
  -- Existing owned properties
  (
    v_listing_1_id,
    v_tenant_id,
    'Marina View Apartment',
    'Marina Heights Tower, Dubai Marina',
    'Dubai Marina',
    'residential',
    'sold',
    8200000,
    2100,
    3,
    3,
    'Ready',
    'Emaar Properties',
    72000,
    'AED',
    '2023-06-15',
    now(),
    now()
  ),
  (
    v_listing_2_id,
    v_tenant_id,
    'Business Bay Office Suite',
    'Executive Tower B, Business Bay',
    'Business Bay',
    'commercial',
    'sold',
    11500000,
    1800,
    NULL,
    2,
    'Ready',
    'Damac Properties',
    98000,
    'AED',
    '2023-03-20',
    now(),
    now()
  ),
  (
    v_listing_3_id,
    v_tenant_id,
    'Downtown Dubai Penthouse',
    'Boulevard Point, Downtown Dubai',
    'Downtown Dubai',
    'residential',
    'sold',
    15800000,
    3200,
    4,
    4,
    'Ready',
    'Emaar Properties',
    118000,
    'AED',
    '2023-08-10',
    now(),
    now()
  ),
  -- Available properties for recommendations
  (
    v_listing_4_id,
    v_tenant_id,
    'Marina Towers 2BR Apartment',
    'Marina Towers, Dubai Marina',
    'Dubai Marina',
    'residential',
    'available',
    6500000,
    1650,
    2,
    2,
    'Ready',
    'Select Group',
    58000,
    'AED',
    NULL,
    now(),
    now()
  ),
  (
    v_listing_5_id,
    v_tenant_id,
    'Business Bay Commercial Office',
    'Bay Square, Business Bay',
    'Business Bay',
    'commercial',
    'available',
    9200000,
    1400,
    NULL,
    1,
    'Ready',
    'Omniyat',
    82000,
    'AED',
    NULL,
    now(),
    now()
  ),
  (
    v_listing_6_id,
    v_tenant_id,
    'Downtown Luxury Apartment',
    'The Address, Downtown Dubai',
    'Downtown Dubai',
    'residential',
    'available',
    12500000,
    2400,
    3,
    3,
    'Ready',
    'Emaar Properties',
    95000,
    'AED',
    NULL,
    now(),
    now()
  ),
  (
    v_listing_7_id,
    v_tenant_id,
    'Palm Jumeirah Villa',
    'Frond K, Palm Jumeirah',
    'Palm Jumeirah',
    'residential',
    'available',
    28000000,
    5200,
    5,
    6,
    'Ready',
    'Nakheel',
    185000,
    'AED',
    NULL,
    now(),
    now()
  );

-- 5. Create holdings for investor 1
INSERT INTO holdings (id, tenant_id, investor_id, listing_id, purchase_price, purchase_date, current_value, monthly_rent, occupancy_rate, annual_expenses, created_at, updated_at)
VALUES 
  (
    gen_random_uuid(),
    v_tenant_id,
    v_investor_1_id,
    v_listing_1_id,
    8200000,
    '2023-07-01',
    8800000,  -- Appreciated 7.3%
    72000,
    0.96,  -- 96% occupancy
    205000,  -- Annual expenses
    now(),
    now()
  ),
  (
    gen_random_uuid(),
    v_tenant_id,
    v_investor_1_id,
    v_listing_2_id,
    11500000,
    '2023-04-15',
    12100000,  -- Appreciated 5.2%
    98000,
    0.98,  -- 98% occupancy
    285000,  -- Annual expenses
    now(),
    now()
  );

-- 6. Create holdings for investor 2
INSERT INTO holdings (id, tenant_id, investor_id, listing_id, purchase_price, purchase_date, current_value, monthly_rent, occupancy_rate, annual_expenses, created_at, updated_at)
VALUES 
  (
    gen_random_uuid(),
    v_tenant_id,
    v_investor_2_id,
    v_listing_3_id,
    15800000,
    '2023-09-01',
    16500000,  -- Appreciated 4.4%
    118000,
    0.92,  -- 92% occupancy
    420000,  -- Annual expenses
    now(),
    now()
  );

END $$;

-- Verify the data
SELECT 
  'Tenants' as table_name, 
  COUNT(*) as count 
FROM tenants 
WHERE name = 'Demo Real Estate Agency'

UNION ALL

SELECT 
  'Users' as table_name, 
  COUNT(*) as count 
FROM users 
WHERE email = 'sarah.agent@demo.com'

UNION ALL

SELECT 
  'Investors' as table_name, 
  COUNT(*) as count 
FROM investors 
WHERE email IN ('mohammed@alrashid.ae', 'patricia@chencapital.com')

UNION ALL

SELECT 
  'Listings' as table_name, 
  COUNT(*) as count 
FROM listings 
WHERE title LIKE '%Marina%' OR title LIKE '%Business Bay%' OR title LIKE '%Downtown%'

UNION ALL

SELECT 
  'Holdings' as table_name, 
  COUNT(*) as count 
FROM holdings;

-- Show investor portfolios
SELECT 
  i.name as investor_name,
  COUNT(h.id) as properties,
  SUM(h.current_value) as total_value,
  ROUND(AVG(h.occupancy_rate * 100), 1) as avg_occupancy_pct,
  ROUND(AVG(
    ((h.monthly_rent * 12 * h.occupancy_rate) - h.annual_expenses) / h.current_value * 100
  ), 2) as avg_yield_pct
FROM investors i
LEFT JOIN holdings h ON h.investor_id = i.id
WHERE i.email IN ('mohammed@alrashid.ae', 'patricia@chencapital.com')
GROUP BY i.id, i.name;

