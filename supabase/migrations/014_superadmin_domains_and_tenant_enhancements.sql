-- =============================
-- MIGRATION: Super Admin Domains + Tenant Enhancements
-- =============================
-- 1. Creates superadmin_domains table for configurable domain whitelist
-- 2. Enhances tenants table with operational metadata
-- 3. Updates handle_new_auth_user() trigger for domain-based super_admin assignment
-- 4. Adds RLS policies for new table
-- 5. Updates RLS on tenants to respect is_active

-- =============================
-- 1. SUPERADMIN DOMAINS TABLE
-- =============================
CREATE TABLE IF NOT EXISTS public.superadmin_domains (
  domain text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.users(id)
);

-- Seed initial domains
INSERT INTO public.superadmin_domains (domain) VALUES ('aideology.ai'), ('vantage.ai')
ON CONFLICT (domain) DO NOTHING;

-- =============================
-- 2. ENHANCE TENANTS TABLE
-- =============================
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'brokerage',
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS domain text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Add check constraint for valid tenant types
DO $$ BEGIN
  ALTER TABLE public.tenants
    ADD CONSTRAINT tenants_type_check
    CHECK (type IN ('brokerage', 'developer', 'family_office', 'other'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================
-- 3. UPDATE AUTH TRIGGER
-- =============================
-- Replaces the existing handle_new_auth_user() to:
--   a) Check email domain against superadmin_domains -> assign super_admin, tenant_id NULL
--   b) Use tenant_id from metadata if provided (invite flow)
--   c) Otherwise leave tenant_id NULL (unknown signup needs onboarding)
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_role text;
  v_name text;
  v_email_domain text;
  v_is_superadmin_domain boolean;
BEGIN
  -- Extract email domain
  v_email_domain := split_part(NEW.email, '@', 2);

  -- Check if domain is in superadmin_domains
  SELECT EXISTS (
    SELECT 1 FROM public.superadmin_domains WHERE domain = v_email_domain
  ) INTO v_is_superadmin_domain;

  -- Extract name from metadata
  v_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );

  IF v_is_superadmin_domain THEN
    -- Super admin domain: assign super_admin role, no tenant
    v_role := 'super_admin';
    v_tenant_id := NULL;
  ELSIF NEW.raw_user_meta_data->>'tenant_id' IS NOT NULL THEN
    -- Invited user: use tenant_id from metadata
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'agent');
    v_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::uuid;
  ELSE
    -- Unknown signup: no tenant (needs onboarding)
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'agent');
    v_tenant_id := NULL;
  END IF;

  -- Insert into public.users
  INSERT INTO public.users (
    id,
    tenant_id,
    auth_user_id,
    name,
    email,
    role,
    phone,
    whatsapp,
    email_verified,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_tenant_id,
    NEW.id,
    v_name,
    NEW.email,
    v_role,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'whatsapp',
    NEW.email_confirmed_at IS NOT NULL,
    NOW(),
    NOW()
  )
  ON CONFLICT (email) DO UPDATE SET
    auth_user_id = NEW.id,
    email_verified = NEW.email_confirmed_at IS NOT NULL,
    -- Also update role if this is a superadmin domain (handle existing users)
    role = CASE
      WHEN v_is_superadmin_domain THEN 'super_admin'
      ELSE public.users.role
    END,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- =============================
-- 4. RLS FOR SUPERADMIN_DOMAINS
-- =============================
ALTER TABLE public.superadmin_domains ENABLE ROW LEVEL SECURITY;

-- Super admins can view all domains
CREATE POLICY "Super admins can view domains"
  ON public.superadmin_domains FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Super admins can manage domains
CREATE POLICY "Super admins can manage domains"
  ON public.superadmin_domains FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Service role can always access (for triggers)
CREATE POLICY "Service role can access domains"
  ON public.superadmin_domains FOR SELECT
  USING (auth.uid() IS NULL);

-- Grant select to authenticated for the trigger to work
GRANT SELECT ON public.superadmin_domains TO authenticated;

-- =============================
-- 5. UPDATE user_profiles VIEW
-- =============================
-- Recreate user_profiles view to include new tenant fields
CREATE OR REPLACE VIEW public.user_profiles AS
SELECT 
  u.id,
  u.tenant_id,
  u.name,
  u.email,
  u.role,
  u.phone,
  u.whatsapp,
  u.avatar_url,
  u.auth_user_id,
  u.email_verified,
  u.last_sign_in_at,
  u.is_active,
  u.created_at,
  u.updated_at,
  t.name as tenant_name,
  t.type as tenant_type,
  t.is_active as tenant_is_active
FROM public.users u
LEFT JOIN public.tenants t ON t.id = u.tenant_id;
