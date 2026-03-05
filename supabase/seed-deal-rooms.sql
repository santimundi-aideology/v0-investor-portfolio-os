-- =============================
-- DEAL ROOMS SEED (Dynamic)
-- Works for any tenant: finds the first tenant in the DB and seeds
-- realistic deal room pipeline data linked to existing investors & listings.
-- Run: psql $DATABASE_URL -f supabase/seed-deal-rooms.sql
-- =============================

BEGIN;

DO $$
DECLARE
  v_tenant_id   uuid;
  v_investor_1  uuid;
  v_investor_2  uuid;
  v_listing_1   uuid;
  v_listing_2   uuid;
  v_listing_3   uuid;
  v_listing_4   uuid;
BEGIN

  -- Resolve tenant: prefer DEMO_TENANT_ID env var, otherwise pick first tenant
  v_tenant_id := COALESCE(
    (SELECT id FROM public.tenants WHERE id::text = current_setting('app.demo_tenant_id', true) LIMIT 1),
    (SELECT id FROM public.tenants ORDER BY created_at LIMIT 1)
  );

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No tenant found. Run migrations + a tenant seed first.';
  END IF;

  -- Pick first two investors for this tenant
  SELECT id INTO v_investor_1
    FROM public.investors
   WHERE tenant_id = v_tenant_id AND status = 'active'
   ORDER BY created_at LIMIT 1;

  SELECT id INTO v_investor_2
    FROM public.investors
   WHERE tenant_id = v_tenant_id AND status = 'active'
   ORDER BY created_at OFFSET 1 LIMIT 1;

  -- Fall back: pick any investor if < 2 active
  IF v_investor_2 IS NULL THEN
    v_investor_2 := v_investor_1;
  END IF;

  -- Pick up to 4 listings for this tenant (any status)
  SELECT id INTO v_listing_1 FROM public.listings WHERE tenant_id = v_tenant_id ORDER BY created_at LIMIT 1;
  SELECT id INTO v_listing_2 FROM public.listings WHERE tenant_id = v_tenant_id ORDER BY created_at OFFSET 1 LIMIT 1;
  SELECT id INTO v_listing_3 FROM public.listings WHERE tenant_id = v_tenant_id ORDER BY created_at OFFSET 2 LIMIT 1;
  SELECT id INTO v_listing_4 FROM public.listings WHERE tenant_id = v_tenant_id ORDER BY created_at OFFSET 3 LIMIT 1;

  -- Use listing_1 as fallback if not enough listings
  v_listing_2 := COALESCE(v_listing_2, v_listing_1);
  v_listing_3 := COALESCE(v_listing_3, v_listing_1);
  v_listing_4 := COALESCE(v_listing_4, v_listing_1);

  -- ── Remove any old dynamic seed deal rooms for this tenant ─────────────────
  DELETE FROM public.deal_rooms
   WHERE tenant_id = v_tenant_id
     AND title LIKE '[SEED]%';

  -- ── Insert 4 demo deals, one per stage ─────────────────────────────────────
  INSERT INTO public.deal_rooms
    (tenant_id, title, property_id, investor_id,
     investor_name, property_title,
     status, ticket_size_aed, probability, priority,
     next_step, summary, created_at, updated_at)
  VALUES
    -- 1. Preparation stage
    (
      v_tenant_id,
      '[SEED] Marina Penthouse — Mandate Review',
      v_listing_1,
      v_investor_1,
      (SELECT name FROM public.investors WHERE id = v_investor_1),
      (SELECT COALESCE(title, 'Untitled Listing') FROM public.listings WHERE id = v_listing_1),
      'preparation',
      8500000,
      30,
      'high',
      'Complete property underwriting and align on offer price',
      'Core-plus residential asset in a sought-after waterfront location. Investor reviewing full underwriting package.',
      now() - interval '12 days',
      now() - interval '2 days'
    ),
    -- 2. Due-diligence stage
    (
      v_tenant_id,
      '[SEED] Downtown Office Tower — Diligence',
      v_listing_2,
      v_investor_1,
      (SELECT name FROM public.investors WHERE id = v_investor_1),
      (SELECT COALESCE(title, 'Untitled Listing') FROM public.listings WHERE id = v_listing_2),
      'due-diligence',
      18500000,
      55,
      'high',
      'Obtain NOC from developer and sign inspection report',
      'Grade-A commercial asset. Title deed, RERA registration, and NOC outstanding. Legal team on standby.',
      now() - interval '30 days',
      now() - interval '1 day'
    ),
    -- 3. Negotiation stage
    (
      v_tenant_id,
      '[SEED] JVC Residential Block — LOI Terms',
      v_listing_3,
      v_investor_2,
      (SELECT name FROM public.investors WHERE id = v_investor_2),
      (SELECT COALESCE(title, 'Untitled Listing') FROM public.listings WHERE id = v_listing_3),
      'negotiation',
      6200000,
      70,
      'medium',
      'Counter-sign LOI and agree payment plan structure',
      'Value-add block with repositioning upside. Both parties aligned on price; negotiating payment milestone schedule.',
      now() - interval '45 days',
      now() - interval '3 days'
    ),
    -- 4. Closing stage
    (
      v_tenant_id,
      '[SEED] Business Bay Retail Unit — MOU to Transfer',
      v_listing_4,
      v_investor_2,
      (SELECT name FROM public.investors WHERE id = v_investor_2),
      (SELECT COALESCE(title, 'Untitled Listing') FROM public.listings WHERE id = v_listing_4),
      'closing',
      3100000,
      90,
      'urgent',
      'Register MOU with Dubai Land Department and transfer balance payment',
      'Retail unit with existing anchor tenant. MOU signed; awaiting final DLD registration and NOC.',
      now() - interval '60 days',
      now() - interval '6 hours'
    );

  RAISE NOTICE 'Seeded 4 deal rooms for tenant %', v_tenant_id;

END $$;

COMMIT;

-- Summary
SELECT
  status,
  COUNT(*)           AS deals,
  SUM(ticket_size_aed)::bigint AS total_aed
FROM public.deal_rooms
WHERE title LIKE '[SEED]%'
GROUP BY status
ORDER BY status;
