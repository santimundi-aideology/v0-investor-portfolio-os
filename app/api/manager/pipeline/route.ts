import { NextResponse } from "next/server"

import { requireAuthContext } from "@/lib/auth/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { requireManagerTenantContext } from "@/lib/manager/context"
import { parseTimeframe } from "@/lib/manager/filters"
import { AccessError } from "@/lib/security/rbac"

type StageKey = "preparation" | "due-diligence" | "negotiation" | "closing"

const STAGES: StageKey[] = ["preparation", "due-diligence", "negotiation", "closing"]
const PRIORITIES = new Set(["low", "medium", "high"])

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthContext(req)
    const { tenantId } = requireManagerTenantContext(ctx)
    const supabase = getSupabaseAdminClient()
    const url = new URL(req.url)

    const timeframe = parseTimeframe(url.searchParams.get("timeframe"))
    const realtorId = (url.searchParams.get("realtorId") ?? "").trim()
    const stageFilter = (url.searchParams.get("stage") ?? "").trim()
    const priorityFilter = (url.searchParams.get("priority") ?? "").trim()
    const now = new Date()
    const staleCutoff = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

    let query = supabase
      .from("deal_rooms")
      .select(
        "id, status, property_title, investor_name, ticket_size_aed, probability, next_step, priority, updated_at, target_close_date, assigned_agent_id"
      )
      .eq("tenant_id", tenantId)
      .neq("status", "completed")

    if (realtorId) query = query.eq("assigned_agent_id", realtorId)
    if (STAGES.includes(stageFilter as StageKey)) query = query.eq("status", stageFilter)
    if (PRIORITIES.has(priorityFilter)) query = query.eq("priority", priorityFilter)

    const dealsResult = await query.order("updated_at", { ascending: false })
    if (dealsResult.error) throw dealsResult.error

    const deals = dealsResult.data ?? []
    const assigneeIds = [
      ...new Set(deals.map((d) => d.assigned_agent_id).filter(Boolean) as string[]),
    ]

    const usersResult = assigneeIds.length
      ? await supabase
          .from("users")
          .select("id, name")
          .in("id", assigneeIds)
      : { data: [], error: null }

    if (usersResult.error) throw usersResult.error
    const usersById = new Map((usersResult.data ?? []).map((u) => [u.id, u.name]))

    const stages: Record<StageKey, { count: number; value: number; deals: unknown[] }> = {
      preparation: { count: 0, value: 0, deals: [] },
      "due-diligence": { count: 0, value: 0, deals: [] },
      negotiation: { count: 0, value: 0, deals: [] },
      closing: { count: 0, value: 0, deals: [] },
    }

    const stuckDeals: Array<Record<string, unknown>> = []

    for (const deal of deals) {
      const stage = deal.status as StageKey
      const ticket = Number(deal.ticket_size_aed ?? 0)
      const realtorName = deal.assigned_agent_id
        ? usersById.get(deal.assigned_agent_id) ?? "Unassigned"
        : "Unassigned"
      const updatedAt = deal.updated_at
      const targetDate = deal.target_close_date
      const isStale = updatedAt ? new Date(updatedAt) < staleCutoff : false
      const isPastTarget = targetDate ? new Date(targetDate) < now : false

      const model = {
        id: deal.id,
        stage,
        propertyTitle: deal.property_title,
        investorName: deal.investor_name,
        ticketSizeAed: ticket,
        probability: deal.probability,
        nextStep: deal.next_step,
        priority: deal.priority,
        updatedAt,
        targetCloseDate: targetDate,
        assignedAgentId: deal.assigned_agent_id,
        assignedAgentName: realtorName,
        isStale,
        isPastTarget,
      }

      if (STAGES.includes(stage)) {
        stages[stage].count += 1
        stages[stage].value += ticket
        stages[stage].deals.push(model)
      }

      if (isStale || isPastTarget) {
        stuckDeals.push(model)
      }
    }

    stuckDeals.sort((a, b) => {
      const aPriority = String(a.priority ?? "")
      const bPriority = String(b.priority ?? "")
      const order = { high: 0, medium: 1, low: 2 } as Record<string, number>
      return (order[aPriority] ?? 3) - (order[bPriority] ?? 3)
    })

    return NextResponse.json({
      timeframe,
      generatedAt: now.toISOString(),
      filters: {
        realtorId: realtorId || null,
        stage: stageFilter || null,
        priority: priorityFilter || null,
      },
      stages,
      stuckDeals: stuckDeals.slice(0, 30),
    })
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[manager/pipeline] Error:", err)
    return NextResponse.json({ error: "Failed to load manager pipeline" }, { status: 500 })
  }
}

