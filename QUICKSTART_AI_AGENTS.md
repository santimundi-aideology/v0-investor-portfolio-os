# Quick Start: AI Agents with Supabase

Get your AI agents up and running with real database data in 5 minutes.

## Step 1: Apply Database Migration

Run the holdings table migration:

```bash
# Option A: Using Supabase CLI
supabase migration up

# Option B: Via Supabase Studio
# 1. Go to https://app.supabase.com
# 2. Select your project
# 3. Go to SQL Editor
# 4. Paste content from: supabase/migrations/003_holdings.sql
# 5. Click "Run"
```

## Step 2: Seed Sample Data

Load demo data to test the AI agents:

```bash
# Via Supabase Studio SQL Editor
# Paste content from: supabase/seed-holdings.sql
# Click "Run"
```

This creates:
- 1 demo tenant
- 1 demo agent
- 2 demo investors with mandates
- 7 property listings (3 sold, 4 available)
- 3 holdings across investors

## Step 3: Test the AI Agent

### Using the UI
1. Start your dev server: `pnpm dev`
2. Navigate to `/properties` or `/real-estate`
3. Open the AI chat widget (usually bottom-right)
4. Try these queries:
   - "What's my portfolio yield?"
   - "Show me investment opportunities"
   - "Should I sell any properties?"

### Using cURL
```bash
# Test with demo investor 1
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "real_estate_advisor",
    "messages": [
      {"role": "user", "content": "What is my portfolio yield?"}
    ],
    "scopedInvestorId": "demo-investor-001",
    "tenantId": "demo-tenant-001"
  }'
```

## Step 4: Verify Data Flow

Check that the AI is using real data:

1. **Check Holdings:**
```sql
SELECT * FROM holdings WHERE investor_id = 'demo-investor-001';
```

2. **Check Portfolio Summary:**
   - AI should report actual values from database
   - Total value: ~20.9M AED
   - Avg yield: ~8.5%
   - Avg occupancy: ~97%

3. **Check Recommendations:**
   - AI should match available listings to investor mandates
   - Filter by preferred areas (Dubai Marina, Downtown Dubai, Business Bay)
   - Calculate estimated yields

## Expected AI Responses

### Query: "What's my portfolio yield?"
```
Here's your current portfolio analysis:
- Portfolio value: AED 20,900,000 (appreciation 6.2%)
- Avg net yield: 8.47% • Occupancy: 97.0%
- Monthly net income: AED 129,500
```

### Query: "Show me investment opportunities"
```
Investment opportunities:
- Marina Towers 2BR Apartment (Dubai Marina): AED 6,500,000 - matches preferred area, est. yield 10.7%
- Business Bay Commercial Office (Business Bay): AED 9,200,000 - matches preferred area, matches property type, est. yield 10.7%
- Downtown Luxury Apartment (Downtown Dubai): AED 12,500,000 - matches preferred area, est. yield 9.1%
```

## Customization

### Add Your Own Data

```sql
-- Add your investor
INSERT INTO investors (tenant_id, name, email, assigned_agent_id, mandate)
VALUES (
  'demo-tenant-001',
  'Your Name',
  'you@example.com',
  'demo-agent-001',
  '{
    "propertyTypes": ["residential"],
    "preferredAreas": ["Dubai Marina"],
    "yieldTarget": "8-10%",
    "minInvestment": 5000000,
    "maxInvestment": 15000000
  }'::jsonb
);

-- Add holdings
INSERT INTO holdings (
  tenant_id, investor_id, listing_id,
  purchase_price, purchase_date, current_value,
  monthly_rent, occupancy_rate, annual_expenses
)
VALUES (
  'demo-tenant-001',
  'your-investor-id',
  'listing-id-here',
  8000000,
  '2024-01-01',
  8500000,
  70000,
  0.95,
  200000
);
```

### Modify AI Behavior

Edit `lib/ai/agents.ts` to customize the agent persona:
```typescript
personaPrompt: "You are a [custom persona]..."
```

Edit `app/api/chat/route.ts` to add new query handlers:
```typescript
if (q.includes("custom_query")) {
  // Your custom logic
}
```

## Troubleshooting

### "No portfolio data"
- Check investor ID exists in database
- Verify holdings exist for that investor
- Check `.env.local` has correct Supabase credentials

### "Table doesn't exist"
- Run migration: `supabase/migrations/003_holdings.sql`
- Check Supabase Dashboard > Database > Tables

### AI returns generic responses
- Verify `tenantId` and `scopedInvestorId` are correct
- Check server logs for errors
- Ensure Supabase service role key has proper permissions

## Next Steps

1. **Read Full Guide:** See `AI_AGENTS_SUPABASE_GUIDE.md` for detailed documentation
2. **Explore Database Functions:** Check `lib/db/holdings.ts` for all available queries
3. **Customize Context:** Modify `lib/ai/context.ts` to add more data to AI prompts
4. **Add More Agents:** Extend `lib/ai/agents.ts` with specialized agents

## Quick Reference

### Key Files
- `lib/db/holdings.ts` - Portfolio data queries
- `lib/ai/context.ts` - AI context builder
- `app/api/chat/route.ts` - Chat API endpoint
- `supabase/migrations/003_holdings.sql` - Holdings table schema

### Environment Variables
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
```

### Demo IDs
```
Tenant: demo-tenant-001
Agent: demo-agent-001
Investor 1: demo-investor-001
Investor 2: demo-investor-002
```

---

**Need Help?** Check `AI_AGENTS_SUPABASE_GUIDE.md` for comprehensive documentation.

