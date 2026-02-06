import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { buildRequestContext } from "@/lib/security/rbac"

/**
 * GET /api/dashboard/stats
 * Returns dashboard KPIs for the current tenant
 */
export async function GET(req: Request) {
  try {
    const ctx = buildRequestContext(req)
    if (!ctx.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = getSupabaseAdminClient()

    // Active investors count
    const { count: activeInvestors } = await supabase
      .from("investors")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", ctx.tenantId)
      .eq("status", "active")

    // Pipeline value (from holdings as proxy -- deal_rooms table doesn't exist)
    const { data: holdings } = await supabase
      .from("holdings")
      .select("current_value")
      .eq("tenant_id", ctx.tenantId)

    const pipelineValue = holdings?.reduce((sum, h) => sum + Number(h.current_value || 0), 0) || 0

    // Tasks due soon (next 3 days)
    const threeDaysFromNow = new Date()
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
    const { count: tasksDueSoon } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", ctx.tenantId)
      .neq("status", "done")
      .lte("due_date", threeDaysFromNow.toISOString())
      .gte("due_date", new Date().toISOString())

    // Properties needing verification (DB uses "Off-Plan" or null for unverified)
    const { data: unverifiedListings } = await supabase
      .from("listings")
      .select("id")
      .eq("tenant_id", ctx.tenantId)
      .or("readiness.is.null,readiness.eq.Off-Plan")
    const needsVerification = unverifiedListings?.length || 0

    return NextResponse.json({
      activeInvestors: activeInvestors || 0,
      pipelineValue,
      liveDealsCount: holdings?.length || 0,
      tasksDueSoon: tasksDueSoon || 0,
      needsVerification: needsVerification || 0,
    })
  } catch (err) {
    console.error("[dashboard/stats] Error:", err)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
