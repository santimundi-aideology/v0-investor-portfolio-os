-- Enhanced Demo Data
-- Adds hot opportunities as real listings with pending approval workflow
-- Run AFTER seed-demo.sql

BEGIN;

-- =============================
-- HOT OPPORTUNITY LISTINGS
-- These match the TypeScript hot-opportunities.ts
-- =============================

-- Hot Opportunity 1: Marina Gate Office (HOT DEAL)
INSERT INTO public.listings
  (id, tenant_id, title, address, area, type, status, price, size, bedrooms, bathrooms, readiness, developer, expected_rent, currency, handover_date, created_at)
VALUES
  (
    'demo-lst-hot-000000000001',
    'demo-0000-0000-0000-000000000001',
    'Marina Gate Tower 2 - Full Floor Office',
    'Marina Gate, Tower 2, Floor 18, Dubai Marina',
    'Dubai Marina',
    'commercial',
    'available',
    4200000,
    3500,
    null,
    null,
    'Ready',
    'Select Group',
    386400,  -- 9.2% yield
    'AED',
    null,
    now() - interval '3 days'
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  price = EXCLUDED.price;

-- Hot Opportunity 2: JVC 8-Unit Block (HIDDEN GEM)
INSERT INTO public.listings
  (id, tenant_id, title, address, area, type, status, price, size, bedrooms, bathrooms, readiness, developer, expected_rent, currency, handover_date, created_at)
VALUES
  (
    'demo-lst-hot-000000000002',
    'demo-0000-0000-0000-000000000001',
    'JVC District 12 - 8-Unit Residential Block',
    'District 12, Plot 45, Jumeirah Village Circle',
    'JVC',
    'residential',
    'available',
    8500000,
    8200,
    8,
    8,
    'Ready',
    'Danube Properties',
    969000,  -- 11.4% yield
    'AED',
    null,
    now() - interval '5 days'
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  price = EXCLUDED.price;

-- Hot Opportunity 3: Business Bay Retail (RISING AREA)
INSERT INTO public.listings
  (id, tenant_id, title, address, area, type, status, price, size, bedrooms, bathrooms, readiness, developer, expected_rent, currency, handover_date, created_at)
VALUES
  (
    'demo-lst-hot-000000000003',
    'demo-0000-0000-0000-000000000001',
    'Business Bay Retail + Mezzanine',
    'Bay Avenue, Retail Unit G-12, Business Bay',
    'Business Bay',
    'commercial',
    'available',
    3100000,
    2100,
    null,
    null,
    'Ready',
    'DAMAC Properties',
    272800,  -- 8.8% yield
    'AED',
    null,
    now() - interval '2 days'
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  price = EXCLUDED.price;

-- Hot Opportunity 4: URGENT - Marina 3BR Below Market
INSERT INTO public.listings
  (id, tenant_id, title, address, area, type, status, price, size, bedrooms, bathrooms, readiness, developer, expected_rent, currency, handover_date, created_at)
VALUES
  (
    'demo-lst-hot-000000000004',
    'demo-0000-0000-0000-000000000001',
    'Marina Pinnacle 3BR - Distressed Sale',
    'Marina Pinnacle Tower, Floor 32, Dubai Marina',
    'Dubai Marina',
    'residential',
    'available',
    2850000,
    1850,
    3,
    4,
    'Ready',
    'HHHR Development',
    228000,  -- 8% yield
    'AED',
    null,
    now() - interval '1 day'
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  price = EXCLUDED.price;

-- =============================
-- ADD HOT OPPORTUNITIES TO SHORTLIST
-- =============================

-- Add to Mohammed Al-Rashid's shortlist
INSERT INTO public.shortlist_items (id, tenant_id, shortlist_id, listing_id, match_score, match_explanation, pinned, rank, added_at, added_by)
VALUES
  (
    'demo-sli-hot-001',
    'demo-0000-0000-0000-000000000001',
    'demo-shl-0000-0000-000000000001',
    'demo-lst-hot-000000000001',
    94,
    '🔥 HOT DEAL: 15% below DLD median with blue-chip tenant locked in for 5 years. Motivated seller - 72hr exclusivity available.',
    true,
    1,
    now() - interval '2 hours',
    'demo-user-0000-0000-000000000001'
  ),
  (
    'demo-sli-hot-002',
    'demo-0000-0000-0000-000000000001',
    'demo-shl-0000-0000-000000000001',
    'demo-lst-hot-000000000004',
    91,
    '⚡ URGENT: Distressed sale at AED 1,540/sqft vs market AED 1,850. Seller needs to close within 2 weeks.',
    true,
    2,
    now() - interval '6 hours',
    'demo-user-0000-0000-000000000001'
  ),
  (
    'demo-sli-hot-003',
    'demo-0000-0000-0000-000000000001',
    'demo-shl-0000-0000-000000000001',
    'demo-lst-hot-000000000003',
    85,
    '📈 Off-market opportunity in rising Business Bay. F&B tenant stable, high footfall location.',
    false,
    3,
    now() - interval '1 day',
    'demo-user-0000-0000-000000000001'
  )
ON CONFLICT (id) DO NOTHING;

-- Add JVC block to Amira's shortlist (Value-Add investor)
INSERT INTO public.shortlist_items (id, tenant_id, shortlist_id, listing_id, match_score, match_explanation, pinned, rank, added_at, added_by)
VALUES
  (
    'demo-sli-hot-004',
    'demo-0000-0000-0000-000000000001',
    'demo-shl-0000-0000-000000000002',
    'demo-lst-hot-000000000002',
    92,
    '💎 HIDDEN GEM: 11.4% yield, 100% occupied. Metro announcement not yet priced in - expect 25% appreciation.',
    true,
    1,
    now() - interval '4 hours',
    'demo-user-0000-0000-000000000001'
  )
ON CONFLICT (id) DO NOTHING;

-- =============================
-- CREATE PENDING APPROVAL MEMO
-- Full IC memo ready for investor decision
-- =============================

INSERT INTO public.memos (id, tenant_id, investor_id, listing_id, state, current_version, created_by, created_at)
VALUES
  (
    'demo-mem-pending-000000001',
    'demo-0000-0000-0000-000000000001',
    'demo-inv-0000-0000-000000000001',
    'demo-lst-hot-000000000001',
    'sent',
    1,
    'demo-user-0000-0000-000000000001',
    now() - interval '6 hours'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.memo_versions (id, memo_id, version, content, created_by, created_at)
VALUES
  (
    'demo-memv-pending-001',
    'demo-mem-pending-000000001',
    1,
    '{
      "title": "URGENT: Marina Gate Full Floor Office - 15% Below Market",
      "summary": "Exceptional opportunity to acquire a full-floor office in Marina Gate with blue-chip tenant at significant discount to market. Seller motivated for quick close due to relocation.",
      "recommendation": "STRONG BUY",
      "keyMetrics": {
        "askingPrice": 4200000,
        "pricePerSqft": 1200,
        "marketPricePerSqft": 1400,
        "discountToMarket": 14.3,
        "currentYield": 9.2,
        "targetIRR": 16.5,
        "holdPeriod": 5,
        "tenantRemaining": "5 years"
      },
      "investmentThesis": "This is a rare opportunity to acquire institutional-grade office space at a 15% discount with income security. The tenant (multinational financial services) has 5 years remaining on lease with 5% annual escalation. No capex required - move-in ready.",
      "keyPoints": [
        "15% below DLD median price (AED 1,200/sqft vs market AED 1,400)",
        "Blue-chip tenant locked in for 5 more years",
        "9.2% day-one yield with built-in 5% annual escalation",
        "Full floor = maximum flexibility for future repositioning",
        "Seller accepted 10% price cut - motivated for 30-day close"
      ],
      "marketContext": {
        "recentComps": [
          "Marina Gate T1 Floor 15: AED 5.8M (AED 1,380/sqft) - Mar 2025",
          "Marina Gate T2 Floor 22: AED 6.2M (AED 1,420/sqft) - Dec 2024",
          "Marina Plaza Full Floor: AED 4.9M (AED 1,350/sqft) - Jan 2025"
        ],
        "areaYield": "Average Marina office yield: 7.8%",
        "vacancyRate": "Marina office vacancy: 8.2% (down from 12% in 2023)"
      },
      "financialAnalysis": {
        "purchasePrice": 4200000,
        "acquisitionCosts": 168000,
        "totalInvestment": 4368000,
        "year1NOI": 386400,
        "year5NOI": 470000,
        "exitPrice": 5800000,
        "totalReturn": 3700000,
        "equityMultiple": "1.85x"
      },
      "risks": [
        "Tenant default risk (mitigated by multinational credit)",
        "Marina office oversupply post-2027",
        "Interest rate impact on exit cap rate"
      ],
      "mitigations": [
        "Tenant is AA-rated multinational with Dubai regional HQ",
        "Limited new Grade A supply in Marina through 2027",
        "Strong equity cushion from discounted entry price"
      ],
      "nextSteps": [
        "Confirm 72-hour exclusivity with seller",
        "Complete legal due diligence on lease assignment",
        "Arrange property inspection this week",
        "Prepare transfer documentation for DLD"
      ],
      "timeline": "Target close: 30 days from IC approval"
    }'::jsonb,
    'demo-user-0000-0000-000000000001',
    now() - interval '6 hours'
  )
ON CONFLICT (id) DO NOTHING;

-- =============================
-- DEMO NOTIFICATIONS
-- For real-time alert demo
-- =============================

INSERT INTO public.notifications (id, tenant_id, recipient_user_id, entity_type, entity_id, title, body, notification_key, metadata, created_at)
VALUES
  (
    'demo-notif-000000000001',
    'demo-0000-0000-0000-000000000001',
    'demo-user-0000-0000-000000000001',
    'listing',
    'demo-lst-hot-000000000001',
    '🔥 Hot Deal Alert: Marina Office 15% Below Market',
    'New opportunity matches Al-Rashid mandate: Marina Gate Full Floor at AED 4.2M (15% below DLD median)',
    'demo-notif-001',
    '{"urgency": "high", "score": 94, "type": "opportunity"}'::jsonb,
    now() - interval '2 hours'
  ),
  (
    'demo-notif-000000000002',
    'demo-0000-0000-0000-000000000001',
    'demo-user-0000-0000-000000000001',
    'listing',
    'demo-lst-hot-000000000004',
    '⚡ Price Drop: Marina Pinnacle Distressed Sale',
    'Urgent: Seller dropped price 10% - now at AED 2.85M. 2-week close required.',
    'demo-notif-002',
    '{"urgency": "urgent", "score": 91, "type": "price_drop"}'::jsonb,
    now() - interval '6 hours'
  ),
  (
    'demo-notif-000000000003',
    'demo-0000-0000-0000-000000000001',
    'demo-user-0000-0000-000000000001',
    'market_signal',
    'demo-sig-0000-0000-000000000001',
    '📊 Market Intel: Dubai Marina Prices +8.2% YoY',
    'Q4 DLD data confirms Dubai Marina appreciation. Your portfolio exposure: 2 properties.',
    'demo-notif-003',
    '{"urgency": "medium", "type": "market_signal"}'::jsonb,
    now() - interval '1 day'
  ),
  (
    'demo-notif-000000000004',
    'demo-0000-0000-0000-000000000001',
    'demo-user-0000-0000-000000000001',
    'memo',
    'demo-mem-pending-000000001',
    '📝 IC Memo Pending: Marina Gate Office',
    'Investment memo sent to Mohammed Al-Rashid 6 hours ago. Awaiting decision.',
    'demo-notif-004',
    '{"urgency": "high", "type": "memo_pending"}'::jsonb,
    now() - interval '4 hours'
  )
ON CONFLICT (notification_key) DO NOTHING;

-- =============================
-- ADDITIONAL MARKET SIGNALS
-- Urgent signals for demo alerts
-- =============================

INSERT INTO public.market_signal
  (id, tenant_id, signal_type, area, headline, summary, severity, observed_at, created_at)
VALUES
  (
    'demo-sig-urgent-0000000001',
    'demo-0000-0000-0000-000000000001',
    'price_drop',
    'Dubai Marina',
    'Motivated Seller: Marina Pinnacle -10%',
    'Distressed sale opportunity in Marina Pinnacle. Owner needs quick exit - reduced from AED 3.15M to AED 2.85M.',
    'high',
    now() - interval '6 hours',
    now() - interval '6 hours'
  ),
  (
    'demo-sig-urgent-0000000002',
    'demo-0000-0000-0000-000000000001',
    'yield_opportunity',
    'Dubai Marina',
    'Marina Gate: 9.2% yield with tenant',
    'Full floor office opportunity with 9.2% yield vs market average 7.8%. 15% below comparable sales.',
    'high',
    now() - interval '3 hours',
    now() - interval '3 hours'
  ),
  (
    'demo-sig-urgent-0000000003',
    'demo-0000-0000-0000-000000000001',
    'infrastructure',
    'JVC',
    'BREAKING: RTA Confirms JVC Metro Station',
    'Blue Line metro station confirmed for JVC District 12. Completion Q3 2027. Expect 20-25% price appreciation in 800m radius.',
    'high',
    now() - interval '1 day',
    now() - interval '1 day'
  )
ON CONFLICT (id) DO UPDATE SET
  headline = EXCLUDED.headline,
  summary = EXCLUDED.summary;

-- Map urgent signals to investors
INSERT INTO public.market_signal_target (signal_id, investor_id, relevance_score, relevance_reason, tenant_id, status)
VALUES
  ('demo-sig-urgent-0000000001', 'demo-inv-0000-0000-000000000001', 0.95, 'Matches Dubai Marina preference - urgent price drop', 'demo-0000-0000-0000-000000000001', 'new'),
  ('demo-sig-urgent-0000000002', 'demo-inv-0000-0000-000000000001', 0.98, 'Perfect mandate match: Marina + High Yield + Commercial', 'demo-0000-0000-0000-000000000001', 'new'),
  ('demo-sig-urgent-0000000003', 'demo-inv-0000-0000-000000000002', 0.99, 'JVC infrastructure catalyst - matches Value-Add strategy', 'demo-0000-0000-0000-000000000001', 'new')
ON CONFLICT DO NOTHING;

COMMIT;

-- Verification
SELECT 
  'Enhanced Demo Summary' as report,
  (SELECT COUNT(*) FROM listings WHERE id LIKE 'demo-lst-hot%') as hot_listings,
  (SELECT COUNT(*) FROM shortlist_items WHERE id LIKE 'demo-sli-hot%') as hot_shortlist_items,
  (SELECT COUNT(*) FROM memos WHERE id LIKE 'demo-mem-pending%') as pending_memos,
  (SELECT COUNT(*) FROM notifications WHERE id LIKE 'demo-notif%') as demo_notifications,
  (SELECT COUNT(*) FROM market_signal WHERE id LIKE 'demo-sig-urgent%') as urgent_signals;
