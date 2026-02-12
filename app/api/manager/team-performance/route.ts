import { NextResponse } from "next/server"

import { requireAuthContext } from "@/lib/auth/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { requireManagerTenantContext } from "@/lib/manager/context"
import { hoursAgo, parseTimeframe, timeframeStartDate } from "@/lib/manager/filters"
import { AccessError } from "@/lib/security/rbac"

const OPEN_OPPORTUNITY_STATUSES = ["recommended", "shortlisted", "memo_review", "deal_room"]

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthContext(req)
    const { tenantId } = requireManagerTenantContext(ctx)
    const supabase = getSupabaseAdminClient()
    const url = new URL(req.url)

    const timeframe = parseTimeframe(url.searchParams.get("timeframe"))
    const fromDate = timeframeStartDate(timeframe)
    const now = new Date()
    const soon = new Date(now.getTime() + 72 * 60 * 60 * 1000)
    const staleCutoff = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

    const usersResult = await supabase
      .from("users")
      .select("id, name, email, is_active")
      .eq("tenant_id", tenantId)
      .eq("role", "agent")
      .order("name", { ascending: true })

    if (usersResult.error) {
      throw usersResult.error
    }

    const realtors = usersResult.data ?? []
    const realtorIds = realtors.map((u) => u.id)

    if (!realtorIds.length) {
      return NextResponse.json({
        timeframe,
        generatedAt: now.toISOString(),
        rows: [],
      })
    }

    const [dealsResult, tasksResult, opportunitiesResult] = await Promise.all([
      supabase
        .from("deal_rooms")
        .select("id, assigned_agent_id, ticket_size_aed, status, updated_at, target_close_date")
        .eq("tenant_id", tenantId)
        .in("assigned_agent_id", realtorIds)
        .neq("status", "completed"),
      supabase
        .from("tasks")
        .select("id, assignee_id, due_date, status, updated_at")
        .eq("tenant_id", tenantId)
        .in("assignee_id", realtorIds)
        .neq("status", "done"),
      supabase
        .from("investor_opportunities")
        .select("id, shared_by, shared_at, updated_at, status")
        .eq("tenant_id", tenantId)
        .in("shared_by", realtorIds)
        .in("status", OPEN_OPPORTUNITY_STATUSES)
        .gte("shared_at", fromDate.toISOString()),
    ])

    const opportunities = opportunitiesResult.data ?? []
    const opportunityIds = opportunities.map((o) => o.id)
    const messagesResult = opportunityIds.length
      ? await supabase
          .from("opportunity_messages")
          .select("opportunity_id, sender_role, created_at")
          .in("opportunity_id", opportunityIds)
      : { data: [], error: null }

    if (dealsResult.error) throw dealsResult.error
    if (tasksResult.error) throw tasksResult.error
    if (opportunitiesResult.error) throw opportunitiesResult.error
    if (messagesResult.error) throw messagesResult.error

    const dealsByRealtor = new Map<string, Array<Record<string, unknown>>>()
    for (const deal of dealsResult.data ?? []) {
      const agentId = deal.assigned_agent_id as string | null
      if (!agentId) continue
      const list = dealsByRealtor.get(agentId) ?? []
      list.push(deal as unknown as Record<string, unknown>)
      dealsByRealtor.set(agentId, list)
    }

    const tasksByRealtor = new Map<string, Array<Record<string, unknown>>>()
    for (const task of tasksResult.data ?? []) {
      const assigneeId = task.assignee_id as string | null
      if (!assigneeId) continue
      const list = tasksByRealtor.get(assigneeId) ?? []
      list.push(task as unknown as Record<string, unknown>)
      tasksByRealtor.set(assigneeId, list)
    }

    const opportunitiesByRealtor = new Map<string, Array<Record<string, unknown>>>()
    for (const opportunity of opportunities) {
      const sharedBy = opportunity.shared_by as string | null
      if (!sharedBy) continue
      const list = opportunitiesByRealtor.get(sharedBy) ?? []
      list.push(opportunity as unknown as Record<string, unknown>)
      opportunitiesByRealtor.set(sharedBy, list)
    }

    const lastMessageByOpportunity = new Map<string, { senderRole: string; createdAt: string }>()
    for (const message of messagesResult.data ?? []) {
      const opportunityId = String(message.opportunity_id)
      const createdAt = String(message.created_at)
      const existing = lastMessageByOpportunity.get(opportunityId)
      if (!existing || createdAt > existing.createdAt) {
        lastMessageByOpportunity.set(opportunityId, {
          senderRole: String(message.sender_role ?? ""),
          createdAt,
        })
      }
    }

    const rows = realtors.map((realtor) => {
      const realtorDeals = dealsByRealtor.get(realtor.id) ?? []
      const realtorTasks = tasksByRealtor.get(realtor.id) ?? []
      const realtorOpportunities = opportunitiesByRealtor.get(realtor.id) ?? []

      let pipelineValue = 0
      let dealsAtRisk = 0
      let lastActivity: string | null = null

      for (const deal of realtorDeals) {
        pipelineValue += Number(deal.ticket_size_aed ?? 0)
        const updatedAt = String(deal.updated_at ?? "")
        if (updatedAt && (!lastActivity || updatedAt > lastActivity)) lastActivity = updatedAt

        const isPastTarget =
          !!deal.target_close_date && new Date(String(deal.target_close_date)) < now
        const isStale = updatedAt ? new Date(updatedAt) < staleCutoff : false
        if (isPastTarget || isStale) dealsAtRisk += 1
      }

      let overdueTasks = 0
      let tasksDueSoon = 0
      for (const task of realtorTasks) {
        const updatedAt = String(task.updated_at ?? "")
        if (updatedAt && (!lastActivity || updatedAt > lastActivity)) lastActivity = updatedAt

        if (!task.due_date) continue
        const dueDate = new Date(String(task.due_date))
        if (dueDate < now) overdueTasks += 1
        else if (dueDate <= soon) tasksDueSoon += 1
      }

      let awaitingInvestorReply = 0
      for (const opportunity of realtorOpportunities) {
        const updatedAt = String(opportunity.updated_at ?? "")
        if (updatedAt && (!lastActivity || updatedAt > lastActivity)) lastActivity = updatedAt

        const latestMessage = lastMessageByOpportunity.get(String(opportunity.id))
        if (!latestMessage) continue
        const staleHours = hoursAgo(latestMessage.createdAt)
        if (latestMessage.senderRole === "investor" && staleHours !== null && staleHours >= 24) {
          awaitingInvestorReply += 1
        }
      }

      return {
        realtorId: realtor.id,
        name: realtor.name || realtor.email || "Unnamed realtor",
        email: realtor.email,
        isActive: realtor.is_active,
        openDeals: realtorDeals.length,
        pipelineValue,
        dealsAtRisk,
        overdueTasks,
        tasksDueSoon,
        openOpportunities: realtorOpportunities.length,
        awaitingInvestorReply,
        lastActivityAt: lastActivity,
      }
    })

    rows.sort((a, b) => b.pipelineValue - a.pipelineValue)

    return NextResponse.json({
      timeframe,
      generatedAt: now.toISOString(),
      rows,
    })
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[manager/team-performance] Error:", err)
    return NextResponse.json({ error: "Failed to load team performance" }, { status: 500 })
  }
}

