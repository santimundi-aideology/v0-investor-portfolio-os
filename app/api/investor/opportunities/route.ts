import { NextResponse } from "next/server"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError } from "@/lib/security/rbac"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { getHoldingsByInvestor } from "@/lib/db/holdings"
import {
  getOpportunitiesByInvestor,
  validateOpportunityState,
} from "@/lib/db/opportunities"

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1560184897-ae75f418493e?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1449844908441-8829872d2607?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=600&fit=crop",
]

function pickFallbackImage(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return FALLBACK_IMAGES[hash % FALLBACK_IMAGES.length]!
}

function extractImageUrl(listing: Record<string, unknown>): string | null {
  // 1. Check attachments array for image entries
  const attachments = listing.attachments as Array<{ url?: string; type?: string }> | null
  if (attachments?.length) {
    const img = attachments.find((a) => a.type?.startsWith("image") || a.url?.match(/\.(jpg|jpeg|png|webp)/i))
    if (img?.url) return img.url
  }
  // 2. Check direct image fields
  if (typeof listing.image_url === "string" && listing.image_url) return listing.image_url
  if (typeof listing.imageUrl === "string" && listing.imageUrl) return listing.imageUrl
  // 3. Check photos array
  const photos = listing.photos as string[] | null
  if (photos?.length && typeof photos[0] === "string") return photos[0]
  return null
}

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
    const memoIds = Array.from(
      new Set(opportunities.map((opp) => opp.memoId).filter((memoId): memoId is string => !!memoId)),
    )
    const memoOwnerById = new Map<string, string | null>()
    if (memoIds.length > 0) {
      const { data: memoRows } = await supabase
        .from("memos")
        .select("id, investor_id")
        .in("id", memoIds)
      for (const row of memoRows ?? []) {
        memoOwnerById.set(
          String((row as { id?: unknown }).id),
          ((row as { investor_id?: unknown }).investor_id as string | null) ?? null,
        )
      }
    }
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

    // Compute counts inline from the already-fetched opportunities (avoid duplicate query)
    const counts = { recommended: 0, interested: 0, veryInterested: 0, pipeline: 0, rejected: 0, total: opportunities.length }
    for (const opp of opportunities) {
      const st = statusOverrides.get(opp.id) ?? opp.status
      if (st === "rejected") counts.rejected++
      else if (["memo_review", "deal_room", "shortlisted"].includes(st)) counts.pipeline++
      else if (opp.decision === "very_interested") counts.veryInterested++
      else if (opp.decision === "interested") counts.interested++
      else counts.recommended++
    }

    // ── Batch-fetch all listings in one query ──────────────────────
    const listingIds = [...new Set(opportunities.map((o) => o.listingId))]
    const listingMap = new Map<string, Record<string, unknown>>()
    if (listingIds.length > 0) {
      const { data: listingsData } = await supabase
        .from("listings")
        .select("id, title, area, type, price, size, bedrooms, developer, expected_rent, attachments")
        .in("id", listingIds)
      for (const l of listingsData ?? []) {
        listingMap.set(l.id as string, l as Record<string, unknown>)
      }
    }

    // ── Batch-fetch all sharing user names ──────────────────────
    const sharedByIds = [...new Set(opportunities.map((o) => o.sharedBy))]
    const userNameMap = new Map<string, string>()
    if (sharedByIds.length > 0) {
      const { data: usersData } = await supabase
        .from("users")
        .select("id, name")
        .in("id", sharedByIds)
      for (const u of usersData ?? []) {
        userNameMap.set(u.id as string, (u.name as string) ?? "")
      }
    }

    // ── Batch-fetch message counts per opportunity ──────────────
    const oppIds = opportunities.map((o) => o.id)
    const msgCountMap = new Map<string, number>()
    if (oppIds.length > 0) {
      const { data: msgRows } = await supabase
        .from("opportunity_messages")
        .select("opportunity_id")
        .in("opportunity_id", oppIds)
      for (const row of msgRows ?? []) {
        const oid = row.opportunity_id as string
        msgCountMap.set(oid, (msgCountMap.get(oid) ?? 0) + 1)
      }
    }

    // ── Build enriched opportunities (no per-item DB calls) ──────
    const enriched = opportunities.map((opp) => {
      const memoOwner = opp.memoId ? memoOwnerById.get(opp.memoId) : null
      const safeMemoId = opp.memoId && memoOwner === investorId ? opp.memoId : null

      const listing = listingMap.get(opp.listingId)
      let property: {
        title: string | null; area: string | null; type: string | null
        price: number | null; size: number | null; bedrooms: number | null
        imageUrl: string | null; developer: string | null; expectedRent: number | null
      } | null = null

      if (listing) {
        const useFallback = true // Always provide fallback when no real image exists
        const realImage = extractImageUrl(listing)
        const imageUrl = realImage ?? (useFallback ? pickFallbackImage(opp.listingId) : null)
        property = {
          title: listing.title as string | null,
          area: listing.area as string | null,
          type: listing.type as string | null,
          price: listing.price ? Number(listing.price) : null,
          size: listing.size ? Number(listing.size) : null,
          bedrooms: listing.bedrooms as number | null,
          imageUrl,
          developer: listing.developer as string | null,
          expectedRent: listing.expected_rent ? Number(listing.expected_rent) : null,
        }
      }

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
        sharedByName: userNameMap.get(opp.sharedBy) ?? null,
        sharedAt: opp.sharedAt,
        sharedMessage: opp.sharedMessage,
        matchScore: opp.matchScore,
        matchReasons: opp.matchReasons,
        memoId: safeMemoId,
        dealRoomId: opp.dealRoomId,
        messageCount: msgCountMap.get(opp.id) ?? 0,
        property,
      }
    })

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
