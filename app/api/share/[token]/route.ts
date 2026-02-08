import { NextResponse } from "next/server"
import { resolveShareToken, trackShareTokenClick } from "@/lib/db/share-tokens"
import { getMemoById } from "@/lib/db/memos"

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const token = (await params).token
  const share = await resolveShareToken(token)
  
  if (!share) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const memo = await getMemoById(share.memo_id)
  if (!memo) {
    return NextResponse.json({ error: "Memo not found" }, { status: 404 })
  }

  // Check if memo is in a shareable state
  if (!["sent", "opened", "decided"].includes(memo.state)) {
    return NextResponse.json({ error: "Not available" }, { status: 403 })
  }

  // Track click-through (when investor views the memo)
  await trackShareTokenClick(token)

  return NextResponse.json({
    memoId: memo.id,
    investorId: memo.investorId,
    tenantId: share.tenant_id,
    shareToken: {
      method: share.share_method,
      openedAt: share.opened_at,
      openedCount: share.opened_count,
      clickedAt: share.clicked_at,
    },
  })
}
