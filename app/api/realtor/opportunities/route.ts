import { NextResponse } from "next/server"

import { requireAuthContext } from "@/lib/auth/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import {
  getOpportunitiesByTenant,
  type InvestorDecision,
  type OpportunityStatus,
} from "@/lib/db/opportunities"
import { AccessError } from "@/lib/security/rbac"

const VALID_STATUSES: OpportunityStatus[] = [
  "recommended",
  "shortlisted",
  "memo_review",
  "deal_room",
  "acquired",
  "rejected",
  "expired",
]

function toStatusFilter(raw: string | null): OpportunityStatus[] | undefined {
  if (!raw) return undefined
  const items = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean) as OpportunityStatus[]
  if (!items.length) return undefined
  return items.filter((status) => VALID_STATUSES.includes(status))
}

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthContext(req)
    if (ctx.role === "investor") {
      return NextResponse.json(
        { error: "Investors cannot access realtor opportunities" },
        { status: 403 }
      )
    }
    if (!ctx.tenantId) {
      return NextResponse.json({ error: "Missing tenant context" }, { status: 400 })
    }

    const url = new URL(req.url)
    const statuses = toStatusFilter(url.searchParams.get("status"))
    const investorId = url.searchParams.get("investorId") ?? undefined
    const listingId = url.searchParams.get("listingId") ?? undefined
    const search = (url.searchParams.get("search") ?? "").trim().toLowerCase()
    const includeClosed = url.searchParams.get("includeClosed") === "true"

    const opportunities = await getOpportunitiesByTenant(ctx.tenantId, {
      statuses,
      investorId,
      listingId,
      includeClosed,
    })

    const supabase = getSupabaseAdminClient()
    const investorIds = [...new Set(opportunities.map((o) => o.investorId))]
    const listingIds = [...new Set(opportunities.map((o) => o.listingId))]
    const sharedByIds = [...new Set(opportunities.map((o) => o.sharedBy))]
    const opportunityIds = opportunities.map((o) => o.id)

    const [investorsRes, listingsRes, usersRes, messagesRes] = await Promise.all([
      investorIds.length
        ? supabase
            .from("investors")
            .select("id, name, company")
            .in("id", investorIds)
        : Promise.resolve({ data: [], error: null }),
      listingIds.length
        ? supabase
            .from("listings")
            .select(
              "id, title, area, type, price, size, bedrooms, developer, expected_rent, attachments"
            )
            .in("id", listingIds)
        : Promise.resolve({ data: [], error: null }),
      sharedByIds.length
        ? supabase.from("users").select("id, name").in("id", sharedByIds)
        : Promise.resolve({ data: [], error: null }),
      opportunityIds.length
        ? supabase
            .from("opportunity_messages")
            .select("opportunity_id")
            .in("opportunity_id", opportunityIds)
        : Promise.resolve({ data: [], error: null }),
    ])

    if (investorsRes.error) {
      console.error("[realtor/opportunities] investors query failed:", investorsRes.error)
    }
    if (listingsRes.error) {
      console.error("[realtor/opportunities] listings query failed:", listingsRes.error)
    }
    if (usersRes.error) {
      console.error("[realtor/opportunities] users query failed:", usersRes.error)
    }
    if (messagesRes.error) {
      console.error("[realtor/opportunities] messages query failed:", messagesRes.error)
    }

    const investorsById = new Map(
      (investorsRes.data ?? []).map((row) => [
        row.id,
        { name: row.name as string | null, company: row.company as string | null },
      ])
    )
    const listingsById = new Map((listingsRes.data ?? []).map((row) => [row.id, row]))
    const usersById = new Map(
      (usersRes.data ?? []).map((row) => [row.id, row.name as string | null])
    )
    const messageCounts = new Map<string, number>()
    for (const row of messagesRes.data ?? []) {
      const opportunityId = row.opportunity_id as string
      messageCounts.set(opportunityId, (messageCounts.get(opportunityId) ?? 0) + 1)
    }

    const rows = opportunities.map((opp) => {
      const listing = listingsById.get(opp.listingId)
      const investor = investorsById.get(opp.investorId)
      const attachments = listing?.attachments as
        | Array<{ url?: string; type?: string }>
        | null
        | undefined
      const imageUrl =
        attachments?.find((a) => a.type?.startsWith("image"))?.url ?? null

      return {
        id: opp.id,
        investorId: opp.investorId,
        investorName: investor?.name ?? null,
        investorCompany: investor?.company ?? null,
        listingId: opp.listingId,
        status: opp.status,
        decision: opp.decision as InvestorDecision,
        decisionAt: opp.decisionAt,
        decisionNote: opp.decisionNote,
        sharedAt: opp.sharedAt,
        sharedBy: opp.sharedBy,
        sharedByName: usersById.get(opp.sharedBy) ?? null,
        sharedMessage: opp.sharedMessage,
        matchScore: opp.matchScore,
        matchReasons: opp.matchReasons,
        memoId: opp.memoId,
        dealRoomId: opp.dealRoomId,
        holdingId: opp.holdingId,
        messageCount: messageCounts.get(opp.id) ?? 0,
        property: listing
          ? {
              title: listing.title as string | null,
              area: listing.area as string | null,
              type: listing.type as string | null,
              price: listing.price != null ? Number(listing.price) : null,
              size: listing.size != null ? Number(listing.size) : null,
              bedrooms: (listing.bedrooms as number | null) ?? null,
              developer: (listing.developer as string | null) ?? null,
              expectedRent:
                listing.expected_rent != null ? Number(listing.expected_rent) : null,
              imageUrl,
            }
          : null,
      }
    })

    const filteredRows = search
      ? rows.filter((row) => {
          const haystack = [
            row.investorName,
            row.investorCompany,
            row.property?.title,
            row.property?.area,
            row.sharedMessage,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
          return haystack.includes(search)
        })
      : rows

    const counts = {
      total: filteredRows.length,
      recommended: filteredRows.filter((r) => r.status === "recommended").length,
      shortlisted: filteredRows.filter((r) => r.status === "shortlisted").length,
      memoReview: filteredRows.filter((r) => r.status === "memo_review").length,
      dealRoom: filteredRows.filter((r) => r.status === "deal_room").length,
      acquired: filteredRows.filter((r) => r.status === "acquired").length,
      rejected: filteredRows.filter((r) => r.status === "rejected").length,
      expired: filteredRows.filter((r) => r.status === "expired").length,
    }

    return NextResponse.json({
      opportunities: filteredRows,
      counts,
    })
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[realtor/opportunities] Error:", err)
    return NextResponse.json(
      { error: "Failed to load realtor opportunities" },
      { status: 500 }
    )
  }
}
