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
    const now = new Date()
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

    // Run all 4 queries in parallel
    // Note: agents only see their own investors; managers/admins see full tenant scope
    const investorQuery = supabase
      .from("investors")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", ctx.tenantId)
      .eq("status", "active")
    if (ctx.role === "agent") {
      investorQuery.eq("assigned_agent_id", ctx.userId)
    }

    const [
      { count: activeInvestors },
      { data: liveDeals },
      { count: tasksDueSoon },
      { count: needsVerification },
    ] = await Promise.all([
      investorQuery,
      supabase
        .from("deal_rooms")
        .select("ticket_size_aed")
        .eq("tenant_id", ctx.tenantId)
        .neq("status", "completed"),
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", ctx.tenantId)
        .neq("status", "done")
        .lte("due_date", threeDaysFromNow.toISOString())
        .gte("due_date", now.toISOString()),
      supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", ctx.tenantId)
        .eq("readiness", "NEEDS_VERIFICATION"),
    ])

    const pipelineValue = liveDeals?.reduce((sum, d) => sum + (d.ticket_size_aed || 0), 0) ?? 0

    const response = NextResponse.json({
      activeInvestors: activeInvestors ?? 0,
      pipelineValue,
      liveDealsCount: liveDeals?.length ?? 0,
      tasksDueSoon: tasksDueSoon ?? 0,
      needsVerification: needsVerification ?? 0,
    })
    response.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=60")
    return response
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[dashboard/stats] Error:", err)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
