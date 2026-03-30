-- =============================
-- MIGRATION 022: Tighten RLS Policies
-- =============================
--
-- Context: Migration 014 vs 015 and the auth trigger
-- -------------------------------------------------------
-- Migration 014 (014_superadmin_domains_and_tenant_enhancements.sql) introduced a
-- handle_new_auth_user() trigger that checks email domains against superadmin_domains
-- for automatic super_admin role assignment on signup, with three branches:
--   a) superadmin domain -> super_admin role, tenant_id NULL
--   b) metadata tenant_id present (invite flow) -> use that tenant
--   c) unknown signup -> tenant_id NULL (needs onboarding)
--
-- Migration 015 (015_fix_users_rls_infinite_recursion.sql) replaced that trigger
-- with a simpler version to fix the platform_role type cast error and avoid RLS
-- infinite recursion on the users table. That replacement intentionally dropped the
-- domain-based super_admin assignment from the trigger. The domain check now lives
-- at the application layer in lib/auth/server.ts (isSuperAdminDomain()), which uses
-- the admin client to query superadmin_domains directly.
--
-- This migration tightens several overly-permissive RLS policies:
--   1. Documents get_user_tenant_id() limitation re: user_tenant_access
--   2. Tightens market_signal_target "FOR ALL" policy
--   3. Tightens memo_share_tokens UPDATE policy
--   4. Tightens notifications SELECT policy
--   5. Renames/clarifies shortlists management policy


-- =============================
-- 1. DOCUMENT get_user_tenant_id() LIMITATION
-- =============================
-- The function (defined in 009) only returns users.tenant_id (the primary tenant).
-- It does NOT account for user_tenant_access (created in 012), meaning if a user
-- accesses a different tenant via the org switcher, RLS still scopes to their
-- primary tenant.
--
-- This is acceptable because:
--   a) The app uses the admin client (service_role, which bypasses RLS) for
--      most data operations — RLS is a defense-in-depth layer.
--   b) There is no mechanism to pass the "current tenant" from the Next.js
--      middleware (x-tenant-id header) into PostgreSQL RLS evaluation context.
--   c) To support multi-tenant switching at the RLS layer, we would need:
--        - set_config('app.current_tenant_id', ...) per-request, OR
--        - Embedding the active tenant_id in the JWT claims
--      Both require changes to the Supabase client initialization.

COMMENT ON FUNCTION public.get_user_tenant_id IS
  'Returns primary tenant_id for the authenticated user from public.users. '
  'LIMITATION: Does not account for user_tenant_access multi-tenant membership. '
  'The app uses the admin client (service_role) for cross-tenant operations. '
  'To support RLS-level tenant switching, set_config(''app.current_tenant_id'', ...) '
  'would need to be called per-request from the Next.js middleware.';


-- =============================
-- 2. TIGHTEN market_signal_target POLICIES
-- =============================
-- The old "System can manage signal targets" (FOR ALL, WITH CHECK (true)) allowed
-- ANY authenticated user to insert/update/delete signal targets across all tenants.
-- Replace with: service_role-only write access. The existing SELECT policy from 009
-- ("Users can view tenant signal targets") already correctly scopes reads to the
-- user's tenant via org_id = get_user_tenant_id().

DROP POLICY IF EXISTS "System can manage signal targets" ON public.market_signal_target;
DROP POLICY IF EXISTS "Org members can view signal targets" ON public.market_signal_target;
DROP POLICY IF EXISTS "Service role can manage signal targets" ON public.market_signal_target;

CREATE POLICY "Service role can manage signal targets"
  ON public.market_signal_target FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- =============================
-- 3. TIGHTEN memo_share_tokens UPDATE POLICY
-- =============================
-- The old "System can update share tokens" (USING (true) / WITH CHECK (true))
-- allowed ANY authenticated user to update any share token regardless of tenant.
-- Replace with a tenant-scoped policy. The service_role (admin client) bypasses RLS
-- anyway, so tracking updates from anonymous share link opens still work.

DROP POLICY IF EXISTS "System can update share tokens" ON public.memo_share_tokens;
DROP POLICY IF EXISTS "Users can update share tokens" ON public.memo_share_tokens;
DROP POLICY IF EXISTS "Tenant members can update own share tokens" ON public.memo_share_tokens;

CREATE POLICY "Tenant members can update own share tokens"
  ON public.memo_share_tokens FOR UPDATE
  USING (
    tenant_id = public.get_user_tenant_id()
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
  );


-- =============================
-- 4. TIGHTEN notifications SELECT POLICY
-- =============================
-- The old policy allowed viewing notifications where:
--   recipient_user_id = current_user OR org_id = user's tenant
-- The org_id fallback exposed all tenant-wide notifications to every member,
-- even if they were addressed to a specific recipient. Tighten to user-scoped only.

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (recipient_user_id = (
    SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1
  ));


-- =============================
-- 5. TIGHTEN shortlists MANAGEMENT POLICY
-- =============================
-- The old "Users can manage own shortlists" (FOR ALL) allows any tenant member to
-- manage any shortlist in the tenant. This is acceptable since only agents/managers
-- create shortlists in practice — investors access shortlists via the investor portal
-- which uses the admin client (bypassing RLS). Rename for clarity.

DROP POLICY IF EXISTS "Users can manage own shortlists" ON public.shortlists;
DROP POLICY IF EXISTS "Tenant members can manage shortlists" ON public.shortlists;
DROP POLICY IF EXISTS "Agents and managers can manage shortlists" ON public.shortlists;

CREATE POLICY "Agents and managers can manage shortlists"
  ON public.shortlists FOR ALL
  USING (tenant_id = public.get_user_tenant_id())
  WITH CHECK (tenant_id = public.get_user_tenant_id());
