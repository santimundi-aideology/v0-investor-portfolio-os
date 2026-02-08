-- Migration: Add plan field to tenants + user_tenant_access for multi-tenant switching
-- This enables users (especially super_admins) to belong to multiple tenants
-- and the org switcher UI to display real tenant data with plan info.

-- 1. Add plan column to tenants table
alter table public.tenants
  add column if not exists plan text not null default 'starter';

-- Add check constraint for valid plans
alter table public.tenants
  add constraint tenants_plan_check
  check (plan in ('starter', 'pro', 'enterprise'));

-- 2. Create user_tenant_access table for multi-tenant membership
-- This allows a user to access multiple tenants (e.g. super_admin across all, or consultants)
create table if not exists public.user_tenant_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  role text not null default 'member',  -- 'owner', 'admin', 'member'
  granted_at timestamptz not null default now(),
  granted_by uuid references public.users(id),
  
  -- Ensure unique user-tenant pairs
  unique (user_id, tenant_id)
);

-- Index for fast lookups
create index if not exists idx_user_tenant_access_user_id on public.user_tenant_access(user_id);
create index if not exists idx_user_tenant_access_tenant_id on public.user_tenant_access(tenant_id);

-- 3. RLS policies for user_tenant_access
alter table public.user_tenant_access enable row level security;

-- Users can see their own tenant access records
create policy "Users can view their own tenant access"
  on public.user_tenant_access
  for select
  using (user_id = (select id from public.users where auth_user_id = auth.uid()));

-- Super admins and managers can manage tenant access
create policy "Admins can manage tenant access"
  on public.user_tenant_access
  for all
  using (
    exists (
      select 1 from public.users
      where auth_user_id = auth.uid()
      and role in ('super_admin', 'manager')
    )
  );

-- 4. Update RLS on tenants table - users can see tenants they have access to
-- (Tenants table may not have RLS yet - enable it)
alter table public.tenants enable row level security;

-- Users can see their own tenant
create policy "Users can view their own tenant"
  on public.tenants
  for select
  using (
    id = (select tenant_id from public.users where auth_user_id = auth.uid())
    or
    id in (select tenant_id from public.user_tenant_access where user_id = (select id from public.users where auth_user_id = auth.uid()))
  );

-- Super admins can see all tenants
create policy "Super admins can view all tenants"
  on public.tenants
  for select
  using (
    exists (
      select 1 from public.users
      where auth_user_id = auth.uid()
      and role = 'super_admin'
    )
  );

-- Super admins can manage tenants
create policy "Super admins can manage tenants"
  on public.tenants
  for all
  using (
    exists (
      select 1 from public.users
      where auth_user_id = auth.uid()
      and role = 'super_admin'
    )
  );

-- 5. Backfill: For every existing user, create a user_tenant_access record 
-- for their primary tenant (so they appear in the switcher)
insert into public.user_tenant_access (user_id, tenant_id, role)
select id, tenant_id, 
  case 
    when role = 'super_admin' then 'owner'
    when role = 'manager' then 'admin'
    else 'member'
  end
from public.users
where tenant_id is not null
on conflict (user_id, tenant_id) do nothing;
