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
    const staleDealDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

    const [
      investorsResult,
      activeRealtorsResult,
      dealsResult,
      tasksResult,
      opportunitiesResult,
    ] = await Promise.all([
      supabase
        .from("investors")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("status", "active"),
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("role", "agent")
        .eq("is_active", true),
      supabase
        .from("deal_rooms")
        .select("id, status, ticket_size_aed, updated_at, target_close_date")
        .eq("tenant_id", tenantId)
        .neq("status", "completed"),
      supabase
        .from("tasks")
        .select("id, due_date, status")
        .eq("tenant_id", tenantId)
        .neq("status", "done"),
      supabase
        .from("investor_opportunities")
        .select("id, shared_at, status")
        .eq("tenant_id", tenantId)
        .in("status", OPEN_OPPORTUNITY_STATUSES),
    ])

    const deals = dealsResult.data ?? []
    const tasks = tasksResult.data ?? []
    const opportunities = opportunitiesResult.data ?? []

    const stageMap: Record<string, { count: number; value: number }> = {
      preparation: { count: 0, value: 0 },
      "due-diligence": { count: 0, value: 0 },
      negotiation: { count: 0, value: 0 },
      closing: { count: 0, value: 0 },
    }

    let pipelineValue = 0
    let dealsAtRisk = 0
    for (const deal of deals) {
      const value = Number(deal.ticket_size_aed ?? 0)
      pipelineValue += value

      const status = String(deal.status ?? "")
      if (stageMap[status]) {
        stageMap[status].count += 1
        stageMap[status].value += value
      }

      const targetCloseDate = deal.target_close_date ? new Date(deal.target_close_date) : null
      const isPastTarget = !!targetCloseDate && targetCloseDate < now
      const isStale = new Date(deal.updated_at) < staleDealDate
      if (isPastTarget || isStale) {
        dealsAtRisk += 1
      }
    }

    let overdueTasks = 0
    let tasksDueSoon = 0
    for (const task of tasks) {
      if (!task.due_date) continue
      const dueDate = new Date(task.due_date)
      if (dueDate < now) overdueTasks += 1
      else if (dueDate <= soon) tasksDueSoon += 1
    }

    let staleOpportunities = 0
    for (const opp of opportunities) {
      const lastSharedHours = hoursAgo(opp.shared_at)
      if (lastSharedHours !== null && lastSharedHours >= 72) {
        staleOpportunities += 1
      }
    }

    const stageBreakdown = Object.entries(stageMap).map(([stage, values]) => ({
      stage,
      ...values,
    }))

    const riskAlerts = [
      {
        id: "deals_at_risk",
        title: "Deals at risk",
        severity: dealsAtRisk > 5 ? "high" : dealsAtRisk > 0 ? "medium" : "low",
        count: dealsAtRisk,
        href: "/manager",
      },
      {
        id: "overdue_tasks",
        title: "Overdue tasks",
        severity: overdueTasks > 8 ? "high" : overdueTasks > 0 ? "medium" : "low",
        count: overdueTasks,
        href: "/tasks",
      },
      {
        id: "stale_opportunities",
        title: "Stale opportunities",
        severity: staleOpportunities > 8 ? "high" : staleOpportunities > 0 ? "medium" : "low",
        count: staleOpportunities,
        href: "/realtor/opportunities",
      },
    ].filter((alert) => alert.count > 0)

    return NextResponse.json({
      timeframe,
      generatedAt: now.toISOString(),
      fromDate: fromDate.toISOString(),
      summary: {
        activeInvestors: investorsResult.count ?? 0,
        activeRealtors: activeRealtorsResult.count ?? 0,
        liveDeals: deals.length,
        pipelineValue,
        dealsAtRisk,
        overdueTasks,
        tasksDueSoon,
        staleOpportunities,
      },
      stageBreakdown,
      riskAlerts,
    })
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[manager/overview] Error:", err)
    return NextResponse.json({ error: "Failed to load manager overview" }, { status: 500 })
  }
}

