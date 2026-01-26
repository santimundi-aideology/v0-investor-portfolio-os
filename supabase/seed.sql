-- Seed data for Vantage
-- Comprehensive dataset for development and testing
-- Last updated: 2025-01-25
-- 
-- This seed populates the database with:
-- - 3 tenants (organizations)
-- - 9 users (agents, managers, admins)
-- - 12 investors with investment mandates
-- - 25 property listings
-- - 15 holdings (owned properties)
-- - 20 tasks
-- - 8 shortlists with 28 items
-- - 10 memos
-- - 20 audit events

begin;

-- Clear existing seed data
truncate table public.tasks cascade;
truncate table public.decisions cascade;
truncate table public.messages cascade;
truncate table public.memo_versions cascade;
truncate table public.memos cascade;
truncate table public.trust_records cascade;
truncate table public.underwriting_comps cascade;
truncate table public.underwritings cascade;
truncate table public.shortlist_items cascade;
truncate table public.shortlists cascade;
truncate table public.holdings cascade;
truncate table public.mandates cascade;
truncate table public.listings cascade;
truncate table public.investors cascade;
truncate table public.audit_events cascade;
truncate table public.notifications cascade;
truncate table public.market_signal_target cascade;
truncate table public.market_signal cascade;
truncate table public.portal_listing_snapshot cascade;
truncate table public.market_metric_snapshot cascade;
truncate table public.raw_portal_listings cascade;
truncate table public.raw_ejari_contracts cascade;
truncate table public.raw_dld_transactions cascade;
truncate table public.users cascade;
truncate table public.tenants cascade;

-- =============================
-- TENANTS (3 Organizations)
-- =============================
insert into public.tenants (id, name, created_at) values
  ('11111111-1111-1111-1111-111111111111', 'Palm & Partners Realty', now() - interval '2 years'),
  ('22222222-2222-2222-2222-222222222222', 'Marina Capital Advisors', now() - interval '18 months'),
  ('33333333-3333-3333-3333-333333333333', 'Emirates Property Group', now() - interval '1 year');

-- =============================
-- USERS (9 Team Members)
-- =============================
insert into public.users (id, tenant_id, name, email, role, created_at) values
  -- Palm & Partners team (Tenant 1) - 5 users
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Sarah Al-Rashid', 'sarah@palmpartners.ae', 'agent', now() - interval '2 years'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Ahmed Malik', 'ahmed@palmpartners.ae', 'manager', now() - interval '2 years'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'Omar Hassan', 'omar@palmpartners.ae', 'agent', now() - interval '18 months'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', 'Nadia Khalil', 'nadia@palmpartners.ae', 'agent', now() - interval '1 year'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', 'Yusuf Rahman', 'yusuf@palmpartners.ae', 'super_admin', now() - interval '2 years'),
  -- Marina Capital team (Tenant 2) - 2 users
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', '22222222-2222-2222-2222-222222222222', 'Layla Hussain', 'layla@marinacapital.ae', 'agent', now() - interval '18 months'),
  ('11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'Kareem Nasser', 'kareem@marinacapital.ae', 'manager', now() - interval '18 months'),
  -- Emirates Property team (Tenant 3) - 2 users
  ('22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'Hana Qasim', 'hana@emiratespg.ae', 'agent', now() - interval '1 year'),
  ('33333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'Tariq Mahmoud', 'tariq@emiratespg.ae', 'manager', now() - interval '1 year');

-- =============================
-- INVESTORS (12 total)
-- =============================
insert into public.investors 
  (id, tenant_id, name, company, email, phone, status, mandate, created_at, last_contact, total_deals, assigned_agent_id, avatar)
values
  -- Palm & Partners Investors (8)
  ('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Mohammed Al-Fayed', 'Al-Fayed Investments', 'm.alfayed@investments.ae', '+971 50 123 4567', 'active', '{"strategy": "Core Plus", "investmentHorizon": "5-7 years", "yieldTarget": "8-12%", "riskTolerance": "medium", "preferredAreas": ["Downtown Dubai", "Dubai Marina", "Business Bay"], "propertyTypes": ["commercial", "mixed-use"], "minInvestment": 5000000, "maxInvestment": 25000000}'::jsonb, now() - interval '14 months', now() - interval '2 days', 5, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
  ('a2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Fatima Hassan', 'Hassan Family Office', 'fatima@hassanfo.com', '+971 55 987 6543', 'active', '{"strategy": "Value Add", "investmentHorizon": "3-5 years", "yieldTarget": "15-20%", "riskTolerance": "high", "preferredAreas": ["JVC", "Dubai South", "Al Quoz", "Dubai Hills"], "propertyTypes": ["residential", "land"], "minInvestment": 2000000, "maxInvestment": 10000000}'::jsonb, now() - interval '12 months', now() - interval '4 days', 3, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
  ('a3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Ahmed Khalil', 'Khalil Capital', 'ahmed@khalilcapital.ae', '+971 52 555 1234', 'pending', '{"strategy": "Core", "investmentHorizon": "7-10 years", "yieldTarget": "6-8%", "riskTolerance": "low", "preferredAreas": ["Palm Jumeirah", "Emirates Hills", "Dubai Marina"], "propertyTypes": ["residential"], "minInvestment": 10000000, "maxInvestment": 50000000}'::jsonb, now() - interval '2 months', now() - interval '7 days', 0, 'cccccccc-cccc-cccc-cccc-cccccccccccc', null),
  ('a4444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Layla Mansour', 'Mansour Holdings', 'layla@mansourholdings.ae', '+971 54 777 8899', 'active', '{"strategy": "Opportunistic", "investmentHorizon": "2-3 years", "yieldTarget": "20%+", "riskTolerance": "high", "preferredAreas": ["Dubai Creek Harbour", "MBR City", "Dubai South"], "propertyTypes": ["land", "mixed-use"], "minInvestment": 15000000, "maxInvestment": 100000000}'::jsonb, now() - interval '9 months', now(), 4, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
  ('a5555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Rashid Al-Maktoum', 'Maktoum Investments LLC', 'rashid@maktouminv.ae', '+971 50 888 9999', 'active', '{"strategy": "Core Plus", "investmentHorizon": "5-7 years", "yieldTarget": "10-14%", "riskTolerance": "medium", "preferredAreas": ["DIFC", "Downtown Dubai", "Business Bay"], "propertyTypes": ["commercial"], "minInvestment": 20000000, "maxInvestment": 80000000}'::jsonb, now() - interval '16 months', now() - interval '1 day', 7, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', null),
  ('a6666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 'Sara Al-Thani', 'Al-Thani Family Trust', 'sara@althanitrust.com', '+971 55 444 5555', 'active', '{"strategy": "Core", "investmentHorizon": "10+ years", "yieldTarget": "5-7%", "riskTolerance": "low", "preferredAreas": ["Palm Jumeirah", "Emirates Hills", "Jumeirah Bay Island"], "propertyTypes": ["residential"], "minInvestment": 30000000, "maxInvestment": 150000000}'::jsonb, now() - interval '20 months', now() - interval '3 days', 2, 'dddddddd-dddd-dddd-dddd-dddddddddddd', null),
  ('a7777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', 'Khalid Ibrahim', 'Ibrahim Brothers Trading', 'khalid@ibrahimbrothers.ae', '+971 52 333 4444', 'active', '{"strategy": "Value Add", "investmentHorizon": "3-5 years", "yieldTarget": "12-18%", "riskTolerance": "medium", "preferredAreas": ["Al Quoz", "Jebel Ali", "Dubai Investment Park"], "propertyTypes": ["commercial", "land"], "minInvestment": 5000000, "maxInvestment": 30000000}'::jsonb, now() - interval '8 months', now() - interval '5 days', 2, 'cccccccc-cccc-cccc-cccc-cccccccccccc', null),
  ('a8888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', 'Mariam Al-Hashimi', 'Al-Hashimi Ventures', 'mariam@alhashimiventures.ae', '+971 56 777 8888', 'inactive', '{"strategy": "Opportunistic", "investmentHorizon": "1-2 years", "yieldTarget": "25%+", "riskTolerance": "high", "preferredAreas": ["Dubai South", "Expo City"], "propertyTypes": ["land"], "minInvestment": 10000000, "maxInvestment": 50000000}'::jsonb, now() - interval '6 months', now() - interval '45 days', 1, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
  -- Marina Capital Investors (2)
  ('a9999999-9999-9999-9999-999999999999', '22222222-2222-2222-2222-222222222222', 'Abdullah Al-Suwaidi', 'Suwaidi Capital', 'abdullah@suwaidicapital.ae', '+971 50 111 2222', 'active', '{"strategy": "Core Plus", "investmentHorizon": "5-7 years", "yieldTarget": "9-13%", "riskTolerance": "medium", "preferredAreas": ["Dubai Marina", "JBR", "Palm Jumeirah"], "propertyTypes": ["residential", "mixed-use"], "minInvestment": 8000000, "maxInvestment": 40000000}'::jsonb, now() - interval '15 months', now() - interval '6 days', 3, 'ffffffff-ffff-ffff-ffff-ffffffffffff', null),
  ('b1111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Noura Al-Ketbi', 'Ketbi Holdings', 'noura@ketbiholdings.ae', '+971 55 999 0000', 'active', '{"strategy": "Value Add", "investmentHorizon": "4-6 years", "yieldTarget": "14-18%", "riskTolerance": "medium", "preferredAreas": ["Business Bay", "JLT", "Dubai Hills"], "propertyTypes": ["commercial", "residential"], "minInvestment": 3000000, "maxInvestment": 15000000}'::jsonb, now() - interval '10 months', now() - interval '2 days', 2, 'ffffffff-ffff-ffff-ffff-ffffffffffff', null),
  -- Emirates Property Investors (2)
  ('b2222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'Hamad Al-Nuaimi', 'Nuaimi Real Estate', 'hamad@nuaimire.ae', '+971 50 222 3333', 'active', '{"strategy": "Core", "investmentHorizon": "7-10 years", "yieldTarget": "7-9%", "riskTolerance": "low", "preferredAreas": ["Downtown Dubai", "DIFC", "City Walk"], "propertyTypes": ["commercial", "mixed-use"], "minInvestment": 15000000, "maxInvestment": 60000000}'::jsonb, now() - interval '11 months', now() - interval '8 days', 1, '22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null),
  ('b3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'Aisha Al-Shamsi', 'Shamsi Family Office', 'aisha@shamsifamily.ae', '+971 56 444 5555', 'pending', '{"strategy": "Core Plus", "investmentHorizon": "5-8 years", "yieldTarget": "10-14%", "riskTolerance": "medium", "preferredAreas": ["Dubai Hills", "Arabian Ranches", "Tilal Al Ghaf"], "propertyTypes": ["residential"], "minInvestment": 4000000, "maxInvestment": 20000000}'::jsonb, now() - interval '3 months', now() - interval '10 days', 0, '22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null);

-- =============================
-- LISTINGS (25 Properties)
-- =============================
insert into public.listings
  (id, tenant_id, title, address, area, type, status, price, size, bedrooms, bathrooms, readiness, developer, expected_rent, currency, handover_date, created_at)
values
  -- Palm & Partners Listings (18)
  ('c1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Marina Tower Office Suite', 'Marina Tower, Floor 25, Dubai Marina', 'Dubai Marina', 'commercial', 'available', 8500000, 2500, null, null, 'Ready', 'Emaar Properties', 765000, 'AED', null, now() - interval '2 months'),
  ('c2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Downtown Boulevard Retail', 'Boulevard Plaza, Downtown Dubai', 'Downtown Dubai', 'commercial', 'available', 12000000, 3200, null, null, 'Ready', 'Emaar Properties', 1320000, 'AED', null, now() - interval '3 months'),
  ('c3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'JVC Villa Compound', 'District 12, Jumeirah Village Circle', 'JVC', 'residential', 'available', 4500000, 4800, 4, 5, 'Ready', 'Nakheel', 351000, 'AED', null, now() - interval '1 month'),
  ('c4444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Business Bay Mixed-Use Tower', 'Executive Towers, Business Bay', 'Business Bay', 'mixed-use', 'under-offer', 45000000, 15000, null, null, 'Ready', 'DAMAC', 4500000, 'AED', null, now() - interval '4 months'),
  ('c5555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Dubai South Land Plot', 'Residential District, Dubai South', 'Dubai South', 'land', 'available', 18000000, 50000, null, null, null, null, null, 'AED', null, now() - interval '5 months'),
  ('c6666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 'Palm Jumeirah Signature Villa', 'Frond K, Palm Jumeirah', 'Palm Jumeirah', 'residential', 'available', 85000000, 15000, 7, 8, 'Ready', 'Nakheel', 4200000, 'AED', null, now() - interval '6 months'),
  ('c7777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', 'DIFC Office Floor', 'Gate Building, DIFC', 'DIFC', 'commercial', 'available', 65000000, 18000, null, null, 'Ready', 'DIFC Authority', 7800000, 'AED', null, now() - interval '3 months'),
  ('c8888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', 'Dubai Hills Villa', 'Maple 2, Dubai Hills Estate', 'Dubai Hills', 'residential', 'available', 12500000, 6500, 5, 6, 'Ready', 'Emaar Properties', 720000, 'AED', null, now() - interval '2 months'),
  ('c9999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', 'Creek Harbour Apartment', 'Creek Rise Tower 2, Dubai Creek Harbour', 'Dubai Creek Harbour', 'residential', 'available', 3800000, 1850, 2, 3, 'Ready', 'Emaar Properties', 195000, 'AED', null, now() - interval '1 month'),
  ('d1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Al Quoz Warehouse', 'Al Quoz Industrial Area 3', 'Al Quoz', 'commercial', 'available', 15000000, 25000, null, null, 'Ready', null, 1200000, 'AED', null, now() - interval '4 months'),
  ('d2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'JBR Beachfront Penthouse', 'Murjan Tower 4, JBR', 'JBR', 'residential', 'under-offer', 28000000, 5500, 4, 5, 'Ready', 'Dubai Properties', 1680000, 'AED', null, now() - interval '5 months'),
  ('d3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'MBR City Development Plot', 'District One, MBR City', 'MBR City', 'land', 'available', 42000000, 35000, null, null, null, 'Meydan', null, 'AED', null, now() - interval '6 months'),
  ('d4444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Emirates Hills Mansion', 'Sector E, Emirates Hills', 'Emirates Hills', 'residential', 'available', 120000000, 25000, 9, 10, 'Ready', null, 5500000, 'AED', null, now() - interval '7 months'),
  ('d5555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Business Bay Office Tower', 'Opus Tower, Business Bay', 'Business Bay', 'commercial', 'available', 22000000, 8500, null, null, 'Ready', 'Omniyat', 2420000, 'AED', null, now() - interval '2 months'),
  ('d6666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 'Dubai South Logistics Hub', 'Logistics District, Dubai South', 'Dubai South', 'commercial', 'available', 35000000, 45000, null, null, 'Off-Plan', 'Dubai South', 2800000, 'AED', '2026-06-30', now() - interval '3 months'),
  ('d7777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', 'City Walk Retail Unit', 'City Walk Phase 2', 'City Walk', 'commercial', 'available', 18500000, 4200, null, null, 'Ready', 'Meraas', 2035000, 'AED', null, now() - interval '4 months'),
  ('d8888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', 'Tilal Al Ghaf Villa', 'Serenity District, Tilal Al Ghaf', 'Tilal Al Ghaf', 'residential', 'available', 8500000, 5800, 5, 6, 'Off-Plan', 'Majid Al Futtaim', 510000, 'AED', '2025-12-31', now() - interval '2 months'),
  ('d9999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', 'Arabian Ranches Villa', 'Savannah 2, Arabian Ranches', 'Arabian Ranches', 'residential', 'sold', 6200000, 4200, 4, 5, 'Ready', 'Emaar Properties', 372000, 'AED', null, now() - interval '8 months'),
  -- Marina Capital Listings (4)
  ('e1111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Marina Promenade Apartment', 'Shemara Tower, Dubai Marina', 'Dubai Marina', 'residential', 'available', 5500000, 2200, 3, 4, 'Ready', 'Emaar Properties', 330000, 'AED', null, now() - interval '3 months'),
  ('e2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'JLT Office Space', 'Lake View Tower, JLT', 'JLT', 'commercial', 'available', 4800000, 1800, null, null, 'Ready', 'DMCC', 432000, 'AED', null, now() - interval '4 months'),
  ('e3333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'Palm Garden Homes Villa', 'Palm Jumeirah', 'Palm Jumeirah', 'residential', 'under-offer', 32000000, 8500, 5, 6, 'Ready', 'Nakheel', 1920000, 'AED', null, now() - interval '5 months'),
  ('e4444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'Business Bay Tower Unit', 'Churchill Towers, Business Bay', 'Business Bay', 'commercial', 'available', 7200000, 2800, null, null, 'Ready', 'EZW', 720000, 'AED', null, now() - interval '2 months'),
  -- Emirates Property Listings (3)
  ('e5555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333', 'Downtown Residences', 'Act One Act Two, Downtown Dubai', 'Downtown Dubai', 'residential', 'available', 9800000, 3200, 3, 4, 'Ready', 'Emaar Properties', 588000, 'AED', null, now() - interval '3 months'),
  ('e6666666-6666-6666-6666-666666666666', '33333333-3333-3333-3333-333333333333', 'DIFC Retail Space', 'Gate Village 3, DIFC', 'DIFC', 'commercial', 'available', 25000000, 5500, null, null, 'Ready', 'DIFC Authority', 3000000, 'AED', null, now() - interval '4 months'),
  ('e7777777-7777-7777-7777-777777777777', '33333333-3333-3333-3333-333333333333', 'Dubai Hills Townhouse', 'Park Heights, Dubai Hills', 'Dubai Hills', 'residential', 'available', 4200000, 2800, 3, 4, 'Ready', 'Emaar Properties', 252000, 'AED', null, now() - interval '2 months');

-- =============================
-- HOLDINGS (15 Properties owned by investors)
-- =============================
insert into public.holdings
  (id, tenant_id, investor_id, listing_id, purchase_price, purchase_date, current_value, monthly_rent, occupancy_rate, annual_expenses, created_at)
values
  -- Mohammed Al-Fayed holdings (3)
  ('f1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 8200000, '2024-03-15', 8500000, 63750, 0.95, 45000, now()),
  ('f2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'c2222222-2222-2222-2222-222222222222', 11500000, '2023-11-01', 12000000, 110000, 1.0, 72000, now()),
  ('f3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'c7777777-7777-7777-7777-777777777777', 62000000, '2023-06-15', 65000000, 650000, 0.92, 420000, now()),
  -- Fatima Hassan holdings (2)
  ('f4444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'a2222222-2222-2222-2222-222222222222', 'c3333333-3333-3333-3333-333333333333', 4200000, '2024-06-01', 4500000, 29250, 0.88, 36000, now()),
  ('f5555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'a2222222-2222-2222-2222-222222222222', 'c8888888-8888-8888-8888-888888888888', 11800000, '2024-01-20', 12500000, 60000, 1.0, 48000, now()),
  -- Layla Mansour holdings (2)
  ('f6666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 'a4444444-4444-4444-4444-444444444444', 'd3333333-3333-3333-3333-333333333333', 38000000, '2023-09-01', 42000000, 0, 0, 180000, now()),
  ('f7777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', 'a4444444-4444-4444-4444-444444444444', 'c9999999-9999-9999-9999-999999999999', 3500000, '2024-08-15', 3800000, 16250, 1.0, 24000, now()),
  -- Rashid Al-Maktoum holdings (3)
  ('f8888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', 'a5555555-5555-5555-5555-555555555555', 'd5555555-5555-5555-5555-555555555555', 20500000, '2024-02-01', 22000000, 201666, 0.98, 156000, now()),
  ('f9999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', 'a5555555-5555-5555-5555-555555555555', 'd7777777-7777-7777-7777-777777777777', 17500000, '2023-07-15', 18500000, 169583, 1.0, 96000, now()),
  ('fa111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'a5555555-5555-5555-5555-555555555555', 'd1111111-1111-1111-1111-111111111111', 13500000, '2023-04-01', 15000000, 100000, 1.0, 60000, now()),
  -- Sara Al-Thani holdings (1)
  ('fa222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'a6666666-6666-6666-6666-666666666666', 'c6666666-6666-6666-6666-666666666666', 78000000, '2022-12-01', 85000000, 350000, 0.85, 360000, now()),
  -- Khalid Ibrahim holdings (1)
  ('fa333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'a7777777-7777-7777-7777-777777777777', 'd1111111-1111-1111-1111-111111111111', 14200000, '2024-05-01', 15000000, 100000, 0.95, 72000, now()),
  -- Marina Capital Holdings (2)
  ('fa444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'a9999999-9999-9999-9999-999999999999', 'e1111111-1111-1111-1111-111111111111', 5200000, '2024-04-01', 5500000, 27500, 1.0, 36000, now()),
  ('fa555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', 'b1111111-1111-1111-1111-111111111111', 'e2222222-2222-2222-2222-222222222222', 4500000, '2024-07-01', 4800000, 36000, 0.92, 28000, now()),
  -- Emirates Property Holdings (1)
  ('fa666666-6666-6666-6666-666666666666', '33333333-3333-3333-3333-333333333333', 'b2222222-2222-2222-2222-222222222222', 'e5555555-5555-5555-5555-555555555555', 9200000, '2024-03-15', 9800000, 49000, 1.0, 48000, now());

commit;

-- =============================
-- ADDITIONAL DATA
-- =============================
-- Run seed-part2.sql for tasks, shortlists, memos
-- Run seed-part3.sql for market signals, audit events
