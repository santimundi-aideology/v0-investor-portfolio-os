import { NextResponse } from "next/server"
import { requireAuthContext } from "@/lib/auth/server"
import { getTenantUsage, getUsageSummary } from "@/lib/plans/usage"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { getPlanConfig } from "@/lib/plans/config"

/**
 * GET /api/plans/usage
 * Get current usage stats for the authenticated tenant
 */
export async function GET() {
  try {
    const ctx = await requireAuthContext()
    
    if (!ctx.tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 400 })
    }
    
    // Get tenant's plan
    const supabase = getSupabaseAdminClient()
    const { data: tenant } = await supabase
      .from("tenants")
      .select("plan")
      .eq("id", ctx.tenantId)
      .single()
    
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 })
    }
    
    const plan = tenant.plan as "starter" | "pro" | "enterprise"
    const planConfig = getPlanConfig(plan)
    const usage = await getTenantUsage(ctx.tenantId)
    const summary = await getUsageSummary(ctx.tenantId, plan)
    
    return NextResponse.json({
      plan,
      planConfig,
      usage: summary.usage,
      limits: planConfig.limits,
      warnings: summary.warnings,
      approaching: summary.approaching,
      needsAttention: summary.needsAttention,
    })
  } catch (err) {
    console.error("[plans/usage] Error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
