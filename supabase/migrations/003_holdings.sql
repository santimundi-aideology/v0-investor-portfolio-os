-- Holdings table for investor property portfolios
-- Tracks properties that investors have purchased/own

create table if not exists public.holdings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  investor_id uuid not null references public.investors(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete restrict,
  purchase_price numeric not null,
  purchase_date date not null,
  current_value numeric not null,
  monthly_rent numeric not null default 0,
  occupancy_rate numeric not null default 1.0 check (occupancy_rate >= 0 and occupancy_rate <= 1),
  annual_expenses numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists holdings_tenant_idx on public.holdings(tenant_id);
create index if not exists holdings_investor_idx on public.holdings(investor_id);
create index if not exists holdings_listing_idx on public.holdings(listing_id);
create index if not exists holdings_purchase_date_idx on public.holdings(purchase_date desc);

-- Ensure investor and listing are in the same tenant
create unique index if not exists holdings_investor_listing_unique 
  on public.holdings(investor_id, listing_id);

-- Comments for documentation
comment on table public.holdings is 'Property holdings/investments owned by investors';
comment on column public.holdings.purchase_price is 'Original purchase price of the property';
comment on column public.holdings.current_value is 'Current market value of the property';
comment on column public.holdings.monthly_rent is 'Monthly rental income from the property';
comment on column public.holdings.occupancy_rate is 'Occupancy rate as decimal (1.0 = 100% occupied)';
comment on column public.holdings.annual_expenses is 'Annual operating expenses for the property';

