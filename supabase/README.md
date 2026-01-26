## Supabase Database Setup

This folder contains the database schema and migrations for the Vantage.

### Database Structure

The database uses a multi-tenant architecture with the following core tables:

| Table | Description | Row Count |
|-------|-------------|-----------|
| `tenants` | Organizations/companies | Multi-tenant root |
| `users` | Platform users (agents, managers, investors) | FK to tenants |
| `investors` | Investor profiles with mandates | FK to tenants, users |
| `listings` | Property listings | FK to tenants |
| `holdings` | Investor property holdings | FK to investors, listings |
| `tasks` | Task management | FK to users, investors, listings |
| `memos` | Investment memos | FK to investors, listings |
| `shortlists` / `shortlist_items` | Property shortlists | FK to investors, listings |
| `underwritings` / `underwriting_comps` | Financial analysis | FK to listings |
| `notifications` | User notifications | FK to users |
| `audit_events` | Activity audit log | FK to tenants |
| `market_signal` / `market_signal_target` | Market intelligence | FK to tenants, investors |
| `market_metric_snapshot` / `portal_listing_snapshot` | Market data snapshots | FK to tenants |
| `raw_*` tables | Raw data ingestion | For signal pipeline |

### Migrations

Run migrations in order:

1. `001_tenancy_rbac.sql` - Core tables: tenants, users, investors, listings, memos, etc.
2. `002_audit_events.sql` - Audit log table
3. `003_holdings.sql` - Investor holdings/portfolio
4. `003_market_signals.sql` - Market signals pipeline tables
5. `004_fix_schema_issues.sql` - Tasks table, cleanup, FK constraints

### Setup Options

#### Option A: Supabase Dashboard (fastest)

1. Open your Supabase project
2. Go to **SQL Editor** → **New query**
3. Run each migration file in order (001, 002, 003, 003, 004)
4. Optionally run `seed.sql` for sample data

#### Option B: Supabase CLI

```bash
# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
supabase db push
```

### Seed Data

The `seed.sql` file includes:
- 2 sample tenants (organizations)
- 3 users (agents/managers)
- 4 investors with investment mandates
- 5 property listings
- 3 property holdings
- 5 sample tasks
- Shortlists and memos

### Environment Variables

Required in `.env.local`:

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### TypeScript Integration

Database modules are in `lib/db/`:
- `client.ts` - Supabase client singleton
- `investors.ts` - Investor CRUD operations
- `listings.ts` - Listing CRUD operations
- `holdings.ts` - Holdings/portfolio operations
- `tasks.ts` - Task management operations
- `notifications.ts` - Notification operations
- `market-signals.ts` - Market signal operations
- And more...

### Security Notes

- **Row Level Security (RLS)** is currently disabled. Enable RLS policies before production.
- All data access should go through `lib/db/` modules which use tenant scoping.
- The service role key should never be exposed to the client.

### ID Format

- All IDs use UUID format (e.g., `11111111-1111-1111-1111-111111111111`)
- Seed data uses predictable UUIDs for easy reference
