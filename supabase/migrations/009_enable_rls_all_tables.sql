-- =============================
-- ENABLE RLS ON ALL TABLES
-- =============================
-- Enables Row Level Security on all public tables and creates tenant-scoped policies
-- This migration addresses critical security vulnerabilities

-- Helper function to get current user's tenant_id
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  SELECT tenant_id INTO v_tenant_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
  
  RETURN v_tenant_id;
END;
$$;

-- Helper function to check if user is admin/manager
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_user_id = auth.uid()
    AND role IN ('super_admin', 'manager')
  );
END;
$$;

-- =============================
-- TENANTS TABLE
-- =============================
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Users can view their own tenant
CREATE POLICY "Users can view own tenant"
  ON public.tenants FOR SELECT
  USING (id = public.get_user_tenant_id());

-- Only super_admins can create/update tenants
CREATE POLICY "Super admins can manage tenants"
  ON public.tenants FOR ALL
  USING (public.is_admin_or_manager())
  WITH CHECK (public.is_admin_or_manager());

-- =============================
-- INVESTORS TABLE
-- =============================
ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;

-- Users can view investors in their tenant
CREATE POLICY "Users can view tenant investors"
  ON public.investors FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

-- Agents/managers can create investors
CREATE POLICY "Agents can create investors"
  ON public.investors FOR INSERT
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_user_id = auth.uid()
      AND role IN ('agent', 'manager', 'super_admin')
    )
  );

-- Agents/managers can update investors in their tenant
CREATE POLICY "Agents can update tenant investors"
  ON public.investors FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id())
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_user_id = auth.uid()
      AND role IN ('agent', 'manager', 'super_admin')
    )
  );

-- Managers can delete investors
CREATE POLICY "Managers can delete investors"
  ON public.investors FOR DELETE
  USING (
    tenant_id = public.get_user_tenant_id()
    AND public.is_admin_or_manager()
  );

-- =============================
-- LISTINGS TABLE
-- =============================
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant listings"
  ON public.listings FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Agents can create listings"
  ON public.listings FOR INSERT
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_user_id = auth.uid()
      AND role IN ('agent', 'manager', 'super_admin')
    )
  );

CREATE POLICY "Agents can update tenant listings"
  ON public.listings FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id())
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_user_id = auth.uid()
      AND role IN ('agent', 'manager', 'super_admin')
    )
  );

CREATE POLICY "Managers can delete listings"
  ON public.listings FOR DELETE
  USING (
    tenant_id = public.get_user_tenant_id()
    AND public.is_admin_or_manager()
  );

-- =============================
-- MEMOS TABLE
-- =============================
ALTER TABLE public.memos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant memos"
  ON public.memos FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Agents can create memos"
  ON public.memos FOR INSERT
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_user_id = auth.uid()
      AND role IN ('agent', 'manager', 'super_admin')
    )
  );

CREATE POLICY "Agents can update tenant memos"
  ON public.memos FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id())
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_user_id = auth.uid()
      AND role IN ('agent', 'manager', 'super_admin')
    )
  );

CREATE POLICY "Managers can delete memos"
  ON public.memos FOR DELETE
  USING (
    tenant_id = public.get_user_tenant_id()
    AND public.is_admin_or_manager()
  );

-- =============================
-- MEMO_VERSIONS TABLE
-- =============================
ALTER TABLE public.memo_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant memo versions"
  ON public.memo_versions FOR SELECT
  USING (
    memo_id IN (
      SELECT id FROM public.memos WHERE tenant_id = public.get_user_tenant_id()
    )
  );

CREATE POLICY "Agents can create memo versions"
  ON public.memo_versions FOR INSERT
  WITH CHECK (
    memo_id IN (
      SELECT id FROM public.memos WHERE tenant_id = public.get_user_tenant_id()
    )
  );

-- =============================
-- HOLDINGS TABLE
-- =============================
ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant holdings"
  ON public.holdings FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Agents can manage tenant holdings"
  ON public.holdings FOR ALL
  USING (tenant_id = public.get_user_tenant_id())
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_user_id = auth.uid()
      AND role IN ('agent', 'manager', 'super_admin')
    )
  );

-- =============================
-- MANDATES TABLE
-- =============================
ALTER TABLE public.mandates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant mandates"
  ON public.mandates FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Agents can manage tenant mandates"
  ON public.mandates FOR ALL
  USING (tenant_id = public.get_user_tenant_id())
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_user_id = auth.uid()
      AND role IN ('agent', 'manager', 'super_admin')
    )
  );

-- =============================
-- SHORTLISTS TABLE
-- =============================
ALTER TABLE public.shortlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant shortlists"
  ON public.shortlists FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can manage own shortlists"
  ON public.shortlists FOR ALL
  USING (tenant_id = public.get_user_tenant_id())
  WITH CHECK (tenant_id = public.get_user_tenant_id());

-- =============================
-- SHORTLIST_ITEMS TABLE
-- =============================
ALTER TABLE public.shortlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant shortlist items"
  ON public.shortlist_items FOR SELECT
  USING (
    shortlist_id IN (
      SELECT id FROM public.shortlists WHERE tenant_id = public.get_user_tenant_id()
    )
  );

CREATE POLICY "Users can manage tenant shortlist items"
  ON public.shortlist_items FOR ALL
  USING (
    shortlist_id IN (
      SELECT id FROM public.shortlists WHERE tenant_id = public.get_user_tenant_id()
    )
  )
  WITH CHECK (
    shortlist_id IN (
      SELECT id FROM public.shortlists WHERE tenant_id = public.get_user_tenant_id()
    )
  );

-- =============================
-- UNDERWRITINGS TABLE
-- =============================
ALTER TABLE public.underwritings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant underwritings"
  ON public.underwritings FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Agents can manage tenant underwritings"
  ON public.underwritings FOR ALL
  USING (tenant_id = public.get_user_tenant_id())
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_user_id = auth.uid()
      AND role IN ('agent', 'manager', 'super_admin')
    )
  );

-- =============================
-- UNDERWRITING_COMPS TABLE
-- =============================
ALTER TABLE public.underwriting_comps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant underwriting comps"
  ON public.underwriting_comps FOR SELECT
  USING (
    underwriting_id IN (
      SELECT id FROM public.underwritings WHERE tenant_id = public.get_user_tenant_id()
    )
  );

CREATE POLICY "Agents can manage tenant underwriting comps"
  ON public.underwriting_comps FOR ALL
  USING (
    underwriting_id IN (
      SELECT id FROM public.underwritings WHERE tenant_id = public.get_user_tenant_id()
    )
  )
  WITH CHECK (
    underwriting_id IN (
      SELECT id FROM public.underwritings WHERE tenant_id = public.get_user_tenant_id()
    )
  );

-- =============================
-- TRUST_RECORDS TABLE
-- =============================
ALTER TABLE public.trust_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant trust records"
  ON public.trust_records FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Agents can manage tenant trust records"
  ON public.trust_records FOR ALL
  USING (tenant_id = public.get_user_tenant_id())
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_user_id = auth.uid()
      AND role IN ('agent', 'manager', 'super_admin')
    )
  );

-- =============================
-- DECISIONS TABLE
-- =============================
ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant decisions"
  ON public.decisions FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can create tenant decisions"
  ON public.decisions FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id());

-- =============================
-- MESSAGES TABLE
-- =============================
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant messages"
  ON public.messages FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can create tenant messages"
  ON public.messages FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can update own messages"
  ON public.messages FOR UPDATE
  USING (
    tenant_id = public.get_user_tenant_id()
    AND sender_id = (
      SELECT id FROM public.users WHERE auth_user_id = auth.uid()
    )
  );

-- =============================
-- TASKS TABLE
-- =============================
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant tasks"
  ON public.tasks FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can manage tenant tasks"
  ON public.tasks FOR ALL
  USING (tenant_id = public.get_user_tenant_id())
  WITH CHECK (tenant_id = public.get_user_tenant_id());

-- =============================
-- NOTIFICATIONS TABLE
-- =============================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (
    recipient_user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
    OR org_id = public.get_user_tenant_id()
  );

CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true); -- Service role can insert

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (
    recipient_user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  );

-- =============================
-- AUDIT_EVENTS TABLE
-- =============================
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant audit events"
  ON public.audit_events FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "System can create audit events"
  ON public.audit_events FOR INSERT
  WITH CHECK (true); -- Service role can insert

-- =============================
-- MARKET SIGNAL TABLES
-- =============================
ALTER TABLE public.market_signal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant market signals"
  ON public.market_signal FOR SELECT
  USING (org_id = public.get_user_tenant_id());

CREATE POLICY "System can create market signals"
  ON public.market_signal FOR INSERT
  WITH CHECK (true); -- Service role can insert

CREATE POLICY "Agents can update tenant market signals"
  ON public.market_signal FOR UPDATE
  USING (org_id = public.get_user_tenant_id())
  WITH CHECK (
    org_id = public.get_user_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_user_id = auth.uid()
      AND role IN ('agent', 'manager', 'super_admin')
    )
  );

ALTER TABLE public.market_signal_target ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant signal targets"
  ON public.market_signal_target FOR SELECT
  USING (org_id = public.get_user_tenant_id());

CREATE POLICY "System can manage signal targets"
  ON public.market_signal_target FOR ALL
  WITH CHECK (true); -- Service role can manage

-- =============================
-- MARKET DATA SNAPSHOTS (Read-only for most users)
-- =============================
ALTER TABLE public.market_metric_snapshot ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant market metrics"
  ON public.market_metric_snapshot FOR SELECT
  USING (org_id = public.get_user_tenant_id());

CREATE POLICY "System can manage market metrics"
  ON public.market_metric_snapshot FOR ALL
  WITH CHECK (true); -- Service role can manage

ALTER TABLE public.portal_listing_snapshot ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant portal snapshots"
  ON public.portal_listing_snapshot FOR SELECT
  USING (org_id = public.get_user_tenant_id());

CREATE POLICY "System can manage portal snapshots"
  ON public.portal_listing_snapshot FOR ALL
  WITH CHECK (true); -- Service role can manage

-- =============================
-- RAW DATA TABLES (Service role only)
-- =============================
ALTER TABLE public.raw_dld_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only for raw DLD data"
  ON public.raw_dld_transactions FOR ALL
  USING (false) -- No direct access, use service role
  WITH CHECK (false);

ALTER TABLE public.raw_ejari_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only for raw Ejari data"
  ON public.raw_ejari_contracts FOR ALL
  USING (false)
  WITH CHECK (false);

ALTER TABLE public.raw_portal_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only for raw portal data"
  ON public.raw_portal_listings FOR ALL
  USING (false)
  WITH CHECK (false);

-- =============================
-- DLD TRANSACTIONS (Public read, tenant-scoped)
-- =============================
ALTER TABLE public.dld_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view DLD transactions"
  ON public.dld_transactions FOR SELECT
  USING (true); -- Public read access for market data

CREATE POLICY "Service role only for DLD writes"
  ON public.dld_transactions FOR ALL
  USING (false)
  WITH CHECK (false);

ALTER TABLE public.dld_market_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view DLD signals"
  ON public.dld_market_signals FOR SELECT
  USING (true);

CREATE POLICY "Service role only for DLD signal writes"
  ON public.dld_market_signals FOR ALL
  USING (false)
  WITH CHECK (false);

ALTER TABLE public.dubai_area_coordinates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view area coordinates"
  ON public.dubai_area_coordinates FOR SELECT
  USING (true); -- Public reference data

-- =============================
-- PORTAL LISTINGS (Public read)
-- =============================
ALTER TABLE public.portal_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view portal listings"
  ON public.portal_listings FOR SELECT
  USING (true); -- Public market data

CREATE POLICY "Service role only for portal writes"
  ON public.portal_listings FOR ALL
  USING (false)
  WITH CHECK (false);

-- =============================
-- AI SUMMARY TABLES
-- =============================
ALTER TABLE public.ai_market_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant AI summaries"
  ON public.ai_market_summary FOR SELECT
  USING (org_id = public.get_user_tenant_id());

CREATE POLICY "System can manage AI summaries"
  ON public.ai_market_summary FOR ALL
  WITH CHECK (true); -- Service role can manage

ALTER TABLE public.ai_investor_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant investor summaries"
  ON public.ai_investor_summary FOR SELECT
  USING (org_id = public.get_user_tenant_id());

CREATE POLICY "System can manage investor summaries"
  ON public.ai_investor_summary FOR ALL
  WITH CHECK (true); -- Service role can manage

-- =============================
-- GRANT PERMISSIONS
-- =============================
GRANT EXECUTE ON FUNCTION public.get_user_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_manager() TO authenticated;
