import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { buildRequestContext } from "@/lib/security/rbac"

/**
 * GET /api/dashboard/investors
 * Returns investors needing follow-up
 */
export async function GET(req: Request) {
  try {
    const ctx = buildRequestContext(req)
    if (!ctx.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = getSupabaseAdminClient()

    const { data: investors } = await supabase
      .from("investors")
      .select("id, name, company, status, last_contact, mandate")
      .eq("tenant_id", ctx.tenantId)
      .neq("status", "inactive")
      .order("last_contact", { ascending: true })
      .limit(10)

    // Get open task counts per investor
    const { data: tasks } = await supabase
      .from("tasks")
      .select("investor_id")
      .eq("tenant_id", ctx.tenantId)
      .neq("status", "done")
      .not("investor_id", "is", null)

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

    return NextResponse.json({ investors: investorsWithTasks })
  } catch (err) {
    console.error("[dashboard/investors] Error:", err)
    return NextResponse.json({ error: "Failed to fetch investors" }, { status: 500 })
  }
}
