-- =============================
-- AUTH INTEGRATION MIGRATION
-- =============================
-- Links public.users to auth.users for Supabase Auth integration
-- Adds user profile fields (phone, whatsapp, avatar)
-- Creates sync triggers and RLS policies

-- 1. Add new columns to users table
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_sign_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Create index for auth lookups
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- 2. Create user_profiles view for easy access
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
  t.name as tenant_name
FROM public.users u
LEFT JOIN public.tenants t ON t.id = u.tenant_id;

-- 3. Function to sync auth.users → public.users on signup
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
    user_role,
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

-- 4. Function to sync updates from auth.users → public.users
CREATE OR REPLACE FUNCTION public.handle_auth_user_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.users SET
    email_verified = NEW.email_confirmed_at IS NOT NULL,
    last_sign_in_at = NEW.last_sign_in_at,
    updated_at = NOW()
  WHERE auth_user_id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- 5. Create triggers on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_updated();

-- 6. Function to get user by auth_user_id (for session lookup)
CREATE OR REPLACE FUNCTION public.get_user_by_auth_id(p_auth_user_id uuid)
RETURNS TABLE (
  id uuid,
  tenant_id uuid,
  name text,
  email text,
  role text,
  phone text,
  whatsapp text,
  avatar_url text,
  is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.tenant_id,
    u.name,
    u.email,
    u.role,
    u.phone,
    u.whatsapp,
    u.avatar_url,
    u.is_active
  FROM public.users u
  WHERE u.auth_user_id = p_auth_user_id
  LIMIT 1;
END;
$$;

-- 7. Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies

-- Users can read their own record
CREATE POLICY "Users can view own record"
  ON public.users FOR SELECT
  USING (auth.uid() = auth_user_id);

-- Users in same tenant can view each other
CREATE POLICY "Users can view tenant members"
  ON public.users FOR SELECT
  USING (
    tenant_id IN (
      SELECT u.tenant_id FROM public.users u 
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- Only admins/managers can update users
CREATE POLICY "Admins can update users"
  ON public.users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.auth_user_id = auth.uid() 
      AND u.role IN ('super_admin', 'manager')
    )
  );

-- Only super_admins can insert users
CREATE POLICY "Super admins can insert users"
  ON public.users FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.auth_user_id = auth.uid() 
      AND u.role = 'super_admin'
    )
    OR auth.uid() IS NULL -- Allow service role inserts
  );

-- 9. Grant permissions
GRANT SELECT ON public.user_profiles TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_by_auth_id TO authenticated;
