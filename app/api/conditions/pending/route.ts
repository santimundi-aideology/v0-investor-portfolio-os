import { NextResponse } from "next/server"

import { getSupabaseAdminClient } from "@/lib/db/client"
import { getInvestorById } from "@/lib/db/investors"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError } from "@/lib/security/rbac"

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthContext(req)
    const tenantId = ctx.tenantId!

    if (ctx.role === "investor") throw new AccessError("Forbidden")

    const supabase = getSupabaseAdminClient()
    const { data: decisions, error } = await supabase
      .from("decisions")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("decision_type", "approved_conditional")
      .eq("resolved_status", "pending")
    if (error) throw error

    const items: {
      memoId: string
      investorId: string
      listingId: string | null
      conditionText: string | null
      deadline: string | null
      decidedAt: string
    }[] = []

    for (const d of decisions ?? []) {
      const { data: memo } = await supabase
        .from("memos")
        .select("*")
        .eq("id", d.memo_id)
        .maybeSingle()
      if (!memo) continue
      const investor = await getInvestorById(memo.investor_id)
      if (!investor) continue

      if (ctx.role === "agent" && investor.assignedAgentId !== ctx.userId) continue

      items.push({
        memoId: memo.id,
        investorId: investor.id,
        listingId: memo.listing_id,
        conditionText: d.condition_text,
        deadline: d.deadline,
        decidedAt: d.created_at,
      })
    }

    return NextResponse.json(items)
  } catch (err) {
    return handleError(err)
  }
}

function handleError(err: unknown) {
  if (err instanceof AccessError) {
    return NextResponse.json({ error: err.message }, { status: err.status })
  }
  return NextResponse.json({ error: "Internal error" }, { status: 500 })
}

