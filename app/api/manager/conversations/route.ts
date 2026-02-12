import { NextResponse } from "next/server"

import { requireAuthContext } from "@/lib/auth/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { requireManagerTenantContext } from "@/lib/manager/context"
import { hoursAgo, parseTimeframe, timeframeStartDate } from "@/lib/manager/filters"
import { AccessError } from "@/lib/security/rbac"

const OPEN_OPPORTUNITY_STATUSES = ["recommended", "shortlisted", "memo_review", "deal_room"]
const PRIORITIES = new Set(["low", "medium", "high"])

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthContext(req)
    const { tenantId } = requireManagerTenantContext(ctx)
    const supabase = getSupabaseAdminClient()
    const url = new URL(req.url)

    const timeframe = parseTimeframe(url.searchParams.get("timeframe"))
    const fromDate = timeframeStartDate(timeframe)
    const realtorId = (url.searchParams.get("realtorId") ?? "").trim()
    const priority = (url.searchParams.get("priority") ?? "").trim()

    let opportunitiesQuery = supabase
      .from("investor_opportunities")
      .select("id, investor_id, listing_id, shared_by, shared_at, status")
      .eq("tenant_id", tenantId)
      .in("status", OPEN_OPPORTUNITY_STATUSES)
      .gte("shared_at", fromDate.toISOString())
      .order("shared_at", { ascending: false })

    if (realtorId) opportunitiesQuery = opportunitiesQuery.eq("shared_by", realtorId)

    const opportunitiesResult = await opportunitiesQuery
    if (opportunitiesResult.error) throw opportunitiesResult.error
    const opportunities = opportunitiesResult.data ?? []
    const opportunityIds = opportunities.map((o) => o.id)

    if (!opportunityIds.length) {
      return NextResponse.json({
        timeframe,
        generatedAt: new Date().toISOString(),
        rows: [],
        summary: {
          needsReply: 0,
          stale24h: 0,
          highRisk: 0,
        },
      })
    }

    const investorIds = [
      ...new Set(opportunities.map((o) => o.investor_id).filter(Boolean) as string[]),
    ]
    const listingIds = [
      ...new Set(opportunities.map((o) => o.listing_id).filter(Boolean) as string[]),
    ]
    const sharedByIds = [
      ...new Set(opportunities.map((o) => o.shared_by).filter(Boolean) as string[]),
    ]

    const [messagesResult, investorsResult, listingsResult, usersResult] = await Promise.all([
      supabase
        .from("opportunity_messages")
        .select("opportunity_id, sender_role, body, created_at")
        .in("opportunity_id", opportunityIds)
        .order("created_at", { ascending: false }),
      investorIds.length
        ? supabase.from("investors").select("id, name, company").in("id", investorIds)
        : Promise.resolve({ data: [], error: null }),
      listingIds.length
        ? supabase.from("listings").select("id, title, area").in("id", listingIds)
        : Promise.resolve({ data: [], error: null }),
      sharedByIds.length
        ? supabase.from("users").select("id, name").in("id", sharedByIds)
        : Promise.resolve({ data: [], error: null }),
    ])

    if (messagesResult.error) throw messagesResult.error
    if (investorsResult.error) throw investorsResult.error
    if (listingsResult.error) throw listingsResult.error
    if (usersResult.error) throw usersResult.error

    const investorsById = new Map(
      (investorsResult.data ?? []).map((i) => [i.id, { name: i.name, company: i.company }])
    )
    const listingsById = new Map(
      (listingsResult.data ?? []).map((l) => [l.id, { title: l.title, area: l.area }])
    )
    const usersById = new Map((usersResult.data ?? []).map((u) => [u.id, u.name]))

    const latestByOpportunity = new Map<
      string,
      { senderRole: string; body: string; createdAt: string; count: number }
    >()

    for (const message of messagesResult.data ?? []) {
      const opportunityId = String(message.opportunity_id)
      const existing = latestByOpportunity.get(opportunityId)
      if (!existing) {
        latestByOpportunity.set(opportunityId, {
          senderRole: String(message.sender_role ?? ""),
          body: String(message.body ?? ""),
          createdAt: String(message.created_at),
          count: 1,
        })
      } else {
        existing.count += 1
      }
    }

    const rows = opportunities.map((opp) => {
      const latest = latestByOpportunity.get(opp.id)
      const lastAt = latest?.createdAt ?? opp.shared_at
      const staleHours = hoursAgo(lastAt)
      const needsReply = latest?.senderRole === "investor" && (staleHours ?? 0) >= 24
      const highRisk = latest?.senderRole === "investor" && (staleHours ?? 0) >= 48

      let rowPriority = highRisk ? "high" : needsReply ? "medium" : "low"
      if (PRIORITIES.has(priority) && rowPriority !== priority) {
        rowPriority = "filtered_out"
      }

      return {
        opportunityId: opp.id,
        status: opp.status,
        investorId: opp.investor_id,
        investorName: investorsById.get(String(opp.investor_id))?.name ?? "Unknown investor",
        investorCompany: investorsById.get(String(opp.investor_id))?.company ?? null,
        propertyTitle: listingsById.get(String(opp.listing_id))?.title ?? "Unknown property",
        propertyArea: listingsById.get(String(opp.listing_id))?.area ?? null,
        realtorId: opp.shared_by,
        realtorName: usersById.get(String(opp.shared_by)) ?? "Unknown realtor",
        sharedAt: opp.shared_at,
        lastMessageAt: lastAt,
        lastSenderRole: latest?.senderRole ?? null,
        lastMessagePreview: latest?.body?.slice(0, 140) ?? null,
        messageCount: latest?.count ?? 0,
        staleHours,
        needsReply,
        highRisk,
        priority: rowPriority,
      }
    })

    const filteredRows = rows
      .filter((row) => row.priority !== "filtered_out")
      .sort((a, b) => {
        if (a.highRisk !== b.highRisk) return a.highRisk ? -1 : 1
        if (a.needsReply !== b.needsReply) return a.needsReply ? -1 : 1
        return (b.staleHours ?? 0) - (a.staleHours ?? 0)
      })

    return NextResponse.json({
      timeframe,
      generatedAt: new Date().toISOString(),
      rows: filteredRows.slice(0, 80),
      summary: {
        needsReply: filteredRows.filter((r) => r.needsReply).length,
        stale24h: filteredRows.filter((r) => (r.staleHours ?? 0) >= 24).length,
        highRisk: filteredRows.filter((r) => r.highRisk).length,
      },
    })
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[manager/conversations] Error:", err)
    return NextResponse.json({ error: "Failed to load manager conversations" }, { status: 500 })
  }
}

