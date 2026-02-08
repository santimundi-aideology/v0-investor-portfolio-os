import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError } from "@/lib/security/rbac"

/**
 * GET /api/dashboard/stats
 * Returns dashboard KPIs for the current tenant
 */
export async function GET(req: Request) {
  try {
    const ctx = await requireAuthContext(req)
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

    // Pipeline value (from deal rooms)
    const { data: liveDeals } = await supabase
      .from("deal_rooms")
      .select("ticket_size_aed")
      .eq("tenant_id", ctx.tenantId)
      .neq("status", "completed")

    const pipelineValue = liveDeals?.reduce((sum, d) => sum + (d.ticket_size_aed || 0), 0) || 0

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

    // Properties needing verification
    const { count: needsVerification } = await supabase
      .from("listings")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", ctx.tenantId)
      .eq("readiness_status", "NEEDS_VERIFICATION")

    return NextResponse.json({
      activeInvestors: activeInvestors || 0,
      pipelineValue,
      liveDealsCount: liveDeals?.length || 0,
      tasksDueSoon: tasksDueSoon || 0,
      needsVerification: needsVerification || 0,
    })
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[dashboard/stats] Error:", err)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
