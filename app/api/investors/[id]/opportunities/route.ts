import { NextResponse } from "next/server"

import { requireAuthContext } from "@/lib/auth/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { getHoldingsByInvestor } from "@/lib/db/holdings"
import { getInvestorById } from "@/lib/db/investors"
import {
  createOpportunity,
  getOpportunitiesByInvestor,
  getOpportunityCounts,
} from "@/lib/db/opportunities"
import { AccessError, assertInvestorAccess } from "@/lib/security/rbac"

/**
 * GET /api/investors/[id]/opportunities
 * Canonical opportunities endpoint for CRM/investor surfaces.
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

    const includeOwned =
      new URL(req.url).searchParams.get("includeOwned") === "true"
    const supabase = getSupabaseAdminClient()

    const [opportunities, counts, holdings] = await Promise.all([
      getOpportunitiesByInvestor(investorId, { includeAcquired: false }),
      getOpportunityCounts(investorId),
      getHoldingsByInvestor(investorId),
    ])
    const ownedListingIds = new Set(holdings.map((holding) => holding.listingId))

    const items = await Promise.all(
      opportunities.map(async (opp) => {
        const { data: listing } = await supabase
          .from("listings")
          .select(
            "title, area, type, price, size, bedrooms, developer, expected_rent, attachments"
          )
          .eq("id", opp.listingId)
          .maybeSingle()

        const { data: user } = await supabase
          .from("users")
          .select("name")
          .eq("id", opp.sharedBy)
          .maybeSingle()

        const { count: messageCount } = await supabase
          .from("opportunity_messages")
          .select("id", { count: "exact", head: true })
          .eq("opportunity_id", opp.id)

        const attachments = listing?.attachments as
          | Array<{ url?: string; type?: string }>
          | null
        const imageUrl =
          attachments?.find((a) => a.type?.startsWith("image"))?.url ?? null

        return {
          id: opp.id,
          investorId: opp.investorId,
          listingId: opp.listingId,
          isOwned: ownedListingIds.has(opp.listingId),
          status: opp.status,
          decision: opp.decision,
          decisionAt: opp.decisionAt,
          decisionNote: opp.decisionNote,
          sharedBy: opp.sharedBy,
          sharedByName: user?.name ?? null,
          sharedAt: opp.sharedAt,
          sharedMessage: opp.sharedMessage,
          matchScore: opp.matchScore,
          matchReasons: opp.matchReasons,
          memoId: opp.memoId,
          dealRoomId: opp.dealRoomId,
          messageCount: messageCount ?? 0,
          property: listing
            ? {
                title: listing.title,
                area: listing.area,
                type: listing.type,
                price: listing.price ? Number(listing.price) : null,
                size: listing.size ? Number(listing.size) : null,
                bedrooms: listing.bedrooms,
                imageUrl,
                developer: listing.developer,
                expectedRent: listing.expected_rent
                  ? Number(listing.expected_rent)
                  : null,
              }
            : null,
        }
      })
    )

    const visible = includeOwned ? items : items.filter((item) => !item.isOwned)

    return NextResponse.json({
      investorId,
      tenantId: investor.tenantId,
      opportunities: visible,
      counts: {
        ...counts,
        total: visible.length,
      },
    })
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[investor-opportunities] Error:", err)
    return NextResponse.json(
      { error: "Failed to load opportunities" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/investors/[id]/opportunities
 * Realtor/manager shares a property with an investor as a recommendation.
 * Body: { listingId: string, sharedMessage?: string, matchScore?: number, matchReasons?: string[] }
 */
export async function POST(
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

    const body = await req.json()
    const {
      listingId,
      sharedMessage,
      matchScore,
      matchReasons,
      shortlistItemId,
    } = body as {
      listingId?: string
      sharedMessage?: string
      matchScore?: number
      matchReasons?: string[]
      shortlistItemId?: string
    }

    if (!listingId) {
      return NextResponse.json(
        { error: "listingId is required" },
        { status: 400 }
      )
    }

    // Only internal users (agent/manager/super_admin) can create shares.
    if (ctx.role === "investor") {
      return NextResponse.json(
        { error: "Investors cannot create recommendations" },
        { status: 403 }
      )
    }

    const opportunity = await createOpportunity({
      tenantId: investor.tenantId,
      investorId,
      listingId,
      sharedBy: ctx.userId,
      sharedMessage,
      matchScore,
      matchReasons,
      shortlistItemId,
    })

    if (!opportunity) {
      return NextResponse.json(
        { error: "Failed to create recommendation" },
        { status: 500 }
      )
    }

    return NextResponse.json({ opportunity }, { status: 201 })
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[investor-opportunities] Error:", err)
    return NextResponse.json(
      { error: "Failed to create recommendation" },
      { status: 500 }
    )
  }
}
