import "server-only"
import { NextResponse } from "next/server"

import { AuditEvents, createAuditEventWriter } from "@/lib/audit"
import { getMemoById } from "@/lib/db/memos"
import { getInvestorById } from "@/lib/db/investors"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError, assertMemoAccess } from "@/lib/security/rbac"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { batchInsertNotifications } from "@/lib/db/notifications"

/**
 * POST /api/memos/[id]/send-vantage
 *
 * Internal "send to investor on Vantage" — assigns the investor (if changed)
 * and transitions the memo to "sent" so it appears in the investor's dashboard.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuthContext(req)
    if (ctx.role !== "agent" && ctx.role !== "manager" && ctx.role !== "super_admin") {
      throw new AccessError("Only agents and managers can send memos on Vantage")
    }

    const memoId = (await params).id
    const memo = await getMemoById(memoId)
    if (!memo) {
      return NextResponse.json({ error: "Memo not found" }, { status: 404 })
    }

    const body = (await req.json().catch(() => null)) as {
      investorId?: string
    } | null

    const targetInvestorId = body?.investorId || memo.investorId
    if (!targetInvestorId) {
      return NextResponse.json(
        { error: "No investor selected. Please choose an investor before sending." },
        { status: 400 }
      )
    }

    const investor = await getInvestorById(targetInvestorId)
    if (!investor) {
      return NextResponse.json({ error: "Investor not found" }, { status: 404 })
    }

    assertMemoAccess(
      { tenantId: memo.tenantId, investorId: targetInvestorId },
      ctx,
      investor
    )

    const supabase = getSupabaseAdminClient()

    const { data: updated, error } = await supabase
      .from("memos")
      .update({
        investor_id: targetInvestorId,
        state: "sent",
        updated_at: new Date().toISOString(),
      })
      .eq("id", memoId)
      .eq("tenant_id", memo.tenantId)
      .select("id, state, investor_id, updated_at")
      .single()

    if (error) throw error

    // Best-effort notification for the investor's owner user
    if (investor.ownerUserId) {
      await batchInsertNotifications([
        {
          org_id: memo.tenantId,
          recipient_user_id: investor.ownerUserId,
          entity_type: "memo",
          entity_id: memoId,
          title: "New IC Memo available",
          body: `A new investment committee memo has been shared with you on Vantage.`,
          notification_key: `memo_sent_vantage_${memoId}_${targetInvestorId}`,
        },
      ]).catch((e) => console.warn("[send-vantage] Notification insert failed:", e))
    }

    // Audit
    const write = createAuditEventWriter()
    await write(
      AuditEvents.memoSent({
        tenantId: memo.tenantId,
        actorId: ctx.userId,
        role: ctx.role,
        memoId,
        investorId: targetInvestorId,
        version: memo.currentVersion,
      })
    ).catch((e) => console.warn("[send-vantage] Audit write failed:", e))

    return NextResponse.json({
      memo: updated,
      investorName: investor.name,
      sentAt: updated.updated_at,
    })
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[send-vantage] Error:", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
