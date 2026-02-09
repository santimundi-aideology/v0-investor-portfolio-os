# Subscription Plans - Implementation Summary

This document provides an overview of the subscription plan system integrated into the platform.

## What Was Implemented

### 1. Core Plan System

**Files Created:**
- `lib/plans/config.ts` - Plan definitions, limits, features, and pricing
- `lib/plans/usage.ts` - Usage tracking and limit checking
- `lib/plans/README.md` - Comprehensive documentation

**Plans Defined:**
- **Essential** (starter): $149/mo - 25 properties, 50 investors, 2 users, 10 memos/mo
- **Professional** (pro): $599/mo - Unlimited properties & investors, 10 users, 50 memos/mo
- **Enterprise**: Custom - Unlimited everything, white-labeling, API access

### 2. UI Components

**Created** (`components/plans/`):
- `PlanBadge` - Shows plan tier with styled badge and icon
- `UpgradePrompt` - Modal dialog prompting upgrade when limits are hit
- `UsageIndicator` - Progress bar showing current usage vs limits
- `PlanComparison` - Full pricing/feature comparison table

### 3. API Endpoints

**Created:**
- `GET /api/plans/usage` - Returns current usage stats for tenant
- `POST /api/plans/check` - Checks if action is allowed based on limits
- `POST /api/properties` - Example endpoint with property limit checking

### 4. Database

**Migration Created:** `020_property_intake_history.sql`
- Table to track property intake actions for usage metrics
- Helper function `log_property_intake_action()` for easy logging
- Indexes for performance
- RLS policies for security

### 5. Integrations

**Updated Files:**
- `app/(app)/settings/page.tsx` - Added "Billing & Plan" tab with usage dashboard
- `app/(app)/admin/page.tsx` - Uses PlanBadge for tenant list
- `components/app-shell/topbar.tsx` - Shows plan badge in org switcher
- `app/api/property-intake/evaluate/route.ts` - Checks AI evaluation limits

### 6. Hooks

**Created:** `hooks/use-plan-limits.ts`
- `usePlanLimits()` - Check limits from client components
- `useUsageStats()` - Get usage statistics

### 7. Updated UI Components

- `components/ui/progress.tsx` - Added support for custom indicator colors
- `components/ui/alert.tsx` - Created alert component for warnings

## How It Works

### Limit Checking Flow

1. **User attempts action** (e.g., create property, run AI evaluation)
2. **API endpoint** calls `canAdd*()` or `checkPlanLimit()` from `lib/plans/usage.ts`
3. **System queries** database for current usage and compares to plan limits
4. **If over limit**, returns 429 error with limit details
5. **Client shows** upgrade prompt with plan comparison
6. **If allowed**, action proceeds and usage is logged

### Usage Tracking

All tracked actions are logged to `property_intake_history` table:
- `ai_evaluation` - AI property evaluations
- `manual_create` - Manual property creation
- `portal_scrape` - Portal property import
- `offplan_analysis` - Off-plan brochure analysis

Monthly limits (memos, AI evaluations) are calculated by querying records since the 1st of the current month.

## Settings Page

The **Settings > Billing & Plan** tab shows:
- Current plan badge and description
- Real-time usage indicators with progress bars
- Warnings when approaching or at limits
- Full plan comparison table
- Upgrade buttons

## Admin Panel

The **Admin Panel** now displays plan badges for all tenants in the organization list, making it easy to see which plan each tenant is on.

## Upgrade Flow

When a user hits a limit:

1. **Limit detected** by API or client-side check
2. **UpgradePrompt modal** opens automatically
3. **Shows** current limitation and suggested upgrade
4. **Displays features** of higher tier plan
5. **Button** opens plan comparison or contacts sales
6. **For Enterprise**: Opens email to sales@

## Example Usage

### Client-Side Limit Check

```typescript
import { usePlanLimits } from "@/hooks/use-plan-limits"
import { UpgradePrompt } from "@/components/plans/upgrade-prompt"

const { checkLimit } = usePlanLimits()
const [upgradeOpen, setUpgradeOpen] = useState(false)

const handleCreateProperty = async () => {
  const result = await checkLimit("properties")
  
  if (!result.allowed) {
    setUpgradeOpen(true)
    return
  }
  
  // Create property...
}
```

### Server-Side Limit Check

```typescript
const { data: tenant } = await supabase
  .from("tenants")
  .select("plan")
  .eq("id", tenantId)
  .single()

const canAdd = await canAddProperty(tenantId, tenant.plan)

if (!canAdd.allowed) {
  return NextResponse.json(
    { error: "Limit reached", limitReached: true },
    { status: 429 }
  )
}
```

## Feature Gating

Beyond limits, plans also gate features:

```typescript
import { canAccessFeature } from "@/lib/plans/config"

const hasOffPlan = canAccessFeature(plan, "offPlanBrochureAnalysis")

if (!hasOffPlan) {
  // Show upgrade prompt or hide feature
}
```

## Pricing

- **Essential**: $149/month or $1,490/year (save $298)
- **Professional**: $599/month or $5,990/year (save $1,198)
- **Enterprise**: Custom pricing (contact sales)

All prices configured in `lib/plans/config.ts` and can be easily updated.

## Recommendations

### For Essential Plan
- Perfect for solo agents or small teams (1-2 people)
- Limited properties (25) and investors (50)
- Manual property entry only
- Basic memos without AI

### For Professional Plan ⭐ Most Popular
- Unlimited properties and investors
- Full AI capabilities
- Portal scraping and off-plan analysis
- Market signals and insights
- Up to 10 team members

### For Enterprise Plan
- Everything in Pro
- Unlimited users
- White-labeling
- API access
- Custom integrations
- Dedicated support

## What Happens When Limits Are Hit

### Properties
- Can't create new properties
- Can still view/edit existing ones
- Upgrade prompt suggests Pro plan

### Investors
- Can't add new investors
- Existing investors remain accessible
- Upgrade prompt suggests Pro plan

### Users
- Can't invite new team members
- Current users keep access
- Upgrade prompt suggests increasing user limit

### Monthly Limits (Memos, AI Evaluations)
- Tracked per calendar month
- Reset on 1st of each month
- Shows usage in billing page
- Hard limit enforced by API

## Future Enhancements

Potential additions:
- Stripe integration for self-service upgrades
- Overage billing for monthly limits
- Email notifications at 80% usage
- Custom enterprise plans
- Annual usage reports
- Per-feature usage analytics

## Testing

To test the plan limits:

1. Create a test tenant with "starter" plan
2. Add properties until you hit the limit (25)
3. Try to add one more - should see upgrade prompt
4. Switch to "pro" plan via admin panel
5. Verify limits are now unlimited

## Support

For questions about implementing plan checks in new features, see:
- `lib/plans/README.md` - Detailed technical documentation
- Example implementations in:
  - `/api/properties/route.ts`
  - `/api/property-intake/evaluate/route.ts`
  - Settings page billing tab
