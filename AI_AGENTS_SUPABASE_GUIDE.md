# AI Agents with Supabase Integration Guide

This guide explains how the AI agents are integrated with the Supabase database to provide real-time, data-driven insights.

## Overview

The AI agents now fetch real data from your Supabase database instead of using mock data. This includes:
- Investor profiles and mandates
- Property holdings and portfolio analytics
- Available listings
- Real-time portfolio performance metrics

## Architecture

### 1. Database Layer (`lib/db/`)

#### Holdings (`lib/db/holdings.ts`)
Manages property holdings (investor-owned properties):
- `getHoldingsByInvestor(investorId)` - Fetch all holdings for an investor
- `getHoldingsByTenant(tenantId)` - Fetch all holdings for a tenant
- `getPortfolioSummary(investorId)` - Calculate portfolio analytics
- `createHolding(input)` - Create a new holding
- `updateHolding(id, patch)` - Update a holding
- `deleteHolding(id)` - Delete a holding

#### Investors (`lib/db/investors.ts`)
Manages investor records:
- `getInvestorById(id)` - Fetch investor profile
- `listInvestorsByAgent(tenantId, agentId)` - List investors by agent
- `listInvestorsByTenant(tenantId)` - List all investors

#### Listings (`lib/db/listings.ts`)
Manages property listings:
- `listListings(tenantId)` - Fetch all available listings
- `getListingById(id)` - Fetch specific listing
- `createListingDb(input)` - Create new listing
- `updateListingDb(id, patch)` - Update listing

### 2. AI Context Layer (`lib/ai/context.ts`)

#### `buildAIContext(options)`
Builds comprehensive context for AI agents by fetching data from Supabase:

```typescript
const context = await buildAIContext({
  investorId: "investor-uuid",
  tenantId: "tenant-uuid",
  includePortfolio: true,     // Include holdings & analytics
  includeListings: true,      // Include available properties
  includeMarket: true,        // Include market benchmarks
  propertyId: "property-uuid" // Optional: specific property
})
```

Returns:
- Investor profile and mandate
- Portfolio summary (value, yield, occupancy, appreciation)
- Individual holding details
- Available listings
- Formatted context text for AI prompts

#### `buildPageContext(pagePath)`
Provides page-specific context based on current route:
- `/properties` - Portfolio view context
- `/real-estate` - Listings view context
- `/dashboard` - Dashboard context
- etc.

### 3. AI Agent API (`app/api/chat/route.ts`)

The chat API endpoint now:
1. Fetches real investor data from Supabase
2. Builds comprehensive AI context with portfolio analytics
3. Generates responses based on actual holdings and listings
4. Provides personalized recommendations

#### Request Format
```json
{
  "agentId": "real_estate_advisor",
  "messages": [
    { "role": "user", "content": "What's my portfolio yield?" }
  ],
  "pagePath": "/properties",
  "scopedInvestorId": "investor-uuid",
  "tenantId": "tenant-uuid",
  "propertyId": "property-uuid" // optional
}
```

#### Response Format
```json
{
  "agentId": "real_estate_advisor",
  "systemPrompt": "You are AI Real Estate Advisor...",
  "message": {
    "role": "assistant",
    "content": "Here's your current portfolio analysis..."
  }
}
```

### 4. Agent Configuration (`lib/ai/agents.ts`)

Updated agent personas to acknowledge database integration:
- `real_estate_advisor` - Now references "real-time portfolio and market data"

## Database Schema

### Holdings Table
The new `holdings` table tracks investor property portfolios:

```sql
create table public.holdings (
  id uuid primary key,
  tenant_id uuid references tenants(id),
  investor_id uuid references investors(id),
  listing_id uuid references listings(id),
  purchase_price numeric,
  purchase_date date,
  current_value numeric,
  monthly_rent numeric,
  occupancy_rate numeric, -- 0.0 to 1.0
  annual_expenses numeric,
  created_at timestamptz,
  updated_at timestamptz
);
```

See: `supabase/migrations/003_holdings.sql`

## Setup Instructions

### 1. Apply Database Migrations

Run the holdings migration:
```bash
# Using Supabase CLI
supabase migration up

# Or apply manually via Supabase Studio
# Run the SQL from: supabase/migrations/003_holdings.sql
```

### 2. Configure Environment Variables

Ensure these are set in `.env.local`:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Seed Sample Data (Optional)

Create sample holdings for testing:
```sql
-- Insert sample tenant
INSERT INTO tenants (id, name) VALUES 
  ('default-tenant-id', 'Demo Tenant');

-- Insert sample investor
INSERT INTO investors (id, tenant_id, name, email, assigned_agent_id, mandate)
VALUES (
  'default-investor-id',
  'default-tenant-id',
  'John Investor',
  'john@example.com',
  'agent-id-here',
  '{"propertyTypes": ["residential"], "preferredAreas": ["Dubai Marina", "Downtown Dubai"], "yieldTarget": "8-10%", "minInvestment": 5000000, "maxInvestment": 15000000}'::jsonb
);

-- Insert sample listings
INSERT INTO listings (tenant_id, title, area, type, status, price, size, bedrooms, bathrooms, expected_rent)
VALUES 
  ('default-tenant-id', 'Luxury Marina Apartment', 'Dubai Marina', 'residential', 'available', 8500000, 2000, 3, 3, 75000),
  ('default-tenant-id', 'Downtown Penthouse', 'Downtown Dubai', 'residential', 'available', 12000000, 3000, 4, 4, 95000);

-- Insert sample holdings
INSERT INTO holdings (tenant_id, investor_id, listing_id, purchase_price, purchase_date, current_value, monthly_rent, occupancy_rate, annual_expenses)
SELECT 
  'default-tenant-id',
  'default-investor-id',
  id,
  price * 0.95, -- Purchased at 5% discount
  '2024-01-15',
  price,
  expected_rent,
  0.95,
  expected_rent * 12 * 0.15 -- 15% expense ratio
FROM listings 
WHERE area = 'Dubai Marina'
LIMIT 1;
```

## Usage Examples

### Example 1: Portfolio Analysis
```typescript
// User asks: "What's my portfolio yield?"
// AI fetches real holdings from Supabase
// Calculates: (annual_net_rent / current_value) * 100
// Returns: "Your avg net yield: 8.5% • Occupancy: 95.0%"
```

### Example 2: Investment Opportunities
```typescript
// User asks: "Show me investment opportunities"
// AI fetches:
//   - Investor's mandate (preferred areas, property types, budget)
//   - Available listings from database
//   - Filters by mandate criteria
// Returns: Top 3 matching properties with yield estimates
```

### Example 3: Exit Strategy
```typescript
// User asks: "Should I sell any properties?"
// AI fetches:
//   - All holdings with occupancy rates
//   - Current vs purchase prices
// Identifies: Low performers (<85% occupancy)
// Returns: Sell recommendations with reasoning
```

## AI Response Intelligence

The AI advisor now provides:

### Portfolio Insights (from real data)
- Total portfolio value
- Appreciation percentage (current vs purchase)
- Average yield across holdings
- Average occupancy rate
- Monthly/annual net rental income

### Top Performers (calculated)
- Properties sorted by yield
- Includes property name, area, yield percentage
- Based on actual rent, expenses, and occupancy

### Opportunities (filtered)
- Listings matching investor mandate
- Filtered by preferred areas
- Filtered by property types
- Filtered by budget range
- Yield estimates based on expected rent

### Market Comparisons
- Your yield vs Dubai average (7-9%)
- Your occupancy vs market average (88-94%)
- Performance indicators (above/below average)

## Error Handling

The system gracefully handles:
- Missing holdings (returns "No properties yet" message)
- Missing tenant/investor IDs (uses defaults)
- Database connection issues (returns error message)
- Missing tables (returns empty arrays with console warnings)

## Testing

### Test the Integration

1. **Test with empty portfolio:**
   ```bash
   curl -X POST http://localhost:3000/api/chat \
     -H "Content-Type: application/json" \
     -d '{
       "agentId": "real_estate_advisor",
       "messages": [{"role": "user", "content": "Show my portfolio"}],
       "scopedInvestorId": "test-investor",
       "tenantId": "test-tenant"
     }'
   ```

2. **Test with portfolio data:**
   - First, seed sample holdings (see above)
   - Then query portfolio metrics
   ```bash
   curl -X POST http://localhost:3000/api/chat \
     -H "Content-Type: application/json" \
     -d '{
       "agentId": "real_estate_advisor",
       "messages": [{"role": "user", "content": "What is my yield?"}],
       "scopedInvestorId": "default-investor-id",
       "tenantId": "default-tenant-id"
     }'
   ```

3. **Test opportunity matching:**
   ```bash
   curl -X POST http://localhost:3000/api/chat \
     -H "Content-Type: application/json" \
     -d '{
       "agentId": "real_estate_advisor",
       "messages": [{"role": "user", "content": "Show me investment opportunities"}],
       "scopedInvestorId": "default-investor-id",
       "tenantId": "default-tenant-id"
     }'
   ```

## Future Enhancements

### Recommended Improvements
1. **Real-time Market Data Integration**
   - Connect to property market APIs
   - Track historical price trends
   - Compare to comp properties

2. **Advanced Analytics**
   - Cash-on-cash return calculations
   - IRR projections
   - Risk scoring algorithms

3. **Recommendation Engine**
   - Machine learning for property matching
   - Collaborative filtering based on similar investors
   - Predictive yield modeling

4. **Multi-tenancy Support**
   - Tenant-specific market data
   - Custom mandate templates
   - Tenant branding for AI responses

5. **Audit Trail**
   - Track all AI recommendations
   - Monitor decision outcomes
   - Learn from investor feedback

## Troubleshooting

### "Table doesn't exist" warnings
Run the migration: `supabase/migrations/003_holdings.sql`

### "No portfolio data" responses
1. Check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
2. Verify investor ID exists in database
3. Check that holdings exist for that investor

### TypeScript errors
```bash
npm run type-check
# or
pnpm type-check
```

### Database connection issues
- Verify Supabase project is running
- Check service role key has proper permissions
- Ensure RLS policies allow service role access

## API Reference

### Database Functions

```typescript
// Holdings
import { 
  getHoldingsByInvestor, 
  getPortfolioSummary, 
  createHolding 
} from "@/lib/db/holdings"

// Investors
import { 
  getInvestorById, 
  listInvestorsByTenant 
} from "@/lib/db/investors"

// Listings
import { 
  listListings, 
  getListingById 
} from "@/lib/db/listings"
```

### AI Context

```typescript
import { buildAIContext, buildPageContext } from "@/lib/ai/context"

const context = await buildAIContext({
  investorId: string
  tenantId: string
  includePortfolio?: boolean
  includeListings?: boolean
  includeMarket?: boolean
  propertyId?: string
})
```

### Types

```typescript
// Portfolio Summary
type PortfolioSummary = {
  investorId: string
  totalValue: number
  totalPurchaseCost: number
  totalMonthlyRental: number
  totalAnnualRental: number
  avgYieldPct: number
  avgOccupancyPct: number
  appreciationPct: number
  propertyCount: number
}

// Property Holding
type PropertyHolding = {
  id: string
  tenantId: string
  investorId: string
  listingId: string
  purchasePrice: number
  purchaseDate: string
  currentValue: number
  monthlyRent: number
  occupancyRate: number
  annualExpenses: number
  createdAt: string
  updatedAt: string
}
```

## Contributing

When adding new AI agent capabilities:
1. Add database queries to `lib/db/` modules
2. Extend `buildAIContext()` to include new data
3. Update `buildAdvisorResponse()` to handle new query types
4. Add tests for new functionality
5. Update this guide with examples

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review Supabase logs in dashboard
3. Check Next.js server logs
4. Open an issue with error details

---

**Last Updated:** December 30, 2025
**Version:** 1.0

