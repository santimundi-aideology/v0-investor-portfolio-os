-- =============================
-- FIX INFINITE RECURSION IN USERS TABLE RLS POLICIES
-- =============================
-- Addresses infinite recursion error: "infinite recursion detected in policy for relation users"
-- The issue is that RLS policies on users table query the users table itself, creating infinite loop.
-- Solution: Use SECURITY DEFINER helper functions that bypass RLS.

-- First, create a helper function to get user role (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS platform_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_role platform_role;
BEGIN
  SELECT role INTO v_role
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
  
  RETURN v_role;
END;
$$;

-- Create helper function to check if user is super_admin (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_super_admin()
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
    AND role = 'super_admin'
  );
END;
$$;

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view tenant members" ON public.users;
DROP POLICY IF EXISTS "Admins can update users" ON public.users;
DROP POLICY IF EXISTS "Super admins can insert users" ON public.users;

-- Recreate policies using SECURITY DEFINER functions to avoid recursion

-- Users in same tenant can view each other
CREATE POLICY "Users can view tenant members"
  ON public.users FOR SELECT
  USING (
    tenant_id = public.get_user_tenant_id()
  );

-- Only admins/managers can update users
CREATE POLICY "Admins can update users"
  ON public.users FOR UPDATE
  USING (
    public.is_admin_or_manager()
  );

-- Only super_admins can insert users (or service role when auth.uid() is null)
CREATE POLICY "Super admins can insert users"
  ON public.users FOR INSERT
  WITH CHECK (
    public.is_super_admin()
    OR auth.uid() IS NULL -- Allow service role and trigger inserts
  );

-- =============================
-- FIX TYPE ERROR IN TRIGGER
-- =============================
-- Fix "column role is of type platform_role but expression is of type text" error
-- Need to cast the role text to platform_role enum

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  default_tenant_id uuid;
  user_role text;
  user_name text;
BEGIN
  -- Get default tenant (first one if multiple exist)
  SELECT id INTO default_tenant_id FROM public.tenants ORDER BY created_at LIMIT 1;
  
  -- Extract metadata from auth.users
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'agent');
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );
  
  -- Insert into public.users if email doesn't already exist
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
    COALESCE((NEW.raw_user_meta_data->>'tenant_id')::uuid, default_tenant_id),
    NEW.id,
    user_name,
    NEW.email,
    user_role::platform_role, -- FIX: Cast text to platform_role enum
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'whatsapp',
    NEW.email_confirmed_at IS NOT NULL,
    NOW(),
    NOW()
  )
  ON CONFLICT (email) DO UPDATE SET
    auth_user_id = NEW.id,
    email_verified = NEW.email_confirmed_at IS NOT NULL,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- Grant execute permissions on new helper functions
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- Add comment documenting the fix
COMMENT ON FUNCTION public.get_user_role IS 'Returns current user role. SECURITY DEFINER bypasses RLS to prevent infinite recursion.';
COMMENT ON FUNCTION public.is_super_admin IS 'Checks if current user is super_admin. SECURITY DEFINER bypasses RLS to prevent infinite recursion.';
