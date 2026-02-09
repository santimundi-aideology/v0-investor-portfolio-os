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
      .in("state", ["draft", "pending_review", "ready", "sent", "opened", "decided"])
      .order("updated_at", { ascending: false })

    if (memosError) {
      console.error("[investor/memos] Error fetching memos:", memosError)
      return NextResponse.json({ error: "Failed to fetch memos" }, { status: 500 })
    }

    // Enrich memos with listing details and latest version content
    const enrichedMemos = await Promise.all(
      (memos ?? []).map(async (memo) => {
        // Get listing details if available
        let propertyTitle: string | null = null
        let propertyArea: string | null = null
        let propertyPrice: number | null = null

        if (memo.listing_id) {
          const { data: listing } = await supabase
            .from("listings")
            .select("title, area, price")
            .eq("id", memo.listing_id)
            .maybeSingle()

          if (listing) {
            propertyTitle = listing.title
            propertyArea = listing.area
            propertyPrice = listing.price ? Number(listing.price) : null
          }
        }

        // Get latest memo version for title/summary
        let title = propertyTitle ? `IC Memo: ${propertyTitle}` : "Investment Committee Memo"
        let summary: string | null = null

        if (memo.current_version) {
          const { data: version } = await supabase
            .from("memo_versions")
            .select("content")
            .eq("memo_id", memo.id)
            .eq("version", memo.current_version)
            .maybeSingle()

          if (version?.content) {
            const content = version.content as Record<string, unknown>
            if (content.title) title = content.title as string
            if (content.summary) summary = content.summary as string
          }
        }

        // Get decision if any
        let decision: { type: string; createdAt: string } | null = null
        const { data: decisionData } = await supabase
          .from("decisions")
          .select("decision_type, created_at")
          .eq("memo_id", memo.id)
          .eq("investor_id", ctx.investorId!)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        if (decisionData) {
          decision = {
            type: decisionData.decision_type,
            createdAt: decisionData.created_at,
          }
        }

        // Map state to a status the UI expects
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
    )

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
