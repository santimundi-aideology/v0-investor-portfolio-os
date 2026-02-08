-- =============================
-- DEAL ROOMS TABLE
-- =============================
-- Creates the deal_rooms table for tracking deal pipeline.
-- Parties, checklist, and timeline are stored as JSONB arrays
-- to keep the schema simple and match the existing pattern (like mandates).

-- Stage enum for deal rooms
DO $$ BEGIN
  CREATE TYPE public.deal_stage AS ENUM (
    'preparation',
    'due-diligence',
    'negotiation',
    'closing',
    'completed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Priority enum for deal rooms
DO $$ BEGIN
  CREATE TYPE public.deal_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.deal_rooms (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id),
  title           text NOT NULL,
  property_id     uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  investor_id     uuid REFERENCES public.investors(id) ON DELETE SET NULL,
  -- Denormalized names for fast display (updated on write)
  investor_name   text,
  property_title  text,
  status          public.deal_stage NOT NULL DEFAULT 'preparation',
  ticket_size_aed numeric,
  offer_price_aed numeric,
  target_close_date date,
  probability     integer DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
  priority        public.deal_priority NOT NULL DEFAULT 'medium',
  next_step       text,
  summary         text,
  assigned_agent_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  -- Nested structures stored as JSONB
  parties         jsonb NOT NULL DEFAULT '[]'::jsonb,
  checklist       jsonb NOT NULL DEFAULT '[]'::jsonb,
  timeline        jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes           text,
  metadata        jsonb DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS deal_rooms_tenant_idx
  ON public.deal_rooms(tenant_id);

CREATE INDEX IF NOT EXISTS deal_rooms_investor_idx
  ON public.deal_rooms(investor_id);

CREATE INDEX IF NOT EXISTS deal_rooms_property_idx
  ON public.deal_rooms(property_id);

CREATE INDEX IF NOT EXISTS deal_rooms_status_idx
  ON public.deal_rooms(tenant_id, status);

CREATE INDEX IF NOT EXISTS deal_rooms_assigned_agent_idx
  ON public.deal_rooms(assigned_agent_id);

-- =============================
-- ROW LEVEL SECURITY
-- =============================
ALTER TABLE public.deal_rooms ENABLE ROW LEVEL SECURITY;

-- Users can view deal rooms in their tenant
CREATE POLICY "Users can view tenant deal rooms"
  ON public.deal_rooms FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

-- Agents/managers can create deal rooms in their tenant
CREATE POLICY "Agents can create deal rooms"
  ON public.deal_rooms FOR INSERT
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_user_id = auth.uid()
      AND role IN ('agent', 'manager', 'super_admin')
    )
  );

-- Agents/managers can update deal rooms in their tenant
CREATE POLICY "Agents can update deal rooms"
  ON public.deal_rooms FOR UPDATE
  USING (
    tenant_id = public.get_user_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_user_id = auth.uid()
      AND role IN ('agent', 'manager', 'super_admin')
    )
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
  );

-- Only managers/super_admins can delete deal rooms
CREATE POLICY "Managers can delete deal rooms"
  ON public.deal_rooms FOR DELETE
  USING (
    tenant_id = public.get_user_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_user_id = auth.uid()
      AND role IN ('manager', 'super_admin')
    )
  );

-- =============================
-- AUTO-UPDATE updated_at TRIGGER
-- =============================
CREATE OR REPLACE FUNCTION public.set_deal_room_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS deal_rooms_updated_at ON public.deal_rooms;
CREATE TRIGGER deal_rooms_updated_at
  BEFORE UPDATE ON public.deal_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.set_deal_room_updated_at();
