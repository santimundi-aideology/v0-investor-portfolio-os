-- Migration: Property Intake History
-- Track property intake actions for usage metrics and auditing

create table if not exists public.property_intake_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  listing_id uuid references public.listings(id) on delete set null,
  action text not null, -- 'ai_evaluation', 'portal_scrape', 'offplan_analysis', 'manual_create'
  details jsonb,
  timestamp timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_property_intake_history_tenant_id on public.property_intake_history(tenant_id);
create index if not exists idx_property_intake_history_action on public.property_intake_history(action);
create index if not exists idx_property_intake_history_timestamp on public.property_intake_history(timestamp desc);
create index if not exists idx_property_intake_history_tenant_action_timestamp 
  on public.property_intake_history(tenant_id, action, timestamp desc);

-- RLS policies
alter table public.property_intake_history enable row level security;

-- Users can see history for their own tenant
create policy "Users can view their tenant's intake history"
  on public.property_intake_history
  for select
  using (
    tenant_id = (select tenant_id from public.users where auth_user_id = auth.uid())
  );

-- Super admins can see all
create policy "Super admins can view all intake history"
  on public.property_intake_history
  for select
  using (
    exists (
      select 1 from public.users
      where auth_user_id = auth.uid()
      and role = 'super_admin'
    )
  );

-- Insert policy for internal roles
create policy "Internal roles can insert intake history"
  on public.property_intake_history
  for insert
  with check (
    exists (
      select 1 from public.users
      where auth_user_id = auth.uid()
      and tenant_id = property_intake_history.tenant_id
      and role in ('super_admin', 'manager', 'agent')
    )
  );

-- Create a helper function to log intake actions
create or replace function public.log_property_intake_action(
  p_tenant_id uuid,
  p_user_id uuid,
  p_listing_id uuid,
  p_action text,
  p_details jsonb default null
) returns uuid as $$
declare
  v_id uuid;
begin
  insert into public.property_intake_history (tenant_id, user_id, listing_id, action, details)
  values (p_tenant_id, p_user_id, p_listing_id, p_action, p_details)
  returning id into v_id;
  
  return v_id;
end;
$$ language plpgsql security definer;
