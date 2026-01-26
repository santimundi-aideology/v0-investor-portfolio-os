-- =============================
-- SEED ADMIN USER: Santiago Mundi Falgueras
-- =============================
-- This seeds the admin user into public.users
-- The auth.users record is created when Santiago signs up
-- After signup, the trigger will link auth_user_id

-- First, ensure the default tenant exists
INSERT INTO public.tenants (id, name, created_at) 
VALUES ('11111111-1111-1111-1111-111111111111', 'Palm & Partners Realty', now() - interval '2 years')
ON CONFLICT (id) DO NOTHING;

-- Insert Santiago's user record
INSERT INTO public.users (
  id, 
  tenant_id, 
  name, 
  email, 
  role, 
  phone, 
  whatsapp,
  is_active,
  created_at, 
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111111',
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
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  phone = EXCLUDED.phone,
  whatsapp = EXCLUDED.whatsapp,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Also add as an investor record if needed (for portal access testing)
-- This is optional but allows testing the investor portal as admin
INSERT INTO public.investors (
  id,
  tenant_id,
  name,
  company,
  email,
  phone,
  status,
  mandate,
  created_at,
  last_contact,
  total_deals,
  owner_user_id
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  '11111111-1111-1111-1111-111111111111',
  'Santiago Mundi Falgueras',
  'Aideology',
  'smundi@aideology.ai',
  '+971526851998',
  'active',
  '{"strategy": "Core Plus", "investmentHorizon": "5-10 years", "yieldTarget": "8-12%", "riskTolerance": "medium", "preferredAreas": ["Dubai Marina", "Downtown Dubai", "DIFC"], "propertyTypes": ["commercial", "residential"], "minInvestment": 1000000, "maxInvestment": 50000000}'::jsonb,
  now(),
  now(),
  0,
  '00000000-0000-0000-0000-000000000001'
)
ON CONFLICT (id) DO NOTHING;
