-- =============================
-- QUICK FIX: Auth Integration
-- =============================
-- Run this in Supabase Dashboard SQL Editor:
-- https://supabase.com/dashboard/project/dmkrjnuzruhkmykbrqld/sql/new

-- 1. Add new columns to users table
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_sign_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- 2. Create index for auth lookups
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);

-- 3. Ensure default tenant exists
INSERT INTO public.tenants (id, name, created_at) 
VALUES ('11111111-1111-1111-1111-111111111111', 'Palm & Partners Realty', now())
ON CONFLICT (id) DO NOTHING;

-- 4. Create/Update Santiago's user record
-- First, get the auth_user_id from auth.users
DO $$
DECLARE
  auth_id uuid;
BEGIN
  -- Get auth user id
  SELECT id INTO auth_id FROM auth.users WHERE email = 'smundi@aideology.ai';
  
  IF auth_id IS NOT NULL THEN
    -- Insert or update the user
    INSERT INTO public.users (
      id, tenant_id, auth_user_id, name, email, role, phone, whatsapp, is_active, created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000001',
      '11111111-1111-1111-1111-111111111111',
      auth_id,
      'Santiago Mundi Falgueras',
      'smundi@aideology.ai',
      'super_admin',
      '+971526851998',
      '+34628764918',
      true,
      now(),
      now()
    )
    ON CONFLICT (email) DO UPDATE SET
      auth_user_id = auth_id,
      name = 'Santiago Mundi Falgueras',
      role = 'super_admin',
      phone = '+971526851998',
      whatsapp = '+34628764918',
      is_active = true,
      updated_at = now();
    
    RAISE NOTICE 'User created/updated with auth_user_id: %', auth_id;
  ELSE
    RAISE NOTICE 'Auth user not found for smundi@aideology.ai';
  END IF;
END $$;

-- 5. Function to get user by auth_user_id (for session lookup)
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

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION public.get_user_by_auth_id TO authenticated;

-- Verify the result
SELECT id, email, name, role, auth_user_id, is_active FROM public.users WHERE email = 'smundi@aideology.ai';
