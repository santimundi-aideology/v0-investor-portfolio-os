import { NextResponse } from "next/server"

import { getInvestor, store } from "@/lib/data/store"
import { AccessError, buildRequestContext } from "@/lib/security/rbac"

export async function GET(req: Request) {
  try {
    const ctx = buildRequestContext(req as any)
    if (ctx.role !== "investor") throw new AccessError("Investor access only")
    if (!ctx.investorId) throw new AccessError("Missing investor scope")
    const investor = getInvestor(ctx.investorId)
    if (!investor) throw new AccessError("Investor not found")
    if (investor.tenantId !== store.tenantId) throw new AccessError("Cross-tenant access denied")

    const memos = store.memos.filter(
      (m) => m.investorId === ctx.investorId && ["sent", "opened", "decided"].includes(m.state),
    )
    return NextResponse.json(memos)
  } catch (err) {
    return handleError(err)
  }
}

function handleError(err: unknown) {
  if (err instanceof AccessError) return NextResponse.json({ error: err.message }, { status: err.status })
  return NextResponse.json({ error: "Internal error" }, { status: 500 })
}

