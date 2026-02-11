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
import { NextResponse } from "next/server"

import { requireAuthContext } from "@/lib/auth/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { getHoldingsByInvestor } from "@/lib/db/holdings"
import { getInvestorById } from "@/lib/db/investors"
import { listListings } from "@/lib/db/listings"
import { AccessError, assertInvestorAccess } from "@/lib/security/rbac"
import type { Mandate } from "@/lib/types"

type ListingLike = {
  id: string
  title: string
  area?: string
  type?: string
  status: string
  price?: number
  size?: number
  bedrooms?: number
  bathrooms?: number
  imageUrl?: string
}

type SignalRow = {
  id: string
  type: string
  status: string
  severity: string
  geo_name: string | null
  geo_id: string
  created_at: string
  evidence: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
}

type SignalTargetRow = {
  signal_id: string
  relevance_score: number
  status: string
  reason: Record<string, unknown> | null
}

type ShortlistItemRow = {
  listing_id: string
  match_score: number | null
  match_explanation: string | null
  rank: number
  added_at: string
}

type MemoRow = {
  listing_id: string | null
  state: string
  id: string
  updated_at: string
}

type DealRow = {
  property_id: string | null
  status: string
  id: string
  updated_at: string
}

type DecisionRow = {
  memo_id: string
  decision_type: string
}

type OpportunityRecord = {
  listingId: string
  property: {
    id: string
    title: string
    area: string | null
    type: string | null
    status: string
    price: number | null
    size: number | null
    bedrooms: number | null
    bathrooms: number | null
    imageUrl: string | null
  }
  scores: {
    combined: number
    mandateMatch: number
    signalRelevance: number
    shortlistMatch: number
  }
  sources: {
    mandate: {
      matched: boolean
      reasons: string[]
    }
    shortlist: {
      inShortlist: boolean
      rank: number | null
      matchScore: number | null
      matchExplanation: string | null
      addedAt: string | null
    }
    signals: Array<{
      signalId: string
      type: string
      status: string
      severity: string
      targetStatus: string
      relevanceScore: number
      geoName: string | null
      createdAt: string
    }>
  }
  lifecycle: {
    stage: "recommended" | "shortlisted" | "memo" | "deal" | "holding"
    isOwned: boolean
    isShortlisted: boolean
    isInDeal: boolean
    isMemoApproved: boolean
  }
}

const APPROVED_DECISION_TYPES = new Set(["approved", "approved_conditional"])

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

    const includeOwned = parseBoolean(
      new URL(req.url).searchParams.get("includeOwned")
    )
    const limit = parseLimit(new URL(req.url).searchParams.get("limit"))

    const supabase = getSupabaseAdminClient()

    const [holdings, listings, shortlist, targets, memos, deals] =
      await Promise.all([
        getHoldingsByInvestor(investorId),
        listListings(investor.tenantId),
        supabase
          .from("shortlists")
          .select("id")
          .eq("investor_id", investorId)
          .maybeSingle(),
        supabase
          .from("market_signal_target")
          .select("signal_id, relevance_score, status, reason")
          .eq("org_id", investor.tenantId)
          .eq("investor_id", investorId)
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("memos")
          .select("id, listing_id, state, updated_at")
          .eq("tenant_id", investor.tenantId)
          .eq("investor_id", investorId)
          .not("listing_id", "is", null),
        supabase
          .from("deal_rooms")
          .select("id, property_id, status, updated_at")
          .eq("tenant_id", investor.tenantId)
          .eq("investor_id", investorId)
          .not("property_id", "is", null),
      ])

    if (targets.error) throw targets.error
    if (memos.error) throw memos.error
    if (deals.error) throw deals.error
    if (shortlist.error) throw shortlist.error

    const shortlistId = shortlist.data?.id ?? null
    const shortlistItemsResult = shortlistId
      ? await supabase
          .from("shortlist_items")
          .select("listing_id, match_score, match_explanation, rank, added_at")
          .eq("shortlist_id", shortlistId)
          .order("rank", { ascending: true })
      : { data: [] as ShortlistItemRow[], error: null }

    if (shortlistItemsResult.error) throw shortlistItemsResult.error

    const targetRows = (targets.data ?? []) as SignalTargetRow[]
    const signalIds = [
      ...new Set(targetRows.map((target) => target.signal_id).filter(Boolean)),
    ]

    const signalRows = signalIds.length
      ? await supabase
          .from("market_signal")
          .select(
            "id, type, status, severity, geo_name, geo_id, created_at, evidence, metadata"
          )
          .eq("org_id", investor.tenantId)
          .in("id", signalIds)
      : { data: [] as SignalRow[], error: null }

    if (signalRows.error) throw signalRows.error

    const mandate = parseMandate(investor.mandate)
    const listingById = new Map(
      listings.map((listing) => [listing.id, listing as ListingLike])
    )
    const ownedListingIds = new Set(holdings.map((holding) => holding.listingId))
    const shortlistByListing = new Map<string, ShortlistItemRow>(
      ((shortlistItemsResult.data ?? []) as ShortlistItemRow[]).map((item) => [
        item.listing_id,
        item,
      ])
    )

    const memoRows = (memos.data ?? []) as MemoRow[]
    const decisionRows = await fetchMemoDecisions(supabase, memoRows)
    const approvedMemoIds = new Set(
      decisionRows
        .filter((row) => APPROVED_DECISION_TYPES.has(row.decision_type))
        .map((row) => row.memo_id)
    )

    const memoByListing = new Map<
      string,
      { state: string; memoId: string; updatedAt: string; isApproved: boolean }
    >()
    for (const memo of memoRows) {
      if (!memo.listing_id) continue
      const isApproved = approvedMemoIds.has(memo.id)
      const existing = memoByListing.get(memo.listing_id)
      if (!existing || new Date(memo.updated_at) > new Date(existing.updatedAt)) {
        memoByListing.set(memo.listing_id, {
          state: memo.state,
          memoId: memo.id,
          updatedAt: memo.updated_at,
          isApproved,
        })
      }
    }

    const dealsByListing = new Map<string, DealRow>(
      ((deals.data ?? []) as DealRow[])
        .filter((deal): deal is DealRow & { property_id: string } => !!deal.property_id)
        .map((deal) => [deal.property_id, deal])
    )

    const signalById = new Map(
      ((signalRows.data ?? []) as SignalRow[]).map((signal) => [signal.id, signal])
    )
    const listingSignals = new Map<string, OpportunityRecord["sources"]["signals"]>()
    const areaSignals = new Map<string, number>()

    for (const target of targetRows) {
      const signal = signalById.get(target.signal_id)
      if (!signal) continue

      const candidateListingId = extractSignalListingId(signal, target.reason)
      const areaKey = normalizeArea(signal.geo_name)
      if (areaKey) {
        areaSignals.set(
          areaKey,
          Math.max(areaSignals.get(areaKey) ?? 0, target.relevance_score ?? 0)
        )
      }

      if (!candidateListingId) continue
      if (!listingById.has(candidateListingId)) continue

      const current = listingSignals.get(candidateListingId) ?? []
      current.push({
        signalId: signal.id,
        type: signal.type,
        status: signal.status,
        severity: signal.severity,
        targetStatus: target.status,
        relevanceScore: target.relevance_score ?? 0,
        geoName: signal.geo_name,
        createdAt: signal.created_at,
      })
      listingSignals.set(candidateListingId, current)
    }

    const opportunities: OpportunityRecord[] = []
    for (const listing of listings) {
      const listingId = listing.id
      const shortlistState = shortlistByListing.get(listingId)
      const signalsForListing = listingSignals.get(listingId) ?? []
      const mandateEval = scoreMandateMatch(listing, mandate)
      const areaSignalRelevance = areaSignals.get(normalizeArea(listing.area) ?? "") ?? 0
      const directSignalRelevance = signalsForListing.reduce(
        (max, signal) => Math.max(max, signal.relevanceScore),
        0
      )
      const signalRelevance = Math.max(directSignalRelevance, areaSignalRelevance)
      const shortlistMatch = shortlistState?.match_score ?? 0
      const isOwned = ownedListingIds.has(listingId)
      const deal = dealsByListing.get(listingId)
      const memo = memoByListing.get(listingId)

      const hasRelevantSignals = signalRelevance > 0
      const includeBySource =
        mandateEval.score > 0 ||
        !!shortlistState ||
        hasRelevantSignals ||
        deal !== undefined ||
        memo !== undefined ||
        isOwned

      if (!includeBySource) continue
      if (!includeOwned && isOwned) continue

      const combined = computeCombinedScore({
        mandate: mandateEval.score,
        signal: signalRelevance,
        shortlist: shortlistMatch,
      })

      opportunities.push({
        listingId,
        property: {
          id: listing.id,
          title: listing.title,
          area: listing.area ?? null,
          type: listing.type ?? null,
          status: listing.status,
          price: listing.price ?? null,
          size: listing.size ?? null,
          bedrooms: listing.bedrooms ?? null,
          bathrooms: listing.bathrooms ?? null,
          imageUrl: listing.imageUrl ?? null,
        },
        scores: {
          combined,
          mandateMatch: mandateEval.score,
          signalRelevance,
          shortlistMatch,
        },
        sources: {
          mandate: {
            matched: mandateEval.score > 0,
            reasons: mandateEval.reasons,
          },
          shortlist: {
            inShortlist: !!shortlistState,
            rank: shortlistState?.rank ?? null,
            matchScore: shortlistState?.match_score ?? null,
            matchExplanation: shortlistState?.match_explanation ?? null,
            addedAt: shortlistState?.added_at ?? null,
          },
          signals: signalsForListing.sort(
            (a, b) => b.relevanceScore - a.relevanceScore
          ),
        },
        lifecycle: {
          stage: resolveLifecycleStage({
            isOwned,
            isInDeal: !!deal,
            isShortlisted: !!shortlistState,
            hasMemo: !!memo,
          }),
          isOwned,
          isShortlisted: !!shortlistState,
          isInDeal: !!deal,
          isMemoApproved: memo?.isApproved ?? false,
        },
      })
    }

    opportunities.sort((a, b) => b.scores.combined - a.scores.combined)
    const items = opportunities.slice(0, limit)

    return NextResponse.json({
      investorId,
      tenantId: investor.tenantId,
      filters: {
        includeOwned,
        limit,
      },
      counts: {
        total: opportunities.length,
        shortlisted: opportunities.filter((item) => item.lifecycle.isShortlisted)
          .length,
        inDeal: opportunities.filter((item) => item.lifecycle.isInDeal).length,
        ownedIncluded: opportunities.filter((item) => item.lifecycle.isOwned)
          .length,
      },
      items,
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

async function fetchMemoDecisions(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  memos: MemoRow[]
): Promise<DecisionRow[]> {
  const memoIds = memos.map((memo) => memo.id).filter(Boolean)
  if (!memoIds.length) return []

  const { data, error } = await supabase
    .from("decisions")
    .select("memo_id, decision_type")
    .in("memo_id", memoIds)

  if (error) {
    console.warn("[investor-opportunities] Failed loading decisions:", error.message)
    return []
  }

  return (data ?? []) as DecisionRow[]
}

function parseMandate(value: unknown): Mandate | null {
  if (!value || typeof value !== "object") return null
  return value as Mandate
}

function parseBoolean(value: string | null): boolean {
  if (!value) return false
  return value === "1" || value.toLowerCase() === "true"
}

function parseLimit(value: string | null): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 50
  return Math.min(200, Math.max(1, Math.round(parsed)))
}

function normalize(value?: string | null): string {
  return value?.trim().toLowerCase() ?? ""
}

function normalizeArea(value?: string | null): string | null {
  const normalized = normalize(value)
  return normalized.length > 0 ? normalized : null
}

function scoreMandateMatch(
  listing: ListingLike,
  mandate: Mandate | null
): { score: number; reasons: string[] } {
  if (!mandate) return { score: 0, reasons: [] }

  let score = 0
  const reasons: string[] = []

  if (mandate.propertyTypes?.length && listing.type) {
    const listingType = normalize(listing.type)
    const typeMatch = mandate.propertyTypes.some(
      (propertyType) =>
        listingType === normalize(propertyType) ||
        listingType.includes(normalize(propertyType))
    )
    if (typeMatch) {
      score += 30
      reasons.push(`Matches preferred type (${listing.type})`)
    }
  }

  if (mandate.preferredAreas?.length && listing.area) {
    const listingArea = normalize(listing.area)
    const areaMatch = mandate.preferredAreas.some(
      (preferredArea) =>
        listingArea === normalize(preferredArea) ||
        listingArea.includes(normalize(preferredArea))
    )
    if (areaMatch) {
      score += 25
      reasons.push(`Matches preferred area (${listing.area})`)
    }
  }

  if (typeof listing.price === "number" && listing.price > 0) {
    const min = mandate.minInvestment ?? 0
    const max = mandate.maxInvestment ?? Number.MAX_SAFE_INTEGER
    if (listing.price >= min && listing.price <= max) {
      score += 25
      reasons.push("Within mandate budget")
    } else {
      const nearest =
        listing.price < min
          ? Math.abs(min - listing.price) / Math.max(min, 1)
          : Math.abs(listing.price - max) / Math.max(max, 1)
      if (nearest <= 0.15) {
        score += 10
        reasons.push("Near mandate budget range")
      }
    }
  }

  if (mandate.preferredBedrooms?.length && typeof listing.bedrooms === "number") {
    if (mandate.preferredBedrooms.includes(listing.bedrooms)) {
      score += 10
      reasons.push(`Matches preferred bedrooms (${listing.bedrooms}BR)`)
    }
  }

  if (typeof listing.size === "number" && listing.size > 0) {
    const minSize = mandate.minSize
    const maxSize = mandate.maxSize
    if (
      (typeof minSize !== "number" || listing.size >= minSize) &&
      (typeof maxSize !== "number" || listing.size <= maxSize)
    ) {
      score += 10
      reasons.push("Matches size range")
    }
  }

  return { score: Math.min(100, Math.round(score)), reasons }
}

function computeCombinedScore(parts: {
  mandate: number
  signal: number
  shortlist: number
}): number {
  const weighted =
    parts.mandate * 0.5 + Math.min(parts.signal, 100) * 0.3 + parts.shortlist * 0.2
  return Math.round(weighted)
}

function resolveLifecycleStage(args: {
  isOwned: boolean
  isInDeal: boolean
  isShortlisted: boolean
  hasMemo: boolean
}): OpportunityRecord["lifecycle"]["stage"] {
  if (args.isOwned) return "holding"
  if (args.isInDeal) return "deal"
  if (args.hasMemo) return "memo"
  if (args.isShortlisted) return "shortlisted"
  return "recommended"
}

function extractSignalListingId(
  signal: SignalRow,
  reason: Record<string, unknown> | null
): string | null {
  const evidence = signal.evidence ?? {}
  const metadata = signal.metadata ?? {}

  const candidates = [
    evidence.listing_id,
    evidence.listingId,
    metadata.listing_id,
    metadata.listingId,
    reason?.listing_id,
    reason?.listingId,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate
    }
  }

  return null
}
