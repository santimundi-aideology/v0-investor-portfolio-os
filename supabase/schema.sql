-- Supabase schema for Vantage (v1.1)
-- Tenancy + RBAC foundations + domain shells

-- Enable useful extensions (safe/no-op if already enabled)
create extension if not exists pgcrypto;

-- Enums
do $$ begin
  create type public.platform_role as enum ('agent','manager','investor','super_admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.investor_status as enum ('active','pending','inactive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.property_type as enum ('residential','commercial','mixed-use','land');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.property_status as enum ('available','under-offer','sold','off-market');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.trust_status as enum ('verified','unknown','flagged');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.memo_state as enum ('draft','pending_review','ready','sent','opened','decided');
exception when duplicate_object then null; end $$;

-- Tenants
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Users (platform-level auth)
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id),
  name text not null,
  email text not null unique,
  role public.platform_role not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Investors
create table if not exists public.investors (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  name text not null,
  company text,
  email text,
  phone text,
  status public.investor_status not null default 'active',
  mandate jsonb,
  created_at timestamptz not null default now(),
  last_contact timestamptz,
  total_deals integer not null default 0,
  assigned_agent_id uuid not null references public.users(id),
  owner_user_id uuid references public.users(id),
  avatar text,
  unique (tenant_id, email)
);
create index if not exists investors_tenant_idx on public.investors(tenant_id);
create index if not exists investors_assigned_agent_idx on public.investors(assigned_agent_id);

-- Mandates (versioned)
create table if not exists public.mandates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  investor_id uuid not null references public.investors(id) on delete cascade,
  version integer not null,
  data jsonb not null,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  unique (investor_id, version)
);
create index if not exists mandates_tenant_idx on public.mandates(tenant_id);

-- Listings
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  title text not null,
  address text,
  area text,
  type public.property_type,
  status public.property_status not null default 'available',
  price numeric,
  size numeric,
  bedrooms integer,
  bathrooms integer,
  readiness text,
  developer text,
  expected_rent numeric,
  currency text,
  handover_date date,
  attachments jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists listings_tenant_idx on public.listings(tenant_id);
create index if not exists listings_area_idx on public.listings(area);

-- Shortlists
create table if not exists public.shortlists (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  investor_id uuid not null references public.investors(id) on delete cascade,
  agent_id uuid not null references public.users(id),
  mandate_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (investor_id)
);
create index if not exists shortlists_tenant_idx on public.shortlists(tenant_id);

create table if not exists public.shortlist_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  shortlist_id uuid not null references public.shortlists(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  match_score integer,
  match_explanation text,
  tradeoffs text[],
  agent_notes text,
  pinned boolean not null default false,
  rank integer not null default 0,
  added_at timestamptz not null default now(),
  added_by uuid references public.users(id),
  unique (shortlist_id, listing_id)
);
create index if not exists shortlist_items_tenant_idx on public.shortlist_items(tenant_id);
create index if not exists shortlist_items_shortlist_idx on public.shortlist_items(shortlist_id);

-- Underwriting
create table if not exists public.underwritings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  listing_id uuid references public.listings(id) on delete set null,
  inputs jsonb,
  scenarios jsonb,
  confidence text,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists underwritings_tenant_idx on public.underwritings(tenant_id);

create table if not exists public.underwriting_comps (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  underwriting_id uuid not null references public.underwritings(id) on delete cascade,
  description text not null,
  price numeric,
  price_per_sqft numeric,
  rent_per_year numeric,
  source text not null,
  source_detail text,
  observed_date date,
  attachment_id text,
  added_by uuid references public.users(id),
  added_at timestamptz not null default now()
);
create index if not exists underwriting_comps_tenant_idx on public.underwriting_comps(tenant_id);

-- Memos
create table if not exists public.memos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  investor_id uuid not null references public.investors(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null,
  underwriting_id uuid references public.underwritings(id) on delete set null,
  state public.memo_state not null default 'draft',
  current_version integer not null default 1,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists memos_tenant_idx on public.memos(tenant_id);
create index if not exists memos_investor_idx on public.memos(investor_id);

create table if not exists public.memo_versions (
  id uuid primary key default gen_random_uuid(),
  memo_id uuid not null references public.memos(id) on delete cascade,
  version integer not null,
  content jsonb,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  unique (memo_id, version)
);

-- Trust Records
create table if not exists public.trust_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  listing_id uuid not null references public.listings(id) on delete cascade,
  status public.trust_status not null default 'unknown',
  reason text,
  evidence_id text,
  verified_at timestamptz,
  verified_by uuid references public.users(id)
);
create index if not exists trust_records_tenant_idx on public.trust_records(tenant_id);

-- Decisions (investor approvals)
create table if not exists public.decisions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  memo_id uuid not null references public.memos(id) on delete cascade,
  investor_id uuid not null references public.investors(id) on delete cascade,
  decision_type text not null,
  reason_tags text[],
  condition_text text,
  deadline date,
  resolved_status text,
  resolved_by uuid references public.users(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists decisions_tenant_idx on public.decisions(tenant_id);

-- Messages (Q&A)
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  memo_id uuid not null references public.memos(id) on delete cascade,
  sender_id uuid references public.users(id),
  body text not null,
  version_context integer,
  created_at timestamptz not null default now()
);
create index if not exists messages_tenant_idx on public.messages(tenant_id);
create index if not exists messages_memo_idx on public.messages(memo_id);

-- Audit Events
create table if not exists public.audit_events (
  event_id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id),
  timestamp timestamptz not null default now(),
  actor_id uuid,
  actor_role public.platform_role,
  event_type text not null,
  object_type text,
  object_id uuid,
  metadata jsonb,
  ip_address text
);
create index if not exists audit_events_tenant_idx on public.audit_events(tenant_id);
create index if not exists audit_events_timestamp_idx on public.audit_events(timestamp desc);

-- Optional supporting tables preserved from earlier scaffold
do $$ begin
  create type public.task_status as enum ('open','in-progress','done');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.task_priority as enum ('low','medium','high');
exception when duplicate_object then null; end $$;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id),
  title text not null,
  description text,
  status public.task_status not null,
  priority public.task_priority not null,
  due_date date,
  assignee_id uuid references public.users(id) on delete set null,
  investor_id uuid references public.investors(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists tasks_tenant_idx on public.tasks(tenant_id);

