import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError } from "@/lib/security/rbac"

/**
 * GET /api/dashboard/tasks
 * Returns prioritized tasks for the dashboard
 */
export async function GET(req: Request) {
  try {
    const ctx = await requireAuthContext(req)
    if (!ctx.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = getSupabaseAdminClient()

    const { data: tasks } = await supabase
      .from("tasks")
      .select(`
        id, 
        title, 
        status, 
        priority, 
        due_date, 
        investor_id, 
        listing_id,
        investor:investor_id (name),
        listing:listing_id (title)
      `)
      .eq("tenant_id", ctx.tenantId)
      .neq("status", "done")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(20)

    // Transform to include joined names
    const tasksWithNames = tasks?.map((task) => ({
      ...task,
      investor_name: task.investor?.name || null,
      property_title: task.listing?.title || null,
    }))

    return NextResponse.json({ tasks: tasksWithNames || [] })
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[dashboard/tasks] Error:", err)
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 })
  }
}
