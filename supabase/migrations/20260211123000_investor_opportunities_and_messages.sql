-- Opportunity lifecycle types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'opportunity_status') THEN
    CREATE TYPE public.opportunity_status AS ENUM (
      'recommended',
      'shortlisted',
      'memo_review',
      'deal_room',
      'acquired',
      'rejected',
      'expired'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'investor_decision') THEN
    CREATE TYPE public.investor_decision AS ENUM (
      'pending',
      'interested',
      'very_interested',
      'not_interested'
    );
  END IF;
END $$;

-- Realtor-shared opportunities per investor
CREATE TABLE IF NOT EXISTS public.investor_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  investor_id uuid NOT NULL REFERENCES public.investors(id),
  listing_id uuid NOT NULL REFERENCES public.listings(id),
  shared_by uuid NOT NULL REFERENCES public.users(id),
  shared_at timestamptz NOT NULL DEFAULT now(),
  shared_message text,
  status public.opportunity_status NOT NULL DEFAULT 'recommended',
  decision public.investor_decision NOT NULL DEFAULT 'pending',
  decision_at timestamptz,
  decision_note text,
  memo_id uuid REFERENCES public.memos(id),
  deal_room_id uuid REFERENCES public.deal_rooms(id),
  holding_id uuid REFERENCES public.holdings(id),
  shortlist_item_id uuid REFERENCES public.shortlist_items(id),
  match_score integer,
  match_reasons text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'investor_opportunities_investor_id_listing_id_key'
  ) THEN
    ALTER TABLE public.investor_opportunities
      ADD CONSTRAINT investor_opportunities_investor_id_listing_id_key
      UNIQUE (investor_id, listing_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_investor_opportunities_investor
  ON public.investor_opportunities(investor_id);
CREATE INDEX IF NOT EXISTS idx_investor_opportunities_listing
  ON public.investor_opportunities(listing_id);
CREATE INDEX IF NOT EXISTS idx_investor_opportunities_status
  ON public.investor_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_investor_opportunities_decision
  ON public.investor_opportunities(decision);
CREATE INDEX IF NOT EXISTS idx_investor_opportunities_tenant
  ON public.investor_opportunities(tenant_id);

-- Per-opportunity conversation thread
CREATE TABLE IF NOT EXISTS public.opportunity_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  opportunity_id uuid NOT NULL REFERENCES public.investor_opportunities(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.users(id),
  sender_role text NOT NULL CHECK (sender_role IN ('investor', 'agent', 'ai')),
  body text NOT NULL,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_opportunity_messages_opportunity
  ON public.opportunity_messages(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_messages_created
  ON public.opportunity_messages(opportunity_id, created_at);

-- Keep updated_at fresh
CREATE OR REPLACE FUNCTION public.update_investor_opportunities_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_investor_opportunities_updated_at ON public.investor_opportunities;
CREATE TRIGGER trg_investor_opportunities_updated_at
  BEFORE UPDATE ON public.investor_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.update_investor_opportunities_updated_at();

-- RLS
ALTER TABLE public.investor_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'investor_opportunities'
      AND policyname = 'Users can view tenant investor opportunities'
  ) THEN
    CREATE POLICY "Users can view tenant investor opportunities"
      ON public.investor_opportunities
      FOR SELECT
      USING (tenant_id = public.get_user_tenant_id());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'investor_opportunities'
      AND policyname = 'Users can manage tenant investor opportunities'
  ) THEN
    CREATE POLICY "Users can manage tenant investor opportunities"
      ON public.investor_opportunities
      FOR ALL
      USING (tenant_id = public.get_user_tenant_id())
      WITH CHECK (tenant_id = public.get_user_tenant_id());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'opportunity_messages'
      AND policyname = 'Users can view tenant opportunity messages'
  ) THEN
    CREATE POLICY "Users can view tenant opportunity messages"
      ON public.opportunity_messages
      FOR SELECT
      USING (tenant_id = public.get_user_tenant_id());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'opportunity_messages'
      AND policyname = 'Users can manage tenant opportunity messages'
  ) THEN
    CREATE POLICY "Users can manage tenant opportunity messages"
      ON public.opportunity_messages
      FOR ALL
      USING (tenant_id = public.get_user_tenant_id())
      WITH CHECK (tenant_id = public.get_user_tenant_id());
  END IF;
END $$;
