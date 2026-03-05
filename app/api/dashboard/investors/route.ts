import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError } from "@/lib/security/rbac"

/**
 * GET /api/dashboard/investors
 * Returns investors needing follow-up
 */
export async function GET(req: Request) {
  try {
    const ctx = await requireAuthContext(req)
    if (!ctx.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = getSupabaseAdminClient()

    // Fetch investors first to get their IDs, then fetch only their tasks in parallel
    const { data: investors } = await supabase
      .from("investors")
      .select("id, name, company, status, last_contact, mandate")
      .eq("tenant_id", ctx.tenantId)
      .neq("status", "inactive")
      .order("last_contact", { ascending: true })
      .limit(10)

    const investorIds = investors?.map((i) => i.id) ?? []

    // Only fetch tasks for the investors we're showing — avoids scanning the entire tasks table
    const { data: tasks } = investorIds.length > 0
      ? await supabase
          .from("tasks")
          .select("investor_id")
          .eq("tenant_id", ctx.tenantId)
          .neq("status", "done")
          .in("investor_id", investorIds)
      : { data: [] }

    const taskCounts = new Map<string, number>()
    tasks?.forEach((task) => {
      if (task.investor_id) {
        taskCounts.set(task.investor_id, (taskCounts.get(task.investor_id) || 0) + 1)
      }
    })

    const investorsWithTasks = investors?.map((inv) => ({
      id: inv.id,
      name: inv.name,
      company: inv.company || "",
      status: inv.status,
      lastContact: inv.last_contact,
      mandate: inv.mandate as { strategy?: string; yieldTarget?: number } | null,
      openTasksCount: taskCounts.get(inv.id) || 0,
    })) || []

    const response = NextResponse.json({ investors: investorsWithTasks })
    response.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=60")
    return response
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[dashboard/investors] Error:", err)
    return NextResponse.json({ error: "Failed to fetch investors" }, { status: 500 })
  }
}
