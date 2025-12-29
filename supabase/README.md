## Supabase DB setup (schema + seed)

This folder contains SQL generated from the app’s existing mock data:
- `lib/mock-data.ts`
- `lib/mock-session.ts`
- `lib/types.ts`

### Option A: Supabase Dashboard (fastest)

1. Open your Supabase project.
2. Go to **SQL Editor** → **New query**.
3. Paste and run `supabase/schema.sql`.
4. Paste and run `supabase/seed.sql`.

### Option B: Supabase CLI (migrations)

If you already use the Supabase CLI in this repo, you can copy these files into your migrations workflow.
Typical flow:
- Create a new migration file and paste the contents of `schema.sql`.
- Create a seed file (or a second migration) and paste the contents of `seed.sql`.

### Notes

- IDs are stored as `text` (e.g. `inv-1`, `prop-3`) to match the current mock data.
- `investors.mandate` is stored as `jsonb` to match the nested TS object shape.
- Row Level Security (RLS) is **not** enabled in these scripts yet. If you want multi-tenant org-based security, tell me your desired auth model and I’ll add RLS policies.


