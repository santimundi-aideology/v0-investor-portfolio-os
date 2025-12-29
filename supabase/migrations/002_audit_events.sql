-- Migration: Audit Events table
-- Minimal schema aligned with V1.1 spec (no raw prompt storage).

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

