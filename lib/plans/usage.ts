/**
 * Plan Usage Tracking and Limit Checking
 */

import { getSupabaseAdminClient } from "@/lib/db/client"
import { getPlanConfig, type PlanTier } from "./config"

export interface UsageStats {
  properties: number
  investors: number
  users: number
  memosThisMonth: number
  aiEvaluationsThisMonth: number
}

export interface UsageCheckResult {
  allowed: boolean
  current: number
  limit: number
  remaining: number
  isUnlimited: boolean
  percentUsed: number
  reason?: string
}

/**
 * Get usage statistics for a tenant
 */
export async function getTenantUsage(tenantId: string): Promise<UsageStats> {
  const supabase = getSupabaseAdminClient()
  
  // Get start of current month
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  
  // Parallel queries for all usage stats
  const [
    propertiesResult,
    investorsResult,
    usersResult,
    memosResult,
    evaluationsResult,
  ] = await Promise.all([
    // Count active properties
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .neq("status", "archived"),
    
    // Count investors
    supabase
      .from("investors")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
    
    // Count users
    supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("is_active", true),
    
    // Count memos this month
    supabase
      .from("memos")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .gte("created_at", startOfMonth.toISOString()),
    
    // Count AI evaluations this month (property intake evaluations)
    supabase
      .from("property_intake_history")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("action", "ai_evaluation")
      .gte("timestamp", startOfMonth.toISOString()),
  ])
  
  return {
    properties: propertiesResult.count ?? 0,
    investors: investorsResult.count ?? 0,
    users: usersResult.count ?? 0,
    memosThisMonth: memosResult.count ?? 0,
    aiEvaluationsThisMonth: evaluationsResult.count ?? 0,
  }
}

/**
 * Check if tenant can perform an action based on plan limits
 */
export async function checkPlanLimit(
  tenantId: string,
  plan: PlanTier,
  limitType: "properties" | "investors" | "users" | "memos" | "aiEvaluations"
): Promise<UsageCheckResult> {
  const config = getPlanConfig(plan)
  const usage = await getTenantUsage(tenantId)
  
  let current: number
  let limit: number
  
  switch (limitType) {
    case "properties":
      current = usage.properties
      limit = config.limits.maxProperties
      break
    case "investors":
      current = usage.investors
      limit = config.limits.maxInvestors
      break
    case "users":
      current = usage.users
      limit = config.limits.maxUsers
      break
    case "memos":
      current = usage.memosThisMonth
      limit = config.limits.maxMemos
      break
    case "aiEvaluations":
      current = usage.aiEvaluationsThisMonth
      limit = config.limits.maxAIEvaluations
      break
  }
  
  const isUnlimited = limit === -1
  const allowed = isUnlimited || current < limit
  const remaining = isUnlimited ? -1 : Math.max(0, limit - current)
  const percentUsed = isUnlimited ? 0 : Math.min(100, (current / limit) * 100)
  
  return {
    allowed,
    current,
    limit,
    remaining,
    isUnlimited,
    percentUsed,
    reason: allowed ? undefined : `Plan limit reached (${current}/${limit})`,
  }
}

/**
 * Check if tenant can add a property
 */
export async function canAddProperty(tenantId: string, plan: PlanTier): Promise<UsageCheckResult> {
  return checkPlanLimit(tenantId, plan, "properties")
}

/**
 * Check if tenant can add an investor
 */
export async function canAddInvestor(tenantId: string, plan: PlanTier): Promise<UsageCheckResult> {
  return checkPlanLimit(tenantId, plan, "investors")
}

/**
 * Check if tenant can add a user
 */
export async function canAddUser(tenantId: string, plan: PlanTier): Promise<UsageCheckResult> {
  return checkPlanLimit(tenantId, plan, "users")
}

/**
 * Check if tenant can create a memo
 */
export async function canCreateMemo(tenantId: string, plan: PlanTier): Promise<UsageCheckResult> {
  return checkPlanLimit(tenantId, plan, "memos")
}

/**
 * Check if tenant can run AI evaluation
 */
export async function canRunAIEvaluation(tenantId: string, plan: PlanTier): Promise<UsageCheckResult> {
  return checkPlanLimit(tenantId, plan, "aiEvaluations")
}

/**
 * Get usage summary with warnings
 */
export async function getUsageSummary(tenantId: string, plan: PlanTier) {
  const usage = await getTenantUsage(tenantId)
  const config = getPlanConfig(plan)
  
  const warnings: string[] = []
  const approaching: string[] = []
  
  // Check each limit
  const checks = {
    properties: { usage: usage.properties, limit: config.limits.maxProperties, label: "properties" },
    investors: { usage: usage.investors, limit: config.limits.maxInvestors, label: "investors" },
    users: { usage: usage.users, limit: config.limits.maxUsers, label: "users" },
    memos: { usage: usage.memosThisMonth, limit: config.limits.maxMemos, label: "memos this month" },
    aiEvaluations: { usage: usage.aiEvaluationsThisMonth, limit: config.limits.maxAIEvaluations, label: "AI evaluations this month" },
  }
  
  Object.entries(checks).forEach(([key, { usage: current, limit, label }]) => {
    if (limit === -1) return // unlimited
    
    const percentUsed = (current / limit) * 100
    
    if (current >= limit) {
      warnings.push(`${label} limit reached (${current}/${limit})`)
    } else if (percentUsed >= 80) {
      approaching.push(`${label} at ${Math.round(percentUsed)}% (${current}/${limit})`)
    }
  })
  
  return {
    usage,
    warnings,
    approaching,
    hasWarnings: warnings.length > 0,
    needsAttention: warnings.length > 0 || approaching.length > 0,
  }
}
