import { NextResponse } from "next/server"

import { requireAuthContext } from "@/lib/auth/server"
import { AccessError } from "@/lib/security/rbac"
import { getSupabaseAdminClient } from "@/lib/db/client"

/**
 * GET /api/investor/memos
 * Returns memos for the authenticated investor from Supabase.
 * Joins with memo_versions for content, listings for property details, and decisions for status.
 */
export async function GET(req: Request) {
  try {
    const ctx = await requireAuthContext(req)
    if (ctx.role !== "investor") throw new AccessError("Investor access only")
    if (!ctx.investorId) throw new AccessError("Missing investor scope")

    const supabase = getSupabaseAdminClient()

    // Verify investor belongs to the tenant
    const { data: investor, error: investorError } = await supabase
      .from("investors")
      .select("id, tenant_id, name")
      .eq("id", ctx.investorId)
      .maybeSingle()

    if (investorError || !investor) {
      throw new AccessError("Investor not found")
    }

    if (ctx.tenantId && investor.tenant_id !== ctx.tenantId) {
      throw new AccessError("Cross-tenant access denied")
    }

    // Fetch memos for this investor with related data
    const { data: memos, error: memosError } = await supabase
      .from("memos")
      .select(`
        id,
        tenant_id,
        investor_id,
        listing_id,
        state,
        current_version,
        created_by,
        created_at,
        updated_at
      `)
      .eq("investor_id", ctx.investorId)
      .in("state", ["sent", "opened", "decided"])
      .order("updated_at", { ascending: false })

    if (memosError) {
      console.error("[investor/memos] Error fetching memos:", memosError)
      return NextResponse.json({ error: "Failed to fetch memos" }, { status: 500 })
    }

    const memoList = memos ?? []

    // Batch-fetch all related data in 3 parallel queries instead of N×3 queries
    const listingIds = memoList.map((m) => m.listing_id).filter(Boolean) as string[]
    const memoIds = memoList.map((m) => m.id)

    const [listingsResult, versionsResult, decisionsResult] = await Promise.all([
      listingIds.length
        ? supabase.from("listings").select("id, title, area, price").in("id", listingIds)
        : Promise.resolve({ data: [] as { id: string; title: string; area: string; price: string | number | null }[], error: null }),
      supabase
        .from("memo_versions")
        .select("memo_id, version, content")
        .in("memo_id", memoIds)
        .order("version", { ascending: false }),
      supabase
        .from("decisions")
        .select("memo_id, decision_type, created_at")
        .in("memo_id", memoIds)
        .eq("investor_id", ctx.investorId!)
        .order("created_at", { ascending: false }),
    ])

    // Build lookup maps
    const listingMap = new Map((listingsResult.data ?? []).map((l) => [l.id, l]))

    // Keep only the latest version per memo (results are ordered desc)
    const versionMap = new Map<string, { content: Record<string, unknown> }>()
    for (const v of versionsResult.data ?? []) {
      if (!versionMap.has(v.memo_id)) {
        versionMap.set(v.memo_id, { content: v.content as Record<string, unknown> })
      }
    }

    // Keep only the latest decision per memo
    const decisionMap = new Map<string, { type: string; createdAt: string }>()
    for (const d of decisionsResult.data ?? []) {
      if (!decisionMap.has(d.memo_id)) {
        decisionMap.set(d.memo_id, { type: d.decision_type, createdAt: d.created_at })
      }
    }

    // Enrich memos with listing details and latest version content
    const enrichedMemos = memoList.map((memo) => {
      const listing = memo.listing_id ? listingMap.get(memo.listing_id) : null
      const propertyTitle = listing?.title ?? null
      const propertyArea = listing?.area ?? null
      const propertyPrice = listing?.price != null ? Number(listing.price) : null

      let title = propertyTitle ? `IC Memo: ${propertyTitle}` : "Investment Committee Memo"
      let summary: string | null = null

      const version = versionMap.get(memo.id)
      if (version?.content) {
        const content = version.content
        if (content.title) title = content.title as string
        if (content.summary) summary = content.summary as string
      }

      const decision = decisionMap.get(memo.id) ?? null

      const statusMap: Record<string, string> = {
        draft: "draft",
        pending_review: "review",
        ready: "ready",
        sent: "pending",
        opened: "pending",
        decided: decision?.type ?? "decided",
      }

      return {
        id: memo.id,
        title,
        summary,
        status: statusMap[memo.state] ?? memo.state,
        state: memo.state,
        investorId: memo.investor_id,
        listingId: memo.listing_id,
        propertyTitle,
        propertyArea,
        propertyPrice,
        currentVersion: memo.current_version,
        decision,
        createdAt: memo.created_at,
        updatedAt: memo.updated_at,
      }
    })

    return NextResponse.json(enrichedMemos)
  } catch (err) {
    return handleError(err)
  }
}

function handleError(err: unknown) {
  if (err instanceof AccessError) return NextResponse.json({ error: err.message }, { status: err.status })
  console.error("[investor/memos] Unexpected error:", err)
  return NextResponse.json({ error: "Internal error" }, { status: 500 })
}
