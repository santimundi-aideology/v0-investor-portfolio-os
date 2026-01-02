-- Migration: Market Signals (raw ingestion -> snapshots -> signals -> targets -> notifications)
-- IMPORTANT: Market Signals must ONLY read from snapshot tables:
--   - market_metric_snapshot
--   - portal_listing_snapshot
-- Raw ingestion tables are inputs to snapshot computation ONLY.

create extension if not exists pgcrypto;

-- -----------------------------
-- RAW INGESTION TABLES
-- -----------------------------

-- DLD transactions (sales)
create table if not exists public.raw_dld_transactions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.tenants(id) on delete cascade,
  external_id text not null,
  transaction_date date not null,
  geo_type text not null,
  geo_id text not null,
  geo_name text,
  segment text not null, -- e.g. "2BR", "Office", "Villa"
  sale_price numeric not null,
  area_sqft numeric,
  currency text default 'AED',
  metadata jsonb,
  ingested_at timestamptz not null default now(),
  unique (org_id, external_id)
);
create index if not exists raw_dld_transactions_org_idx on public.raw_dld_transactions(org_id);
create index if not exists raw_dld_transactions_date_idx on public.raw_dld_transactions(transaction_date desc);

-- Ejari contracts (rental)
create table if not exists public.raw_ejari_contracts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.tenants(id) on delete cascade,
  external_id text not null,
  contract_start date not null,
  contract_end date,
  geo_type text not null,
  geo_id text not null,
  geo_name text,
  segment text not null,
  annual_rent numeric not null,
  currency text default 'AED',
  metadata jsonb,
  ingested_at timestamptz not null default now(),
  unique (org_id, external_id)
);
create index if not exists raw_ejari_contracts_org_idx on public.raw_ejari_contracts(org_id);
create index if not exists raw_ejari_contracts_start_idx on public.raw_ejari_contracts(contract_start desc);

-- Portal listings (Bayut/Property Finder surface data)
create table if not exists public.raw_portal_listings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.tenants(id) on delete cascade,
  portal text not null, -- e.g. "Bayut", "PropertyFinder"
  listing_id text not null,
  as_of_date date not null,
  geo_type text not null,
  geo_id text not null,
  geo_name text,
  segment text not null,
  is_active boolean not null default true,
  price numeric,
  had_price_cut boolean not null default false,
  days_on_market integer,
  metadata jsonb,
  ingested_at timestamptz not null default now(),
  unique (org_id, portal, listing_id, as_of_date)
);
create index if not exists raw_portal_listings_org_idx on public.raw_portal_listings(org_id);
create index if not exists raw_portal_listings_asof_idx on public.raw_portal_listings(as_of_date desc);

-- -----------------------------
-- SNAPSHOT TABLES (ONLY INPUT TO SIGNALS)
-- -----------------------------

-- Official/authoritative metrics snapshots (truth)
create table if not exists public.market_metric_snapshot (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.tenants(id) on delete cascade,
  source text not null, -- e.g. "DLD", "Ejari", "derived"
  metric text not null, -- e.g. "median_price_psf", "median_rent_annual", "gross_yield"
  geo_type text not null,
  geo_id text not null,
  geo_name text,
  segment text not null,
  timeframe text not null, -- e.g. "QoQ"
  window_start date not null,
  window_end date not null,
  value numeric not null,
  sample_size integer,
  evidence jsonb,
  created_at timestamptz not null default now(),
  unique (org_id, source, metric, geo_type, geo_id, segment, timeframe, window_end)
);

-- HARDENING / BACKFILL (idempotent):
-- If `market_metric_snapshot` existed before this migration, it may be missing columns like `evidence`.
-- `create table if not exists` won't add missing columns, and snapshot upserts will fail.
alter table if exists public.market_metric_snapshot
  add column if not exists timeframe text not null default 'QoQ',
  add column if not exists sample_size integer,
  add column if not exists evidence jsonb,
  add column if not exists created_at timestamptz not null default now();

-- Ensure the upsert key exists even if the old table did not have a UNIQUE constraint.
create unique index if not exists market_metric_snapshot_upsert_uidx
  on public.market_metric_snapshot(org_id, source, metric, geo_type, geo_id, segment, timeframe, window_end);
create index if not exists market_metric_snapshot_org_idx on public.market_metric_snapshot(org_id);
create index if not exists market_metric_snapshot_window_idx on public.market_metric_snapshot(window_end desc);
create index if not exists market_metric_snapshot_metric_idx on public.market_metric_snapshot(metric);

-- Portal surface snapshots (inventory)
create table if not exists public.portal_listing_snapshot (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.tenants(id) on delete cascade,
  portal text not null,
  geo_type text not null,
  geo_id text not null,
  geo_name text,
  segment text not null,
  timeframe text not null, -- e.g. "WoW"
  as_of_date date not null,
  active_listings integer not null default 0,
  price_cuts_count integer not null default 0,
  stale_listings_count integer not null default 0,
  evidence jsonb,
  created_at timestamptz not null default now(),
  unique (org_id, portal, geo_type, geo_id, segment, timeframe, as_of_date)
);

-- HARDENING / BACKFILL (idempotent):
-- If `portal_listing_snapshot` existed before this migration, it may be missing `timeframe`.
alter table if exists public.portal_listing_snapshot
  add column if not exists timeframe text not null default 'WoW',
  add column if not exists active_listings integer not null default 0,
  add column if not exists price_cuts_count integer not null default 0,
  add column if not exists stale_listings_count integer not null default 0,
  add column if not exists evidence jsonb,
  add column if not exists created_at timestamptz not null default now();

create unique index if not exists portal_listing_snapshot_upsert_uidx
  on public.portal_listing_snapshot(org_id, portal, geo_type, geo_id, segment, timeframe, as_of_date);
create index if not exists portal_listing_snapshot_org_idx on public.portal_listing_snapshot(org_id);
create index if not exists portal_listing_snapshot_date_idx on public.portal_listing_snapshot(as_of_date desc);

-- -----------------------------
-- SIGNALS + TARGETS
-- -----------------------------

create table if not exists public.market_signal (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.tenants(id) on delete cascade,
  source_type text not null, -- "official" | "portal"
  source text not null,
  type text not null,
  severity text not null default 'info', -- "info" | "watch" | "urgent"
  status text not null default 'new', -- "new" | "acknowledged" | "dismissed" | "routed"
  geo_type text not null,
  geo_id text not null,
  geo_name text,
  segment text not null,
  metric text not null,
  timeframe text not null,
  current_value numeric not null,
  prev_value numeric,
  delta_value numeric,
  delta_pct numeric,
  confidence_score numeric,
  evidence jsonb,
  signal_key text not null unique,
  acknowledged_at timestamptz,
  acknowledged_by uuid references public.users(id),
  dismissed_at timestamptz,
  dismissed_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- HARDENING / BACKFILL (idempotent):
-- If `market_signal` existed before this migration (older scaffold), it may be missing columns like `status`.
-- `create table if not exists` won't add those columns, and index creation below would fail.
alter table if exists public.market_signal
  add column if not exists severity text not null default 'info',
  add column if not exists status text not null default 'new',
  add column if not exists evidence jsonb,
  add column if not exists acknowledged_at timestamptz,
  add column if not exists acknowledged_by uuid references public.users(id),
  add column if not exists dismissed_at timestamptz,
  add column if not exists dismissed_by uuid references public.users(id),
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- Ensure the upsert key exists even if the old table did not have a UNIQUE constraint on `signal_key`.
create unique index if not exists market_signal_signal_key_uidx on public.market_signal(signal_key);
create index if not exists market_signal_org_idx on public.market_signal(org_id);
create index if not exists market_signal_created_idx on public.market_signal(created_at desc);
create index if not exists market_signal_status_idx on public.market_signal(status);
create index if not exists market_signal_type_idx on public.market_signal(type);

create table if not exists public.market_signal_target (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.tenants(id) on delete cascade,
  signal_id uuid not null references public.market_signal(id) on delete cascade,
  investor_id uuid not null references public.investors(id) on delete cascade,
  relevance_score numeric not null,
  reason jsonb,
  status text not null default 'new', -- "new" | "sent" | "viewed" | "dismissed"
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, signal_id, investor_id)
);

-- HARDENING / BACKFILL (idempotent): same idea as `market_signal`.
alter table if exists public.market_signal_target
  add column if not exists reason jsonb,
  add column if not exists status text not null default 'new',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists market_signal_target_org_signal_investor_uidx
  on public.market_signal_target(org_id, signal_id, investor_id);
create index if not exists market_signal_target_org_idx on public.market_signal_target(org_id);
create index if not exists market_signal_target_signal_idx on public.market_signal_target(signal_id);
create index if not exists market_signal_target_investor_idx on public.market_signal_target(investor_id);
create index if not exists market_signal_target_status_idx on public.market_signal_target(status);

-- -----------------------------
-- NOTIFICATIONS (pipeline output)
-- -----------------------------

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.tenants(id) on delete cascade,
  recipient_user_id uuid not null references public.users(id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  title text not null,
  body text not null,
  notification_key text unique,
  metadata jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_org_idx on public.notifications(org_id);
create index if not exists notifications_recipient_idx on public.notifications(recipient_user_id);
create index if not exists notifications_created_idx on public.notifications(created_at desc);


