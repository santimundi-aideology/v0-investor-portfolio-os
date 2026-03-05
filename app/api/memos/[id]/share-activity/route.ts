import "server-only"

import { NextResponse } from "next/server"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError } from "@/lib/security/rbac"
import { getMemoById } from "@/lib/db/memos"
import { getShareTokensForMemo } from "@/lib/db/share-tokens"

/**
 * GET /api/memos/[id]/share-activity
 *
 * Returns all share events for a memo so the realtor can see
 * who was shared, via which channel, and engagement stats.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuthContext(req)
    if (ctx.role !== "agent" && ctx.role !== "manager" && ctx.role !== "super_admin") {
      throw new AccessError("Only agents and managers can view share activity")
    }

    const memoId = (await params).id
    const memo = await getMemoById(memoId)
    if (!memo) {
      return NextResponse.json({ error: "Memo not found" }, { status: 404 })
    }

    const tokens = await getShareTokensForMemo(memo.tenantId, memoId)

    const shares = tokens.map((t) => ({
      id: t.id,
      method: t.share_method,
      recipientContact: t.recipient_contact,
      createdAt: t.created_at,
      expiresAt: t.expires_at,
      openedAt: t.opened_at,
      openedCount: t.opened_count,
      lastOpenedAt: t.last_opened_at,
      clickedAt: t.clicked_at,
    }))

    return NextResponse.json({ shares })
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[share-activity] Error:", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
