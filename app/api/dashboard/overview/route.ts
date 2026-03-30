import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError } from "@/lib/security/rbac"

/**
 * GET /api/dashboard/overview
 * Single endpoint that returns all dashboard data in one request,
 * replacing the 6 separate calls (stats, pipeline, tasks, investors, properties, activities).
 * Auth is checked once; all DB queries run in parallel via Promise.all.
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

    // Agents see only their own investors, deals, and tasks.
    // Managers / super_admins see the full tenant-wide dashboard.
    // Properties and activity feed are always tenant-wide (shared inventory).
    const isAgent = ctx.role === "agent"

    // Build scoped queries
    // Active investors: agent-scoped for agents, tenant-wide for managers
    const activeInvestorQuery = supabase
      .from("investors")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", ctx.tenantId)
      .eq("status", "active")
    if (isAgent) activeInvestorQuery.eq("assigned_agent_id", ctx.userId)

    // Pipeline value: agent-scoped for agents, tenant-wide for managers
    const pipelineValueQuery = supabase
      .from("deal_rooms")
      .select("ticket_size_aed")
      .eq("tenant_id", ctx.tenantId)
      .neq("status", "completed")
    if (isAgent) pipelineValueQuery.eq("assigned_agent_id", ctx.userId)

    // Tasks due soon: personal (assigned to me)
    const tasksDueSoonQuery = supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", ctx.tenantId)
      .neq("status", "done")
      .lte("due_date", threeDaysFromNow.toISOString())
      .gte("due_date", now.toISOString())
    if (isAgent) tasksDueSoonQuery.eq("assignee_id", ctx.userId)

    // Pipeline deals: agent-scoped for agents, tenant-wide for managers
    const pipelineDealsQuery = supabase
      .from("deal_rooms")
      .select("id, status, ticket_size_aed, property_title, investor_name, next_step, probability")
      .eq("tenant_id", ctx.tenantId)
      .neq("status", "completed")
      .limit(200)
    if (isAgent) pipelineDealsQuery.eq("assigned_agent_id", ctx.userId)

    // My tasks: personal
    const tasksQuery = supabase
      .from("tasks")
      .select("id, title, status, priority, due_date, investor_id, listing_id, investor:investor_id(name), listing:listing_id(title)")
      .eq("tenant_id", ctx.tenantId)
      .neq("status", "done")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(20)
    if (isAgent) tasksQuery.eq("assignee_id", ctx.userId)

    // Investor follow-ups: agent-scoped for agents, tenant-wide for managers
    const followUpInvestorsQuery = supabase
      .from("investors")
      .select("id, name, company, status, last_contact, mandate")
      .eq("tenant_id", ctx.tenantId)
      .neq("status", "inactive")
      .order("last_contact", { ascending: true })
      .limit(10)
    if (isAgent) followUpInvestorsQuery.eq("assigned_agent_id", ctx.userId)

    // All queries fire simultaneously — single auth + single round-trip to DB pool
    const [
      { count: activeInvestors },
      { data: liveDeals },
      { count: tasksDueSoon },
      { data: deals },
      { data: tasks },
      { data: investors },
      { data: readinessRows },
      { data: verificationRows },
      { data: activities },
    ] = await Promise.all([
      activeInvestorQuery,
      pipelineValueQuery,
      tasksDueSoonQuery,
      pipelineDealsQuery,
      tasksQuery,
      followUpInvestorsQuery,

      // Property readiness counts (id + readiness only)
      supabase
        .from("listings")
        .select("id, readiness")
        .eq("tenant_id", ctx.tenantId),

      // Verification queue (limited)
      supabase
        .from("listings")
        .select("id, title, area, attachments")
        .eq("tenant_id", ctx.tenantId)
        .eq("readiness", "NEEDS_VERIFICATION")
        .limit(4),

      // Activity feed
      supabase
        .from("audit_events")
        .select("event_id, event_type, object_type, object_id, timestamp, metadata, actor_id")
        .eq("tenant_id", ctx.tenantId)
        .order("timestamp", { ascending: false })
        .limit(20),
    ])

    // ── Stats ────────────────────────────────────────────────────────────────
    const pipelineValue = liveDeals?.reduce((sum, d) => sum + (d.ticket_size_aed || 0), 0) ?? 0

    // ── Pipeline ─────────────────────────────────────────────────────────────
    const stages: Record<string, { count: number; value: number; deals: unknown[] }> = {
      preparation: { count: 0, value: 0, deals: [] },
      "due-diligence": { count: 0, value: 0, deals: [] },
      negotiation: { count: 0, value: 0, deals: [] },
      closing: { count: 0, value: 0, deals: [] },
    }
    deals?.forEach((deal) => {
      const stage = deal.status as keyof typeof stages
      if (stages[stage]) {
        stages[stage].count++
        stages[stage].value += deal.ticket_size_aed || 0
        stages[stage].deals.push({
          id: deal.id,
          propertyTitle: deal.property_title,
          investorName: deal.investor_name,
          ticketSize: deal.ticket_size_aed,
          nextStep: deal.next_step,
          probability: deal.probability,
        })
      }
    })

    // ── Tasks ─────────────────────────────────────────────────────────────────
    const transformedTasks = tasks?.map((t) => ({
      ...t,
      investor_name: (t.investor as { name?: string } | null)?.name ?? null,
      property_title: (t.listing as { title?: string } | null)?.title ?? null,
    })) ?? []

    // ── Investors ─────────────────────────────────────────────────────────────
    const investorIds = investors?.map((i) => i.id) ?? []
    let taskCountMap: Map<string, number> = new Map()
    if (investorIds.length > 0) {
      const { data: investorTasks } = await supabase
        .from("tasks")
        .select("investor_id")
        .eq("tenant_id", ctx.tenantId)
        .neq("status", "done")
        .in("investor_id", investorIds)
      investorTasks?.forEach((t) => {
        if (t.investor_id) taskCountMap.set(t.investor_id, (taskCountMap.get(t.investor_id) ?? 0) + 1)
      })
    }
    const investorsWithTasks = investors?.map((inv) => ({
      id: inv.id,
      name: inv.name,
      company: inv.company || "",
      status: inv.status,
      lastContact: inv.last_contact,
      mandate: inv.mandate as { strategy?: string; yieldTarget?: number } | null,
      openTasksCount: taskCountMap.get(inv.id) ?? 0,
    })) ?? []

    // ── Properties ────────────────────────────────────────────────────────────
    const readinessBuckets: Record<string, number> = {}
    readinessRows?.forEach((p) => {
      const status = p.readiness || "DRAFT"
      readinessBuckets[status] = (readinessBuckets[status] || 0) + 1
    })
    const verificationQueue = verificationRows?.map((p) => ({
      id: p.id,
      title: (p.title as string | null) || "Untitled Property",
      area: (p.area as string | null) || "",
    })) ?? []

    // ── Activities ────────────────────────────────────────────────────────────
    const activityFeed = activities?.map((event) => {
      const metadata = (event.metadata as Record<string, unknown>) || {}
      let title = ""
      let description = ""
      let type = event.event_type
      switch (event.event_type) {
        case "investor.created":
          title = "New investor added"
          description = metadata.name ? `${metadata.name} was added` : "A new investor was added"
          type = "investor_added"; break
        case "memo.created":
          title = "IC Memo created"
          description = metadata.propertyTitle ? `Memo for ${metadata.propertyTitle}` : "A new IC memo was created"
          type = "memo_created"; break
        case "property.listed":
          title = "Property listed"
          description = metadata.title ? `${metadata.title} added to inventory` : "A new property was listed"
          type = "property_listed"; break
        case "task.completed":
          title = "Task completed"
          description = metadata.title ? `${metadata.title} was marked complete` : "A task was completed"
          type = "task_completed"; break
        case "deal.updated":
          title = "Deal updated"
          description = metadata.propertyTitle ? `${metadata.propertyTitle} deal progressed` : "A deal was updated"
          type = "deal_updated"; break
        default:
          title = event.event_type.replace(/\./g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
          description = (metadata.description as string) || "Activity occurred"
      }
      return { id: event.event_id, type, title, description, timestamp: event.timestamp }
    }) ?? []

    const response = NextResponse.json({
      stats: {
        activeInvestors: activeInvestors ?? 0,
        pipelineValue,
        liveDealsCount: liveDeals?.length ?? 0,
        tasksDueSoon: tasksDueSoon ?? 0,
      },
      pipeline: { stages },
      tasks: transformedTasks,
      investors: investorsWithTasks,
      properties: {
        readinessBuckets,
        verificationQueue,
        totalProperties: readinessRows?.length ?? 0,
      },
      activities: activityFeed,
    })
    response.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=60")
    return response
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[dashboard/overview] Error:", err)
    return NextResponse.json({ error: "Failed to fetch dashboard" }, { status: 500 })
  }
}
