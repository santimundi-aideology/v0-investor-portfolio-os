import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { buildRequestContext } from "@/lib/security/rbac"

/**
 * GET /api/dashboard/tasks
 * Returns prioritized tasks for the dashboard
 */
export async function GET(req: Request) {
  try {
    const ctx = buildRequestContext(req)
    if (!ctx.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = getSupabaseAdminClient()

    // Fetch tasks (investor_name/property_title don't exist as columns, need joins)
    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, title, status, priority, due_date, investor_id, listing_id")
      .eq("tenant_id", ctx.tenantId)
      .neq("status", "done")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(20)

    // Enrich tasks with investor names and property titles
    const enrichedTasks = []
    for (const task of tasks || []) {
      let investor_name: string | null = null
      let property_title: string | null = null

      if (task.investor_id) {
        const { data: inv } = await supabase
          .from("investors")
          .select("name")
          .eq("id", task.investor_id)
          .single()
        investor_name = inv?.name || null
      }

      if (task.listing_id) {
        const { data: listing } = await supabase
          .from("listings")
          .select("title")
          .eq("id", task.listing_id)
          .single()
        property_title = listing?.title || null
      }

      enrichedTasks.push({
        ...task,
        investor_name,
        property_title,
      })
    }

    return NextResponse.json({ tasks: enrichedTasks })
  } catch (err) {
    console.error("[dashboard/tasks] Error:", err)
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 })
  }
}
