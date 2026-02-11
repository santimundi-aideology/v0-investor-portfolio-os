import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError } from "@/lib/security/rbac"
import { getHoldingsByInvestor } from "@/lib/db/holdings"

/**
 * GET /api/investors/[id]/shortlist
 * Returns shortlisted properties (pipeline) for an investor.
 * These are properties being considered with the realtor before purchase.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const investorId = (await params).id

  try {
    const ctx = await requireAuthContext(req)

    // Only investors can view their own shortlist, agents/managers can view any
    if (ctx.role === "investor" && ctx.investorId !== investorId) {
      throw new AccessError("Can only access your own shortlist")
    }

    const supabase = getSupabaseAdminClient()

    // First check if a shortlist exists for this investor
    const { data: shortlist, error: shortlistError } = await supabase
      .from("shortlists")
      .select("id")
      .eq("investor_id", investorId)
      .maybeSingle()

    if (shortlistError) {
      console.warn("[shortlist] Error fetching shortlist:", shortlistError.message)
      return NextResponse.json({ items: [] })
    }

    if (!shortlist) {
      return NextResponse.json({ items: [] })
    }

    // Build owned listing set so acquired properties never show in recommendation feeds.
    const holdings = await getHoldingsByInvestor(investorId)
    const ownedListingIds = new Set(holdings.map((holding) => holding.listingId))

    // Fetch shortlist items with listing details
    const { data: items, error: itemsError } = await supabase
      .from("shortlist_items")
      .select(`
        id,
        shortlist_id,
        listing_id,
        match_score,
        match_explanation,
        tradeoffs,
        agent_notes,
        pinned,
        rank,
        added_by,
        added_at
      `)
      .eq("shortlist_id", shortlist.id)
      .order("rank", { ascending: true })

    if (itemsError) {
      console.warn("[shortlist] Error fetching items:", itemsError.message)
      return NextResponse.json({ items: [] })
    }

    // Enrich with property details
    const enrichedItems = await Promise.all(
      (items ?? [])
      .filter((item) => {
        if (!item.listing_id) return true
        return !ownedListingIds.has(item.listing_id)
      })
      .map(async (item) => {
        let property: {
          title: string | null
          area: string | null
          type: string | null
          price: number | null
          size: number | null
          bedrooms: number | null
          imageUrl: string | null
          status: string | null
        } | null = null

        if (item.listing_id) {
          const { data: listing } = await supabase
            .from("listings")
            .select("title, area, type, price, size, bedrooms, status")
            .eq("id", item.listing_id)
            .maybeSingle()

          if (listing) {
            property = {
              title: listing.title,
              area: listing.area,
              type: listing.type,
              price: listing.price ? Number(listing.price) : null,
              size: listing.size ? Number(listing.size) : null,
              bedrooms: listing.bedrooms,
              imageUrl: null, // Would come from attachments
              status: listing.status,
            }
          }
        }

        return {
          id: item.id,
          listingId: item.listing_id,
          matchScore: item.match_score,
          matchExplanation: item.match_explanation,
          tradeoffs: item.tradeoffs ?? [],
          agentNotes: item.agent_notes,
          pinned: item.pinned,
          rank: item.rank,
          addedAt: item.added_at,
          isOwned: item.listing_id ? ownedListingIds.has(item.listing_id) : false,
          lifecycleStage: "shortlisted",
          property,
        }
      })
    )

    return NextResponse.json({ items: enrichedItems })
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[shortlist] Error:", err)
    return NextResponse.json({ error: "Failed to load shortlist" }, { status: 500 })
  }
}
