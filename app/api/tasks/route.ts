import { NextResponse } from "next/server"
import { requireAuthContext } from "@/lib/auth/server"
import { listTasksByTenant, listTasksByInvestor, createTask, updateTask, deleteTask } from "@/lib/db/tasks"

/**
 * GET /api/tasks
 * List tasks for the current tenant. Optionally filter by investorId.
 */
export async function GET(req: Request) {
  try {
    const ctx = await requireAuthContext(req)
    if (!ctx.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const investorId = searchParams.get("investorId")

    const tasks = investorId
      ? await listTasksByInvestor(ctx.tenantId, investorId)
      : await listTasksByTenant(ctx.tenantId)

    // Enrich with names by joining investors/listings/users
    const { getSupabaseAdminClient } = await import("@/lib/db/client")
    const supabase = getSupabaseAdminClient()

    // Batch-fetch investor names
    const investorIds = [...new Set(tasks.filter(t => t.investorId).map(t => t.investorId!))]
    const investorMap: Record<string, string> = {}
    if (investorIds.length > 0) {
      const { data: investors } = await supabase
        .from("investors")
        .select("id, name")
        .in("id", investorIds)
      investors?.forEach(inv => { investorMap[inv.id] = inv.name })
    }

    // Batch-fetch listing titles
    const listingIds = [...new Set(tasks.filter(t => t.listingId).map(t => t.listingId!))]
    const listingMap: Record<string, string> = {}
    if (listingIds.length > 0) {
      const { data: listings } = await supabase
        .from("listings")
        .select("id, title")
        .in("id", listingIds)
      listings?.forEach(l => { listingMap[l.id] = l.title })
    }

    // Batch-fetch assignee names
    const assigneeIds = [...new Set(tasks.filter(t => t.assigneeId).map(t => t.assigneeId!))]
    const assigneeMap: Record<string, string> = {}
    if (assigneeIds.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("id, name")
        .in("id", assigneeIds)
      users?.forEach(u => { assigneeMap[u.id] = u.name })
    }

    const enriched = tasks.map(task => ({
      ...task,
      investorName: task.investorId ? investorMap[task.investorId] ?? null : null,
      propertyTitle: task.listingId ? listingMap[task.listingId] ?? null : null,
      assigneeName: task.assigneeId ? assigneeMap[task.assigneeId] ?? null : null,
    }))

    return NextResponse.json(enriched)
  } catch (err) {
    console.error("[tasks] GET error:", err)
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 })
  }
}

/**
 * POST /api/tasks
 * Create a new task.
 */
export async function POST(req: Request) {
  try {
    const ctx = await requireAuthContext(req)
    if (!ctx.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()

    const task = await createTask({
      tenantId: ctx.tenantId,
      title: body.title,
      description: body.description,
      status: body.status ?? "open",
      priority: body.priority ?? "medium",
      dueDate: body.dueDate,
      assigneeId: body.assigneeId,
      investorId: body.investorId,
      listingId: body.listingId,
      createdBy: ctx.userId,
    })

    return NextResponse.json(task, { status: 201 })
  } catch (err) {
    console.error("[tasks] POST error:", err)
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 })
  }
}

/**
 * PATCH /api/tasks
 * Update a task (expects { id, ...patch } in body).
 */
export async function PATCH(req: Request) {
  try {
    const ctx = await requireAuthContext(req)
    if (!ctx.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    if (!body.id) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 })
    }

    const { id, ...patch } = body
    const task = await updateTask(id, patch)

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    return NextResponse.json(task)
  } catch (err) {
    console.error("[tasks] PATCH error:", err)
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 })
  }
}

/**
 * DELETE /api/tasks
 * Delete a task (expects { id } in body).
 */
export async function DELETE(req: Request) {
  try {
    const ctx = await requireAuthContext(req)
    if (!ctx.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    if (!body.id) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 })
    }

    await deleteTask(body.id)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[tasks] DELETE error:", err)
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 })
  }
}
