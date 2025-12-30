import { NextResponse } from "next/server"

import { getMemo, resolveShareToken, saveMemo, store } from "@/lib/data/store"
import { transitionMemo } from "@/lib/domain/memos"

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const share = resolveShareToken((await params).token)
  if (!share) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const memo = getMemo(share.memoId)
  if (!memo) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (!["sent", "opened", "decided"].includes(memo.state)) return NextResponse.json({ error: "Not available" }, { status: 403 })

  // idempotent sent->opened
  if (memo.state === "sent") {
    const next = transitionMemo(memo, "opened")
    saveMemo(next)
  }

  return NextResponse.json({ memoId: memo.id, investorId: memo.investorId, tenantId: store.tenantId })
}

