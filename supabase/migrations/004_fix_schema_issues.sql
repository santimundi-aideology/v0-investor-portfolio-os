-- Migration: Fix schema issues
-- 1. Drop orphaned notification (singular) table
-- 2. Create missing tasks table
-- 3. Add missing foreign key constraints

-- -----------------------------
-- 1. DROP ORPHANED TABLE
-- -----------------------------

-- The 'notification' (singular) table is a duplicate of 'notifications' (plural).
-- All application code uses 'notifications' (plural), so drop the orphaned one.
drop table if exists public.notification;

-- -----------------------------
-- 2. CREATE MISSING TASKS TABLE
-- -----------------------------

-- Task status and priority enums (safe/no-op if already exist)
do $$ begin
  create type public.task_status as enum ('open','in-progress','done');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.task_priority as enum ('low','medium','high');
exception when duplicate_object then null; end $$;

-- Create tasks table if not exists
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  title text not null,
  description text,
  status public.task_status not null default 'open',
  priority public.task_priority not null default 'medium',
  due_date date,
  assignee_id uuid references public.users(id) on delete set null,
  investor_id uuid references public.investors(id) on delete set null,
  listing_id uuid references public.listings(id) on delete set null,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create indexes for performance
create index if not exists tasks_tenant_idx on public.tasks(tenant_id);
create index if not exists tasks_assignee_idx on public.tasks(assignee_id);
create index if not exists tasks_investor_idx on public.tasks(investor_id);
create index if not exists tasks_status_idx on public.tasks(status);
create index if not exists tasks_due_date_idx on public.tasks(due_date);

-- Add comments
comment on table public.tasks is 'Task management for agents and team members';
comment on column public.tasks.status is 'Task status: open, in-progress, done';
comment on column public.tasks.priority is 'Task priority: low, medium, high';

-- -----------------------------
-- 3. ADD MISSING FOREIGN KEY CONSTRAINTS
-- -----------------------------

-- Ensure market_metric_snapshot has FK to tenants if missing
-- Note: Using DO block to handle case where constraint may already exist
do $$
begin
  if not exists (
    select 1 from pg_constraint 
    where conname = 'market_metric_snapshot_org_id_fkey'
  ) then
    alter table public.market_metric_snapshot
      add constraint market_metric_snapshot_org_id_fkey
      foreign key (org_id) references public.tenants(id) on delete cascade;
  end if;
exception when others then
  null; -- Ignore if constraint exists or there's another issue
end $$;

-- Ensure portal_listing_snapshot has FK to tenants if missing
do $$
begin
  if not exists (
    select 1 from pg_constraint 
    where conname = 'portal_listing_snapshot_org_id_fkey'
  ) then
    alter table public.portal_listing_snapshot
      add constraint portal_listing_snapshot_org_id_fkey
      foreign key (org_id) references public.tenants(id) on delete cascade;
  end if;
exception when others then
  null;
end $$;

-- Ensure market_signal has FK to tenants if missing
do $$
begin
  if not exists (
    select 1 from pg_constraint 
    where conname = 'market_signal_org_id_fkey'
  ) then
    alter table public.market_signal
      add constraint market_signal_org_id_fkey
      foreign key (org_id) references public.tenants(id) on delete cascade;
  end if;
exception when others then
  null;
end $$;

-- Ensure market_signal_target has proper FKs if missing
do $$
begin
  if not exists (
    select 1 from pg_constraint 
    where conname = 'market_signal_target_org_id_fkey'
  ) then
    alter table public.market_signal_target
      add constraint market_signal_target_org_id_fkey
      foreign key (org_id) references public.tenants(id) on delete cascade;
  end if;
exception when others then
  null;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint 
    where conname = 'market_signal_target_investor_id_fkey'
  ) then
    alter table public.market_signal_target
      add constraint market_signal_target_investor_id_fkey
      foreign key (investor_id) references public.investors(id) on delete cascade;
  end if;
exception when others then
  null;
end $$;

