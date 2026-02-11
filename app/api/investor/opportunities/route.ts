import { NextResponse } from "next/server"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError } from "@/lib/security/rbac"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { getHoldingsByInvestor } from "@/lib/db/holdings"
import {
  getOpportunitiesByInvestor,
  getOpportunityCounts,
  validateOpportunityState,
} from "@/lib/db/opportunities"

export const dynamic = 'force-dynamic'

/**
 * GET /api/investor/opportunities
 * Returns all recommended opportunities for the current investor,
 * enriched with listing details and excluding already-owned properties.
 */
export async function GET(req: Request) {
  try {
    const ctx = await requireAuthContext(req)
    const investorId = ctx.investorId
    const includeOwned =
      new URL(req.url).searchParams.get("includeOwned") === "true"

    if (!investorId) {
      return NextResponse.json(
        { error: "No investor context" },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdminClient()

    // Fetch opportunities and holdings to enforce ownership exclusion
    const opportunities = await getOpportunitiesByInvestor(investorId, {
      includeAcquired: false,
    })
    const statusOverrides = new Map<string, string>()
    for (const opportunity of opportunities) {
      const validation = validateOpportunityState(opportunity)
      if (!validation.valid && validation.warning) {
        console.warn(validation.warning)
        if (validation.normalizedStatus) {
          statusOverrides.set(opportunity.id, validation.normalizedStatus)
        }
      }
    }
    const holdings = await getHoldingsByInvestor(investorId)
    const ownedListingIds = new Set(holdings.map((holding) => holding.listingId))

    // Fetch counts
    const counts = await getOpportunityCounts(investorId)

    // Enrich with listing details
    const enriched = await Promise.all(
      opportunities.map(async (opp) => {
        let property: {
          title: string | null
          area: string | null
          type: string | null
          price: number | null
          size: number | null
          bedrooms: number | null
          imageUrl: string | null
          developer: string | null
          expectedRent: number | null
        } | null = null

        try {
          const { data: listing } = await supabase
            .from("listings")
            .select(
              "title, area, type, price, size, bedrooms, developer, expected_rent, attachments"
            )
            .eq("id", opp.listingId)
            .maybeSingle()

          if (listing) {
            // Extract first image from attachments if available
            const attachments = listing.attachments as
              | Array<{ url?: string; type?: string }>
              | null
            const imageUrl =
              attachments?.find((a) => a.type?.startsWith("image"))?.url ??
              null

            property = {
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
          }
        } catch {
          // Listing may not exist
        }

        // Get realtor name
        let sharedByName: string | null = null
        try {
          const { data: user } = await supabase
            .from("users")
            .select("name")
            .eq("id", opp.sharedBy)
            .maybeSingle()
          sharedByName = user?.name ?? null
        } catch {
          // User may not exist
        }

        // Get message count for this opportunity
        const { count: messageCount } = await supabase
          .from("opportunity_messages")
          .select("id", { count: "exact", head: true })
          .eq("opportunity_id", opp.id)

        return {
          id: opp.id,
          investorId: opp.investorId,
          listingId: opp.listingId,
          isOwned: ownedListingIds.has(opp.listingId),
          status: statusOverrides.get(opp.id) ?? opp.status,
          decision: opp.decision,
          decisionAt: opp.decisionAt,
          decisionNote: opp.decisionNote,
          sharedBy: opp.sharedBy,
          sharedByName,
          sharedAt: opp.sharedAt,
          sharedMessage: opp.sharedMessage,
          matchScore: opp.matchScore,
          matchReasons: opp.matchReasons,
          memoId: opp.memoId,
          dealRoomId: opp.dealRoomId,
          messageCount: messageCount ?? 0,
          property,
        }
      })
    )

    const visibleOpportunities = includeOwned
      ? enriched
      : enriched.filter((opp) => !opp.isOwned)

    const visibleCounts = includeOwned
      ? counts
      : {
          ...counts,
          total: visibleOpportunities.length,
        }

    return NextResponse.json({
      opportunities: visibleOpportunities,
      counts: visibleCounts,
    })
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[investor/opportunities] Error:", err)
    return NextResponse.json(
      { error: "Failed to load opportunities" },
      { status: 500 }
    )
  }
}
