import { NextResponse } from "next/server"

import { requireAuthContext } from "@/lib/auth/server"
import { AccessError } from "@/lib/security/rbac"
import { getSupabaseAdminClient } from "@/lib/db/client"

type ActivityType = "decision" | "memo" | "payment"

type ActivityItem = {
  id: string
  type: ActivityType
  title: string
  description: string
  timestamp: string
  href: string
}

const decisionLabelMap: Record<string, string> = {
  interested: "Interested",
  very_interested: "Interested",
  pending: "Not Now",
  not_interested: "Pass",
}

/**
 * GET /api/investor/activity-summary
 * Returns a compact timeline summary for the authenticated investor.
 */
export async function GET(req: Request) {
  try {
    const ctx = await requireAuthContext(req)
    if (ctx.role !== "investor") throw new AccessError("Investor access only")
    if (!ctx.investorId) throw new AccessError("Missing investor scope")

    const supabase = getSupabaseAdminClient()
    const investorId = ctx.investorId

    const [lastDecisionRes, lastMemoRes, holdingsRes] = await Promise.all([
      supabase
        .from("investor_opportunities")
        .select("id, listing_id, memo_id, decision, decision_at")
        .eq("investor_id", investorId)
        .not("decision_at", "is", null)
        .order("decision_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("memos")
        .select("id, listing_id, updated_at, state")
        .eq("investor_id", investorId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("holdings").select("id, listing_id").eq("investor_id", investorId),
    ])

    if (lastDecisionRes.error) {
      console.error("[activity-summary] Failed decision query:", lastDecisionRes.error)
    }
    if (lastMemoRes.error) {
      console.error("[activity-summary] Failed memo query:", lastMemoRes.error)
    }
    if (holdingsRes.error) {
      console.error("[activity-summary] Failed holdings query:", holdingsRes.error)
    }

    const holdings = holdingsRes.data ?? []
    const holdingIds = holdings.map((h) => h.id)

    const nextPaymentRes =
      holdingIds.length > 0
        ? await supabase
            .from("payment_milestones")
            .select("id, holding_id, label, amount, due_date, status")
            .in("holding_id", holdingIds)
            .eq("status", "scheduled")
            .not("due_date", "is", null)
            .order("due_date", { ascending: true })
            .limit(1)
            .maybeSingle()
        : { data: null, error: null }

    if (nextPaymentRes.error) {
      console.error("[activity-summary] Failed payment query:", nextPaymentRes.error)
    }

    const listingIds = new Set<string>()
    if (lastDecisionRes.data?.listing_id) listingIds.add(lastDecisionRes.data.listing_id)
    if (lastMemoRes.data?.listing_id) listingIds.add(lastMemoRes.data.listing_id)

    const paymentHolding = holdings.find((h) => h.id === nextPaymentRes.data?.holding_id)
    if (paymentHolding?.listing_id) listingIds.add(paymentHolding.listing_id)

    const listingMap = new Map<string, { title: string | null }>()
    if (listingIds.size > 0) {
      const { data: listings, error: listingsError } = await supabase
        .from("listings")
        .select("id, title")
        .in("id", Array.from(listingIds))
      if (listingsError) {
        console.error("[activity-summary] Failed listing query:", listingsError)
      } else {
        for (const listing of listings ?? []) {
          listingMap.set(listing.id, { title: listing.title })
        }
      }
    }

    const items: ActivityItem[] = []

    if (lastDecisionRes.data?.decision_at) {
      const listingTitle = lastDecisionRes.data.listing_id
        ? listingMap.get(lastDecisionRes.data.listing_id)?.title
        : null
      const label = decisionLabelMap[lastDecisionRes.data.decision] ?? "Updated decision"

      items.push({
        id: `decision-${lastDecisionRes.data.id}`,
        type: "decision",
        title: `Last decision: ${label}`,
        description: listingTitle ? listingTitle : "Opportunity decision recorded",
        timestamp: lastDecisionRes.data.decision_at,
        href: lastDecisionRes.data.memo_id
          ? `/investor/memos/${lastDecisionRes.data.memo_id}`
          : `/investor/opportunities/${lastDecisionRes.data.id}`,
      })
    }

    if (lastMemoRes.data?.updated_at) {
      const listingTitle = lastMemoRes.data.listing_id
        ? listingMap.get(lastMemoRes.data.listing_id)?.title
        : null
      items.push({
        id: `memo-${lastMemoRes.data.id}`,
        type: "memo",
        title: "Last memo viewed",
        description: listingTitle ? `Memo for ${listingTitle}` : "Investment memo",
        timestamp: lastMemoRes.data.updated_at,
        href: `/investor/memos/${lastMemoRes.data.id}`,
      })
    }

    if (nextPaymentRes.data?.due_date) {
      const listingId = paymentHolding?.listing_id
      const listingTitle = listingId ? listingMap.get(listingId)?.title : null
      const amount = Number(nextPaymentRes.data.amount ?? 0)
      items.push({
        id: `payment-${nextPaymentRes.data.id}`,
        type: "payment",
        title: "Next upcoming payment",
        description: `${nextPaymentRes.data.label} - AED ${amount.toLocaleString()}${listingTitle ? ` (${listingTitle})` : ""}`,
        timestamp: nextPaymentRes.data.due_date,
        href: nextPaymentRes.data.holding_id
          ? `/investor/payments?holdingId=${nextPaymentRes.data.holding_id}`
          : "/investor/payments",
      })
    }

    return NextResponse.json({
      items: items.slice(0, 5),
    })
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[activity-summary] Unexpected error:", err)
    return NextResponse.json({ error: "Failed to load activity summary" }, { status: 500 })
  }
}
