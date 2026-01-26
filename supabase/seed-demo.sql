-- Demo Mode Seed Data
-- Comprehensive demo data for customer showcases and presentations
-- Run this script to populate demo data with consistent UUIDs for navigation

BEGIN;

-- =============================
-- DEMO IDENTIFIERS
-- Using consistent, recognizable UUIDs for easy navigation
-- =============================

-- Clean up any existing demo data first
DELETE FROM public.market_signal_target WHERE tenant_id = 'demo-0000-0000-0000-000000000001'::uuid;
DELETE FROM public.market_signal WHERE tenant_id = 'demo-0000-0000-0000-000000000001'::uuid;
DELETE FROM public.decisions WHERE tenant_id = 'demo-0000-0000-0000-000000000001'::uuid;
DELETE FROM public.messages WHERE tenant_id = 'demo-0000-0000-0000-000000000001'::uuid;
DELETE FROM public.memo_versions WHERE memo_id IN (SELECT id FROM public.memos WHERE tenant_id = 'demo-0000-0000-0000-000000000001'::uuid);
DELETE FROM public.memos WHERE tenant_id = 'demo-0000-0000-0000-000000000001'::uuid;
DELETE FROM public.tasks WHERE tenant_id = 'demo-0000-0000-0000-000000000001'::uuid;
DELETE FROM public.trust_records WHERE tenant_id = 'demo-0000-0000-0000-000000000001'::uuid;
DELETE FROM public.underwriting_comps WHERE tenant_id = 'demo-0000-0000-0000-000000000001'::uuid;
DELETE FROM public.underwritings WHERE tenant_id = 'demo-0000-0000-0000-000000000001'::uuid;
DELETE FROM public.shortlist_items WHERE tenant_id = 'demo-0000-0000-0000-000000000001'::uuid;
DELETE FROM public.shortlists WHERE tenant_id = 'demo-0000-0000-0000-000000000001'::uuid;
DELETE FROM public.holdings WHERE tenant_id = 'demo-0000-0000-0000-000000000001'::uuid;
DELETE FROM public.mandates WHERE tenant_id = 'demo-0000-0000-0000-000000000001'::uuid;
DELETE FROM public.listings WHERE tenant_id = 'demo-0000-0000-0000-000000000001'::uuid;
DELETE FROM public.investors WHERE tenant_id = 'demo-0000-0000-0000-000000000001'::uuid;
DELETE FROM public.audit_events WHERE tenant_id = 'demo-0000-0000-0000-000000000001'::uuid;
DELETE FROM public.notifications WHERE tenant_id = 'demo-0000-0000-0000-000000000001'::uuid;
DELETE FROM public.users WHERE tenant_id = 'demo-0000-0000-0000-000000000001'::uuid;
DELETE FROM public.tenants WHERE id = 'demo-0000-0000-0000-000000000001'::uuid;

-- =============================
-- TENANT (Demo Organization)
-- =============================
INSERT INTO public.tenants (id, name, created_at) VALUES
  ('demo-0000-0000-0000-000000000001', 'Al-Rashid Realty Group (Demo)', now());

-- =============================
-- USERS
-- =============================
INSERT INTO public.users (id, tenant_id, name, email, role, created_at) VALUES
  -- Demo Realtor (Primary User)
  ('demo-user-0000-0000-000000000001', 'demo-0000-0000-0000-000000000001', 'Sarah Al-Rashid', 'sarah@demo-alrashid.ae', 'agent', now()),
  -- Demo Admin
  ('demo-user-0000-0000-000000000002', 'demo-0000-0000-0000-000000000001', 'Omar Al-Nahyan', 'omar@demo-alrashid.ae', 'manager', now());

-- =============================
-- INVESTORS
-- =============================
INSERT INTO public.investors 
  (id, tenant_id, name, company, email, phone, status, mandate, created_at, last_contact, total_deals, assigned_agent_id, avatar)
VALUES
  -- Primary Demo Investor: Mohammed Al-Rashid
  (
    'demo-inv-0000-0000-000000000001',
    'demo-0000-0000-0000-000000000001',
    'Mohammed Al-Rashid',
    'Al-Rashid Investments LLC',
    'm.alrashid@demo-alrashid-inv.ae',
    '+971 50 123 4567',
    'active',
    '{
      "strategy": "Core Plus",
      "investmentHorizon": "5-7 years",
      "yieldTarget": "8-12%",
      "riskTolerance": "medium",
      "preferredAreas": ["Dubai Marina", "Downtown Dubai", "Business Bay", "Palm Jumeirah"],
      "propertyTypes": ["residential", "commercial", "mixed-use"],
      "minInvestment": 5000000,
      "maxInvestment": 30000000,
      "notes": "Focus on premium Grade A assets with established tenant base. Prefers turnkey investments with minimal capex requirements."
    }'::jsonb,
    now() - interval '6 months',
    now() - interval '2 days',
    4,
    'demo-user-0000-0000-000000000001',
    null
  ),
  -- Secondary Demo Investor: Amira Al-Mansoori
  (
    'demo-inv-0000-0000-000000000002',
    'demo-0000-0000-0000-000000000001',
    'Amira Al-Mansoori',
    'Mansoori Capital Partners',
    'amira@demo-mansoori-capital.com',
    '+971 55 987 6543',
    'active',
    '{
      "strategy": "Value Add",
      "investmentHorizon": "3-5 years",
      "yieldTarget": "15-20%",
      "riskTolerance": "high",
      "preferredAreas": ["JVC", "Dubai South", "Al Quoz", "Dubai Creek Harbour"],
      "propertyTypes": ["residential", "land"],
      "minInvestment": 3000000,
      "maxInvestment": 15000000,
      "notes": "Seeks undervalued assets with renovation or repositioning potential. Comfortable with construction risk."
    }'::jsonb,
    now() - interval '4 months',
    now() - interval '5 days',
    2,
    'demo-user-0000-0000-000000000001',
    null
  );

-- =============================
-- LISTINGS (7+ Properties)
-- =============================
INSERT INTO public.listings
  (id, tenant_id, title, address, area, type, status, price, size, bedrooms, bathrooms, readiness, developer, expected_rent, currency, handover_date, created_at)
VALUES
  -- Property 1: Marina Penthouse (Sold - Holding)
  (
    'demo-lst-0000-0000-000000000001',
    'demo-0000-0000-0000-000000000001',
    'Marina View Penthouse',
    'Marina Heights Tower, Floor 45, Dubai Marina',
    'Dubai Marina',
    'residential',
    'sold',
    12500000,
    3200,
    4,
    5,
    'Ready',
    'Select Group',
    1020000,
    'AED',
    null,
    now() - interval '10 months'
  ),
  -- Property 2: Downtown Office (Sold - Holding)
  (
    'demo-lst-0000-0000-000000000002',
    'demo-0000-0000-0000-000000000001',
    'Downtown Boulevard Office Tower',
    'Boulevard Plaza, Tower 1, Downtown Dubai',
    'Downtown Dubai',
    'commercial',
    'sold',
    18500000,
    4500,
    null,
    null,
    'Ready',
    'Emaar Properties',
    1944000,
    'AED',
    null,
    now() - interval '14 months'
  ),
  -- Property 3: Business Bay Retail (Sold - Holding)
  (
    'demo-lst-0000-0000-000000000003',
    'demo-0000-0000-0000-000000000001',
    'Bay Square Retail Podium',
    'Bay Square, Building 7, Business Bay',
    'Business Bay',
    'commercial',
    'sold',
    8200000,
    2100,
    null,
    null,
    'Ready',
    'Omniyat',
    720000,
    'AED',
    null,
    now() - interval '12 months'
  ),
  -- Property 4: Palm Villa (Available - Active Opportunity)
  (
    'demo-lst-0000-0000-000000000004',
    'demo-0000-0000-0000-000000000001',
    'Palm Jumeirah Signature Villa',
    'Frond L, Palm Jumeirah',
    'Palm Jumeirah',
    'residential',
    'available',
    42000000,
    8500,
    6,
    7,
    'Ready',
    'Nakheel',
    2400000,
    'AED',
    null,
    now() - interval '20 days'
  ),
  -- Property 5: JVC Apartment (Sold - Holding for Investor 2)
  (
    'demo-lst-0000-0000-000000000005',
    'demo-0000-0000-0000-000000000001',
    'JVC Community Residence',
    'District 12, Jumeirah Village Circle',
    'JVC',
    'residential',
    'sold',
    1850000,
    1200,
    2,
    3,
    'Ready',
    'Nakheel',
    144000,
    'AED',
    null,
    now() - interval '7 months'
  ),
  -- Property 6: Creek Harbour (Available)
  (
    'demo-lst-0000-0000-000000000006',
    'demo-0000-0000-0000-000000000001',
    'Dubai Creek Harbour Residence',
    'Creek Gate Tower 2, Dubai Creek Harbour',
    'Dubai Creek Harbour',
    'residential',
    'available',
    6800000,
    2400,
    3,
    4,
    'Ready',
    'Emaar Properties',
    450000,
    'AED',
    null,
    now() - interval '10 days'
  ),
  -- Property 7: Bluewaters (Under Offer - Holding)
  (
    'demo-lst-0000-0000-000000000007',
    'demo-0000-0000-0000-000000000001',
    'Bluewaters Island 2BR',
    'Bluewaters Residences, Building 8',
    'Bluewaters Island',
    'residential',
    'sold',
    5200000,
    1650,
    2,
    3,
    'Ready',
    'Meraas',
    336000,
    'AED',
    null,
    now() - interval '5 months'
  ),
  -- Property 8: Additional Marina Listing
  (
    'demo-lst-0000-0000-000000000008',
    'demo-0000-0000-0000-000000000001',
    'Marina Quays 3BR',
    'Marina Quays East, Dubai Marina',
    'Dubai Marina',
    'residential',
    'available',
    4800000,
    1850,
    3,
    3,
    'Ready',
    'Emaar Properties',
    280000,
    'AED',
    null,
    now() - interval '5 days'
  );

-- =============================
-- HOLDINGS (5 Properties across Investors)
-- =============================
INSERT INTO public.holdings
  (id, tenant_id, investor_id, listing_id, purchase_price, purchase_date, current_value, monthly_rent, occupancy_rate, annual_expenses, created_at)
VALUES
  -- Investor 1: Marina Penthouse
  (
    'demo-hld-0000-0000-000000000001',
    'demo-0000-0000-0000-000000000001',
    'demo-inv-0000-0000-000000000001',
    'demo-lst-0000-0000-000000000001',
    11800000,
    '2024-03-15',
    12500000,
    85000,
    0.96,
    180000,
    now()
  ),
  -- Investor 1: Downtown Office
  (
    'demo-hld-0000-0000-000000000002',
    'demo-0000-0000-0000-000000000001',
    'demo-inv-0000-0000-000000000001',
    'demo-lst-0000-0000-000000000002',
    17200000,
    '2023-11-20',
    18500000,
    162000,
    1.0,
    285000,
    now()
  ),
  -- Investor 1: Business Bay Retail
  (
    'demo-hld-0000-0000-000000000003',
    'demo-0000-0000-0000-000000000001',
    'demo-inv-0000-0000-000000000001',
    'demo-lst-0000-0000-000000000003',
    7800000,
    '2024-01-10',
    8200000,
    60000,
    0.92,
    95000,
    now()
  ),
  -- Investor 2: JVC Apartment
  (
    'demo-hld-0000-0000-000000000004',
    'demo-0000-0000-0000-000000000001',
    'demo-inv-0000-0000-000000000002',
    'demo-lst-0000-0000-000000000005',
    1650000,
    '2024-06-01',
    1850000,
    12000,
    0.88,
    32000,
    now()
  ),
  -- Investor 1: Bluewaters Unit
  (
    'demo-hld-0000-0000-000000000005',
    'demo-0000-0000-0000-000000000001',
    'demo-inv-0000-0000-000000000001',
    'demo-lst-0000-0000-000000000007',
    4900000,
    '2024-08-15',
    5200000,
    28000,
    0.85,
    72000,
    now()
  );

-- =============================
-- SHORTLISTS
-- =============================
INSERT INTO public.shortlists (id, tenant_id, investor_id, agent_id, created_at) VALUES
  ('demo-shl-0000-0000-000000000001', 'demo-0000-0000-0000-000000000001', 'demo-inv-0000-0000-000000000001', 'demo-user-0000-0000-000000000001', now()),
  ('demo-shl-0000-0000-000000000002', 'demo-0000-0000-0000-000000000001', 'demo-inv-0000-0000-000000000002', 'demo-user-0000-0000-000000000001', now());

INSERT INTO public.shortlist_items (id, tenant_id, shortlist_id, listing_id, match_score, match_explanation, pinned, rank, added_at, added_by) VALUES
  ('demo-sli-001', 'demo-0000-0000-0000-000000000001', 'demo-shl-0000-0000-000000000001', 'demo-lst-0000-0000-000000000004', 94, 'Exceptional fit for Core Plus strategy - prime beachfront location with strong rental yield potential', true, 1, now(), 'demo-user-0000-0000-000000000001'),
  ('demo-sli-002', 'demo-0000-0000-0000-000000000001', 'demo-shl-0000-0000-000000000001', 'demo-lst-0000-0000-000000000008', 86, 'Strong Marina location with competitive entry price', false, 2, now(), 'demo-user-0000-0000-000000000001'),
  ('demo-sli-003', 'demo-0000-0000-0000-000000000001', 'demo-shl-0000-0000-000000000002', 'demo-lst-0000-0000-000000000006', 91, 'Excellent value-add opportunity in emerging area with metro catalyst', true, 1, now(), 'demo-user-0000-0000-000000000001');

-- =============================
-- MEMOS (3 in different states)
-- =============================
INSERT INTO public.memos (id, tenant_id, investor_id, listing_id, state, current_version, created_by, created_at) VALUES
  -- Draft memo for Palm Villa
  ('demo-mem-0000-0000-000000000001', 'demo-0000-0000-0000-000000000001', 'demo-inv-0000-0000-000000000001', 'demo-lst-0000-0000-000000000004', 'draft', 1, 'demo-user-0000-0000-000000000001', now() - interval '3 days'),
  -- Sent memo for Creek Harbour
  ('demo-mem-0000-0000-000000000002', 'demo-0000-0000-0000-000000000001', 'demo-inv-0000-0000-000000000002', 'demo-lst-0000-0000-000000000006', 'sent', 1, 'demo-user-0000-0000-000000000001', now() - interval '7 days'),
  -- Approved memo (historical)
  ('demo-mem-0000-0000-000000000003', 'demo-0000-0000-0000-000000000001', 'demo-inv-0000-0000-000000000001', 'demo-lst-0000-0000-000000000007', 'decided', 1, 'demo-user-0000-0000-000000000001', now() - interval '30 days');

INSERT INTO public.memo_versions (id, memo_id, version, content, created_by, created_at) VALUES
  (
    'demo-memv-001',
    'demo-mem-0000-0000-000000000001',
    1,
    '{
      "title": "Investment Memo - Palm Jumeirah Signature Villa",
      "summary": "Premium beachfront asset with strong capital appreciation potential and lifestyle rental appeal.",
      "recommendation": "PROCEED",
      "keyMetrics": {
        "askingPrice": 42000000,
        "targetCapRate": 5.7,
        "targetIRR": 12.5,
        "holdPeriod": 5
      },
      "keyPoints": [
        "Rare beachfront position on Palm Jumeirah",
        "Recently renovated to highest standards",
        "Strong demand from UHNW tenant pool",
        "Limited comparable supply constrains pricing pressure"
      ],
      "risks": ["High entry price", "Concentration risk in single asset"],
      "mitigations": ["Strong rental demand offsets", "Long-term appreciation in prime Palm locations"]
    }'::jsonb,
    'demo-user-0000-0000-000000000001',
    now() - interval '3 days'
  ),
  (
    'demo-memv-002',
    'demo-mem-0000-0000-000000000002',
    1,
    '{
      "title": "Investment Memo - Dubai Creek Harbour Residence",
      "summary": "Emerging area with significant infrastructure investment and appreciation potential.",
      "recommendation": "PROCEED WITH CAUTION",
      "keyMetrics": {
        "askingPrice": 6800000,
        "targetCapRate": 6.6,
        "targetIRR": 18.2,
        "holdPeriod": 4
      },
      "keyPoints": [
        "Metro connection expected 2026",
        "Below-market pricing vs comparable areas",
        "Developer payment plan available",
        "Strong rental fundamentals"
      ],
      "risks": ["Area still developing", "Construction in surrounding plots"],
      "mitigations": ["Infrastructure investment de-risks", "Emaar track record provides confidence"]
    }'::jsonb,
    'demo-user-0000-0000-000000000001',
    now() - interval '7 days'
  ),
  (
    'demo-memv-003',
    'demo-mem-0000-0000-000000000003',
    1,
    '{
      "title": "Investment Memo - Bluewaters Island 2BR",
      "summary": "Trophy asset in iconic location with strong tourism-driven rental demand.",
      "recommendation": "PROCEED",
      "keyMetrics": {
        "askingPrice": 5200000,
        "targetCapRate": 6.5,
        "targetIRR": 14.8,
        "holdPeriod": 5
      },
      "keyPoints": [
        "Ain Dubai proximity drives premium rents",
        "Hotel-managed rental pool reduces vacancy risk",
        "Furnished unit ready for immediate rental",
        "Limited supply on island supports pricing"
      ],
      "risks": ["Tourism seasonality", "High service charges"],
      "mitigations": ["Diversified tenant base", "Premium positioning justifies charges"]
    }'::jsonb,
    'demo-user-0000-0000-000000000001',
    now() - interval '30 days'
  );

-- Decision for approved memo
INSERT INTO public.decisions (tenant_id, memo_id, investor_id, decision_type, reason_tags, created_at) VALUES
  ('demo-0000-0000-0000-000000000001', 'demo-mem-0000-0000-000000000003', 'demo-inv-0000-0000-000000000001', 'approve', ARRAY['yield_acceptable', 'location_premium', 'tenant_demand'], now() - interval '25 days');

-- =============================
-- TASKS
-- =============================
INSERT INTO public.tasks
  (id, tenant_id, title, description, status, priority, due_date, assignee_id, investor_id, listing_id, created_by, created_at)
VALUES
  (
    'demo-tsk-0000-0000-000000000001',
    'demo-0000-0000-0000-000000000001',
    'Complete snagging list for Palm Villa',
    'Review and resolve 3 minor items identified in inspection report',
    'in-progress',
    'high',
    current_date + interval '7 days',
    'demo-user-0000-0000-000000000001',
    'demo-inv-0000-0000-000000000001',
    'demo-lst-0000-0000-000000000004',
    'demo-user-0000-0000-000000000001',
    now() - interval '5 days'
  ),
  (
    'demo-tsk-0000-0000-000000000002',
    'demo-0000-0000-0000-000000000001',
    'Schedule DLD appointment',
    'Book slot for title transfer at Dubai Land Department',
    'open',
    'high',
    current_date + interval '2 days',
    'demo-user-0000-0000-000000000001',
    'demo-inv-0000-0000-000000000002',
    'demo-lst-0000-0000-000000000006',
    'demo-user-0000-0000-000000000001',
    now() - interval '2 days'
  ),
  (
    'demo-tsk-0000-0000-000000000003',
    'demo-0000-0000-0000-000000000001',
    'Prepare Q4 portfolio report',
    'Compile quarterly performance report for Al-Rashid portfolio',
    'open',
    'medium',
    current_date + interval '10 days',
    'demo-user-0000-0000-000000000001',
    'demo-inv-0000-0000-000000000001',
    null,
    'demo-user-0000-0000-000000000001',
    now() - interval '1 day'
  ),
  (
    'demo-tsk-0000-0000-000000000004',
    'demo-0000-0000-0000-000000000001',
    'Review new Dubai Marina listings',
    'Screen 5 new listings matching Al-Rashid mandate criteria',
    'done',
    'medium',
    null,
    'demo-user-0000-0000-000000000001',
    'demo-inv-0000-0000-000000000001',
    null,
    'demo-user-0000-0000-000000000001',
    now() - interval '10 days'
  ),
  (
    'demo-tsk-0000-0000-000000000005',
    'demo-0000-0000-0000-000000000001',
    'Follow up on Creek Harbour memo',
    'Check if Amira has questions about the investment memo',
    'open',
    'high',
    current_date + interval '1 day',
    'demo-user-0000-0000-000000000001',
    'demo-inv-0000-0000-000000000002',
    'demo-lst-0000-0000-000000000006',
    'demo-user-0000-0000-000000000001',
    now()
  );

-- =============================
-- MARKET SIGNALS (10+ for portfolio areas)
-- =============================
INSERT INTO public.market_signal
  (id, tenant_id, signal_type, area, headline, summary, severity, observed_at, created_at)
VALUES
  (
    'demo-sig-0000-0000-000000000001',
    'demo-0000-0000-0000-000000000001',
    'price_movement',
    'Dubai Marina',
    'Dubai Marina prices up 8.2% YoY',
    'Average transaction prices in Dubai Marina increased 8.2% year-over-year, driven by waterfront property demand.',
    'medium',
    now() - interval '1 day',
    now() - interval '1 day'
  ),
  (
    'demo-sig-0000-0000-000000000002',
    'demo-0000-0000-0000-000000000001',
    'new_supply',
    'Downtown Dubai',
    '3 new towers launching in Downtown',
    'Emaar announces 3 new residential towers with completion in 2027. May impact short-term rental yields.',
    'low',
    now() - interval '2 days',
    now() - interval '2 days'
  ),
  (
    'demo-sig-0000-0000-000000000003',
    'demo-0000-0000-0000-000000000001',
    'price_movement',
    'Palm Jumeirah',
    'Record villa sale at AED 500M',
    'New record set for Palm Jumeirah villa sale, signaling continued ultra-prime demand.',
    'high',
    now() - interval '3 days',
    now() - interval '3 days'
  ),
  (
    'demo-sig-0000-0000-000000000004',
    'demo-0000-0000-0000-000000000001',
    'rental_change',
    'Business Bay',
    'Office rents up 12% in Business Bay',
    'Strong corporate demand drives office rental growth. Vacancy rates at 5-year low.',
    'high',
    now() - interval '4 days',
    now() - interval '4 days'
  ),
  (
    'demo-sig-0000-0000-000000000005',
    'demo-0000-0000-0000-000000000001',
    'infrastructure',
    'JVC',
    'New metro extension announced for JVC',
    'RTA confirms metro extension to JVC with completion by 2028. Expected to boost property values 15-20%.',
    'high',
    now() - interval '5 days',
    now() - interval '5 days'
  ),
  (
    'demo-sig-0000-0000-000000000006',
    'demo-0000-0000-0000-000000000001',
    'development',
    'Dubai Creek Harbour',
    'Dubai Creek Tower on track for 2027',
    'Emaar confirms Dubai Creek Tower construction progressing on schedule for 2027 completion.',
    'low',
    now() - interval '6 days',
    now() - interval '6 days'
  ),
  (
    'demo-sig-0000-0000-000000000007',
    'demo-0000-0000-0000-000000000001',
    'demand_change',
    'Bluewaters Island',
    'Ain Dubai visitors up 40%',
    'Tourist footfall to Bluewaters Island up 40% following new attractions. Strong impact on short-term rentals.',
    'high',
    now() - interval '7 days',
    now() - interval '7 days'
  ),
  (
    'demo-sig-0000-0000-000000000008',
    'demo-0000-0000-0000-000000000001',
    'regulatory',
    'Dubai Marina',
    'New short-term rental regulations',
    'DTCM introduces updated holiday home regulations. May affect rental pool operators.',
    'medium',
    now() - interval '8 days',
    now() - interval '8 days'
  ),
  (
    'demo-sig-0000-0000-000000000009',
    'demo-0000-0000-0000-000000000001',
    'price_movement',
    'Downtown Dubai',
    'Boulevard units premium at 15%',
    'Boulevard-facing units command 15% premium over comparable non-boulevard properties.',
    'medium',
    now() - interval '9 days',
    now() - interval '9 days'
  ),
  (
    'demo-sig-0000-0000-000000000010',
    'demo-0000-0000-0000-000000000001',
    'rental_change',
    'Palm Jumeirah',
    'Villa rents reach new high',
    'Average Palm Jumeirah villa rents now at AED 1.2M annually, up 18% from 2024.',
    'high',
    now() - interval '10 days',
    now() - interval '10 days'
  ),
  (
    'demo-sig-0000-0000-000000000011',
    'demo-0000-0000-0000-000000000001',
    'demand_change',
    'Dubai Marina',
    'European buyer enquiries surge 45%',
    'European buyer interest in Dubai Marina up 45% YoY, driven by tax advantages and lifestyle.',
    'high',
    now() - interval '11 days',
    now() - interval '11 days'
  ),
  (
    'demo-sig-0000-0000-000000000012',
    'demo-0000-0000-0000-000000000001',
    'new_supply',
    'Business Bay',
    'Limited new office supply through 2026',
    'Only 3 new Grade A office projects scheduled for Business Bay through 2026, supporting rental growth.',
    'medium',
    now() - interval '12 days',
    now() - interval '12 days'
  );

-- Map signals to relevant investors
INSERT INTO public.market_signal_target (signal_id, investor_id, relevance_score, relevance_reason)
SELECT 
  s.id,
  'demo-inv-0000-0000-000000000001'::uuid,
  CASE 
    WHEN s.area IN ('Dubai Marina', 'Downtown Dubai', 'Palm Jumeirah', 'Business Bay') THEN 0.9
    ELSE 0.5
  END,
  CASE 
    WHEN s.area IN ('Dubai Marina', 'Downtown Dubai', 'Palm Jumeirah', 'Business Bay') 
    THEN 'Matches preferred areas in investment mandate'
    ELSE 'General market awareness'
  END
FROM public.market_signal s
WHERE s.tenant_id = 'demo-0000-0000-0000-000000000001'::uuid;

INSERT INTO public.market_signal_target (signal_id, investor_id, relevance_score, relevance_reason)
SELECT 
  s.id,
  'demo-inv-0000-0000-000000000002'::uuid,
  CASE 
    WHEN s.area IN ('JVC', 'Dubai Creek Harbour') THEN 0.95
    ELSE 0.4
  END,
  CASE 
    WHEN s.area IN ('JVC', 'Dubai Creek Harbour') 
    THEN 'Matches value-add focus areas'
    ELSE 'General market awareness'
  END
FROM public.market_signal s
WHERE s.tenant_id = 'demo-0000-0000-0000-000000000001'::uuid;

-- =============================
-- AUDIT EVENTS (Sample activity)
-- =============================
INSERT INTO public.audit_events (tenant_id, timestamp, actor_id, actor_role, event_type, object_type, object_id, metadata) VALUES
  ('demo-0000-0000-0000-000000000001', now() - interval '2 hours', 'demo-user-0000-0000-000000000001', 'agent', 'memo.created', 'memo', 'demo-mem-0000-0000-000000000001', '{"investor": "Mohammed Al-Rashid", "listing": "Palm Jumeirah Signature Villa"}'::jsonb),
  ('demo-0000-0000-0000-000000000001', now() - interval '7 days', 'demo-user-0000-0000-000000000001', 'agent', 'memo.sent', 'memo', 'demo-mem-0000-0000-000000000002', '{"investor": "Amira Al-Mansoori", "listing": "Dubai Creek Harbour Residence"}'::jsonb),
  ('demo-0000-0000-0000-000000000001', now() - interval '25 days', 'demo-inv-0000-0000-000000000001', 'investor', 'memo.approved', 'memo', 'demo-mem-0000-0000-000000000003', '{"investor": "Mohammed Al-Rashid", "listing": "Bluewaters Island 2BR"}'::jsonb),
  ('demo-0000-0000-0000-000000000001', now() - interval '1 day', 'demo-user-0000-0000-000000000001', 'agent', 'investor.updated', 'investor', 'demo-inv-0000-0000-000000000001', '{"field": "last_contact"}'::jsonb),
  ('demo-0000-0000-0000-000000000001', now() - interval '5 days', 'demo-user-0000-0000-000000000001', 'agent', 'listing.created', 'listing', 'demo-lst-0000-0000-000000000008', '{"title": "Marina Quays 3BR"}'::jsonb);

COMMIT;

-- Verification query
SELECT 
  'Demo Data Summary' as report,
  (SELECT COUNT(*) FROM tenants WHERE id = 'demo-0000-0000-0000-000000000001') as tenants,
  (SELECT COUNT(*) FROM users WHERE tenant_id = 'demo-0000-0000-0000-000000000001') as users,
  (SELECT COUNT(*) FROM investors WHERE tenant_id = 'demo-0000-0000-0000-000000000001') as investors,
  (SELECT COUNT(*) FROM listings WHERE tenant_id = 'demo-0000-0000-0000-000000000001') as listings,
  (SELECT COUNT(*) FROM holdings WHERE tenant_id = 'demo-0000-0000-0000-000000000001') as holdings,
  (SELECT COUNT(*) FROM memos WHERE tenant_id = 'demo-0000-0000-0000-000000000001') as memos,
  (SELECT COUNT(*) FROM tasks WHERE tenant_id = 'demo-0000-0000-0000-000000000001') as tasks,
  (SELECT COUNT(*) FROM market_signal WHERE tenant_id = 'demo-0000-0000-0000-000000000001') as signals;
