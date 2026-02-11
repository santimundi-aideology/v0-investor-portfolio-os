import { NextResponse } from "next/server"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError } from "@/lib/security/rbac"
import { getSupabaseAdminClient } from "@/lib/db/client"

/**
 * GET /api/investor/payment-milestones
 * Returns all payment milestones across the investor's holdings.
 * Optionally filter by holdingId via ?holdingId=xxx
 */
export async function GET(req: Request) {
  try {
    const ctx = await requireAuthContext(req)
    const investorId = ctx.investorId

    if (!investorId) {
      return NextResponse.json({ error: "No investor context" }, { status: 400 })
    }

    const url = new URL(req.url)
    const holdingIdFilter = url.searchParams.get("holdingId")

    const supabase = getSupabaseAdminClient()

    // Get the investor's holding IDs
    const { data: holdings } = await supabase
      .from("holdings")
      .select("id, listing_id, purchase_price")
      .eq("investor_id", investorId)

    if (!holdings || holdings.length === 0) {
      return NextResponse.json({ milestones: [], summary: { totalAmount: 0, totalPaid: 0, totalUpcoming: 0, holdingCount: 0 } })
    }

    const holdingIds = holdingIdFilter
      ? holdings.filter(h => h.id === holdingIdFilter).map(h => h.id)
      : holdings.map(h => h.id)

    if (holdingIds.length === 0) {
      return NextResponse.json({ milestones: [], summary: { totalAmount: 0, totalPaid: 0, totalUpcoming: 0, holdingCount: 0 } })
    }

    // Get milestones for those holdings
    const { data: milestones, error } = await supabase
      .from("payment_milestones")
      .select("*")
      .in("holding_id", holdingIds)
      .order("holding_id")
      .order("sequence_order", { ascending: true })

    if (error) {
      console.error("[payment-milestones] Error:", error)
      return NextResponse.json({ error: "Failed to load milestones" }, { status: 500 })
    }

    // Get listing titles for context
    const listingIds = [...new Set(holdings.map(h => h.listing_id))]
    const { data: listings } = await supabase
      .from("listings")
      .select("id, title, area")
      .in("id", listingIds)

    const listingMap = new Map(listings?.map(l => [l.id, l]) ?? [])
    const holdingMap = new Map(holdings.map(h => [h.id, h]))

    // Enrich milestones with property name
    const enriched = (milestones ?? []).map(m => {
      const h = holdingMap.get(m.holding_id)
      const listing = h ? listingMap.get(h.listing_id) : null
      return {
        id: m.id,
        holdingId: m.holding_id,
        propertyTitle: listing?.title ?? "Unknown Property",
        propertyArea: listing?.area ?? "",
        purchasePrice: h ? Number(h.purchase_price) : 0,
        label: m.label,
        milestoneType: m.milestone_type,
        sequenceOrder: m.sequence_order,
        amount: Number(m.amount),
        percentage: m.percentage ? Number(m.percentage) : null,
        dueDate: m.due_date,
        paidDate: m.paid_date,
        status: m.status,
        notes: m.notes,
      }
    })

    // Compute summary
    const totalAmount = enriched.reduce((sum, m) => sum + m.amount, 0)
    const totalPaid = enriched.filter(m => m.status === "paid").reduce((sum, m) => sum + m.amount, 0)
    const totalUpcoming = totalAmount - totalPaid

    // Next upcoming payment
    const upcoming = enriched
      .filter(m => m.status !== "paid" && m.dueDate)
      .sort((a, b) => (a.dueDate! > b.dueDate! ? 1 : -1))

    const nextPayment = upcoming[0] ?? null

    return NextResponse.json({
      milestones: enriched,
      summary: {
        totalAmount,
        totalPaid,
        totalUpcoming,
        paidPct: totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0,
        holdingCount: new Set(enriched.map(m => m.holdingId)).size,
        nextPayment: nextPayment ? {
          propertyTitle: nextPayment.propertyTitle,
          label: nextPayment.label,
          amount: nextPayment.amount,
          dueDate: nextPayment.dueDate,
        } : null,
        upcomingPayments: upcoming.slice(0, 5).map(p => ({
          propertyTitle: p.propertyTitle,
          label: p.label,
          amount: p.amount,
          dueDate: p.dueDate,
          holdingId: p.holdingId,
        })),
      },
    })
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[payment-milestones] Error:", err)
    return NextResponse.json({ error: "Failed to load payment milestones" }, { status: 500 })
  }
}
