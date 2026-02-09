import { NextResponse } from "next/server"

import { AuditEvents, createAuditEventWriter } from "@/lib/audit"
import { createMemo } from "@/lib/db/memo-ops"
import { getInvestorById } from "@/lib/db/investors"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError, assertInvestorAccess } from "@/lib/security/rbac"

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthContext(req)
    const supabase = getSupabaseAdminClient()
    const tenantId = ctx.tenantId!
    if (ctx.role === "investor") {
      const { data, error } = await supabase
        .from("memos")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("investor_id", ctx.investorId)
      if (error) throw error
      return NextResponse.json(data ?? [])
    }
    if (ctx.role === "agent") {
      const { data: investors } = await supabase
        .from("investors")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("assigned_agent_id", ctx.userId)
      const investorIds = (investors ?? []).map((i: { id: string }) => i.id)
      if (investorIds.length === 0) return NextResponse.json([])
      const { data, error } = await supabase
        .from("memos")
        .select("*")
        .eq("tenant_id", tenantId)
        .in("investor_id", investorIds)
      if (error) throw error
      return NextResponse.json(data ?? [])
    }
    const { data, error } = await supabase
      .from("memos")
      .select("*")
      .eq("tenant_id", tenantId)
    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthContext(req)
    const body = await req.json()
    const investor = await getInvestorById(body.investorId)
    if (!investor) throw new AccessError("Investor not found")
    assertInvestorAccess(investor, ctx)

    if (ctx.role === "investor") throw new AccessError("Investors cannot create memos")

    const memo = await createMemo({
      investorId: body.investorId,
      listingId: body.listingId,
      underwritingId: body.underwritingId,
      content: body.content ?? {},
      createdBy: ctx.userId,
    })

    const write = createAuditEventWriter()
    await write(
      AuditEvents.memoCreated({
        tenantId: memo.tenantId,
        actorId: ctx.userId,
        role: ctx.role,
        memoId: memo.id,
      }),
    )

    return NextResponse.json(memo, { status: 201 })
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

