import { NextResponse } from "next/server"
import { requireAuthContext } from "@/lib/auth/server"
import { getInvestorById } from "@/lib/db/investors"
import { AccessError, assertInvestorAccess } from "@/lib/security/rbac"
import { getSupabaseAdminClient } from "@/lib/db/client"

/**
 * GET /api/investors/[id]/payment-milestones
 * CRM-side endpoint: returns payment milestones for a specific investor.
 * Accessible by realtors, managers, and admins.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const investorId = (await params).id
    const ctx = await requireAuthContext(req)
    const investor = await getInvestorById(investorId)

    if (!investor) {
      return NextResponse.json({ error: "Investor not found" }, { status: 404 })
    }
    assertInvestorAccess(investor, ctx)

    const supabase = getSupabaseAdminClient()

    // Get the investor's holdings
    const { data: holdings } = await supabase
      .from("holdings")
      .select("id, listing_id, purchase_price")
      .eq("investor_id", investorId)

    if (!holdings || holdings.length === 0) {
      return NextResponse.json({
        milestones: [],
        summary: { totalAmount: 0, totalPaid: 0, totalUpcoming: 0, paidPct: 0, holdingCount: 0, nextPayment: null, upcomingPayments: [] },
      })
    }

    const holdingIds = holdings.map((h) => h.id)

    // Get milestones
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

    // Enrich with listing titles
    const listingIds = [...new Set(holdings.map((h) => h.listing_id))]
    const { data: listings } = await supabase
      .from("listings")
      .select("id, title, area")
      .in("id", listingIds)

    const listingMap = new Map(listings?.map((l) => [l.id, l]) ?? [])
    const holdingMap = new Map(holdings.map((h) => [h.id, h]))

    const enriched = (milestones ?? []).map((m) => {
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
    const totalPaid = enriched.filter((m) => m.status === "paid").reduce((sum, m) => sum + m.amount, 0)
    const totalUpcoming = totalAmount - totalPaid

    const upcoming = enriched
      .filter((m) => m.status !== "paid" && m.dueDate)
      .sort((a, b) => (a.dueDate! > b.dueDate! ? 1 : -1))

    const nextPayment = upcoming[0] ?? null

    return NextResponse.json({
      milestones: enriched,
      summary: {
        totalAmount,
        totalPaid,
        totalUpcoming,
        paidPct: totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0,
        holdingCount: new Set(enriched.map((m) => m.holdingId)).size,
        nextPayment: nextPayment
          ? {
              propertyTitle: nextPayment.propertyTitle,
              label: nextPayment.label,
              amount: nextPayment.amount,
              dueDate: nextPayment.dueDate,
            }
          : null,
        upcomingPayments: upcoming.slice(0, 5).map((p) => ({
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
