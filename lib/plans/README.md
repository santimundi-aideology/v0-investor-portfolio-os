# Subscription Plans System

This directory contains the subscription plan management system for the real estate investor portfolio platform.

## Overview

The platform supports three subscription tiers:
- **Essential** (Starter): For small teams and individual agents
- **Professional** (Pro): For growing brokerages and boutique firms
- **Enterprise**: For large brokerages, developers, and family offices

## Architecture

### Core Files

1. **`config.ts`** - Plan definitions, limits, features, and pricing
2. **`usage.ts`** - Usage tracking and limit checking functions
3. **API Routes**:
   - `/api/plans/usage` - Get current usage stats
   - `/api/plans/check` - Check if action is allowed

### UI Components

Located in `/components/plans/`:
- **`PlanBadge`** - Displays plan tier with icon and styling
- **`UpgradePrompt`** - Modal prompting users to upgrade when hitting limits
- **`UsageIndicator`** - Progress bar showing usage vs limits
- **`PlanComparison`** - Full pricing table for plan selection

### Hooks

- **`usePlanLimits()`** - Check plan limits from client components
- **`useUsageStats()`** - Get current usage statistics

## Plan Configuration

### Limits

```typescript
{
  starter: {
    maxProperties: 25,
    maxInvestors: 50,
    maxUsers: 2,
    maxMemos: 10,        // per month
    maxAIEvaluations: 5  // per month
  },
  pro: {
    maxProperties: -1,    // unlimited
    maxInvestors: -1,
    maxUsers: 10,
    maxMemos: 50,
    maxAIEvaluations: 50
  },
  enterprise: {
    // All unlimited (-1)
  }
}
```

### Features

Each plan has a feature matrix controlling access to:
- Property intake methods (manual, portal, off-plan)
- AI capabilities
- Collaboration features
- Integrations
- Branding options

Check access with:
```typescript
import { canAccessFeature } from "@/lib/plans/config"

const hasAI = canAccessFeature(plan, "aiEvaluatedMemos")
```

## Usage Tracking

### Database Schema

The system uses a `property_intake_history` table to track usage:

```sql
create table property_intake_history (
  id uuid primary key,
  tenant_id uuid not null,
  user_id uuid,
  listing_id uuid,
  action text not null, -- 'ai_evaluation', 'portal_scrape', etc.
  details jsonb,
  timestamp timestamptz default now()
);
```

### Helper Function

```sql
select log_property_intake_action(
  tenant_id,
  user_id,
  listing_id,
  'ai_evaluation',
  '{"property_title": "..."}'::jsonb
);
```

## Implementing Plan Checks

### Server-Side (API Routes)

```typescript
import { requireAuthContext } from "@/lib/auth/server"
import { canRunAIEvaluation } from "@/lib/plans/usage"
import { getSupabaseAdminClient } from "@/lib/db/client"

export async function POST(req: Request) {
  const ctx = await requireAuthContext(req)
  
  // Get tenant plan
  const { data: tenant } = await supabase
    .from("tenants")
    .select("plan")
    .eq("id", ctx.tenantId)
    .single()
  
  // Check limit
  const canEvaluate = await canRunAIEvaluation(ctx.tenantId, tenant.plan)
  
  if (!canEvaluate.allowed) {
    return NextResponse.json(
      { 
        error: "AI evaluation limit reached",
        limitReached: true,
        current: canEvaluate.current,
        limit: canEvaluate.limit,
        plan: tenant.plan,
      },
      { status: 429 }
    )
  }
  
  // ... perform action
  
  // Log usage
  await supabase.rpc("log_property_intake_action", {
    p_tenant_id: ctx.tenantId,
    p_user_id: ctx.userId,
    p_listing_id: listingId,
    p_action: "ai_evaluation",
    p_details: { /* ... */ },
  })
  
  return NextResponse.json({ success: true })
}
```

### Client-Side

```typescript
import { usePlanLimits } from "@/hooks/use-plan-limits"
import { UpgradePrompt } from "@/components/plans/upgrade-prompt"
import { useApp } from "@/components/providers/app-provider"

function MyComponent() {
  const { checkLimit } = usePlanLimits()
  const { currentOrg } = useApp()
  const [upgradePromptOpen, setUpgradePromptOpen] = useState(false)
  const [limitReason, setLimitReason] = useState("")
  
  const handleAction = async () => {
    // Check limit before performing action
    const result = await checkLimit("aiEvaluations")
    
    if (!result.allowed) {
      setLimitReason(result.reason || "Limit reached")
      setUpgradePromptOpen(true)
      return
    }
    
    // Perform action...
    const res = await fetch("/api/my-action", { method: "POST" })
    
    // Handle 429 (limit reached) from server
    if (res.status === 429) {
      const data = await res.json()
      setLimitReason(data.error)
      setUpgradePromptOpen(true)
      return
    }
  }
  
  return (
    <>
      <Button onClick={handleAction}>Run AI Evaluation</Button>
      
      <UpgradePrompt
        open={upgradePromptOpen}
        onOpenChange={setUpgradePromptOpen}
        currentPlan={currentOrg.plan}
        reason={limitReason}
        feature="AI Property Evaluations"
      />
    </>
  )
}
```

## Usage Dashboard

The **Settings > Billing & Plan** tab shows:
- Current plan details
- Usage indicators for all limits
- Warnings when approaching limits
- Plan comparison table
- Upgrade buttons

## Adding New Limits

1. Add limit to `PlanLimits` interface in `config.ts`
2. Update `PLAN_CONFIGS` with values
3. Add tracking query to `getTenantUsage()` in `usage.ts`
4. Create check function (e.g., `canAddProperty()`)
5. Integrate checks in relevant API routes
6. Add UI indicators where needed

## Best Practices

### When to Check Limits

- **Before expensive operations**: AI evaluations, API calls
- **Before creating resources**: Properties, investors, users
- **On resource lists**: Show upgrade prompts proactively

### Error Handling

Always handle limit errors gracefully:
```typescript
try {
  const result = await performAction()
} catch (err) {
  if (err.status === 429) {
    // Show upgrade prompt
  } else {
    // Handle other errors
  }
}
```

### User Experience

- Show upgrade prompts inline before actions fail
- Display usage indicators prominently
- Warn when at 80% of limit
- Make upgrade path clear and easy

## Pricing

Current pricing (editable in `config.ts`):
- **Essential**: $149/month ($1,490/year)
- **Professional**: $599/month ($5,990/year)
- **Enterprise**: Custom pricing

Annual billing includes ~17% discount (2 months free).

## Testing

Test plan limits:
1. Create test tenant with specific plan
2. Add test data to reach limits
3. Verify limit checks work
4. Test upgrade prompts display correctly
5. Verify usage tracking is accurate

## Future Enhancements

- [ ] Overage billing for Pro plan
- [ ] Self-service plan upgrades with Stripe
- [ ] Usage analytics dashboard
- [ ] Plan-specific feature flags
- [ ] Automatic limit notifications via email
- [ ] Custom plans for enterprise clients
