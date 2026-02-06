import { NextResponse } from "next/server"
import { randomUUID } from "crypto"

import { AuditEvents, createAuditEventWriter } from "@/lib/audit"
import { getMemoById } from "@/lib/db/memos"
import { getInvestorById } from "@/lib/db/investors"
import { createShareToken } from "@/lib/db/share-tokens"
import { transitionMemo } from "@/lib/domain/memos"
import { AccessError, assertMemoAccess, buildRequestContext } from "@/lib/security/rbac"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { memoShareSchema } from "@/lib/validation/schemas"
import { validateRequest } from "@/lib/validation/helpers"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = buildRequestContext(req)
    if (ctx.role !== "agent" && ctx.role !== "super_admin") {
      throw new AccessError("Only agents can share memos")
    }

    const memoId = (await params).id
    const memo = await getMemoById(memoId)
    if (!memo) {
      return NextResponse.json({ error: "Memo not found" }, { status: 404 })
    }

    // Get investor
    const investor = await getInvestorById(memo.investorId)
    if (!investor) {
      return NextResponse.json({ error: "Investor not found" }, { status: 404 })
    }

    assertMemoAccess(
      { tenantId: memo.tenantId, investorId: memo.investorId },
      ctx,
      investor
    )

    const validation = await validateRequest(req, memoShareSchema)
    if (!validation.success) {
      return validation.error
    }

    const { method, recipientContact, message } = validation.data

    // Get current user for created_by
    const supabase = getSupabaseAdminClient()
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("auth_user_id", ctx.userId)
      .maybeSingle()

    // Transition memo to "sent" state
    const updatedMemo = await transitionMemoToSent(memoId, memo.tenantId)

    // Create share token
    const shareToken = await createShareToken({
      tenantId: memo.tenantId,
      memoId: memo.id,
      investorId: memo.investorId,
      shareMethod: method,
      recipientContact: recipientContact ?? investor.email ?? investor.phone ?? undefined,
      createdBy: user?.id ?? undefined,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      metadata: {
        message,
        sharedBy: ctx.userId,
      },
    })

    // Build share URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const shareUrl = `${baseUrl}/investor/share/${shareToken.token}`

    // Generate WhatsApp/Email share links
    let shareLink: string | null = null
    const shareText = message || `Check out this investment opportunity: ${shareUrl}`

    if (method === "whatsapp") {
      const phone = recipientContact || investor.phone || investor.whatsapp
      if (phone) {
        const cleanPhone = phone.replace(/[^0-9]/g, "")
        shareLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(shareText)}`
      }
    } else if (method === "email") {
      const email = recipientContact || investor.email
      if (email) {
        const subject = encodeURIComponent("Investment Opportunity")
        const body = encodeURIComponent(shareText)
        shareLink = `mailto:${email}?subject=${subject}&body=${body}`
      }
    }

    // Audit log
    const write = createAuditEventWriter()
    await write(
      AuditEvents.memoSent({
        tenantId: memo.tenantId,
        actorId: ctx.userId,
        role: ctx.role,
        memoId: memo.id,
        investorId: memo.investorId,
        version: memo.currentVersion,
      })
    )

    return NextResponse.json({
      memo: updatedMemo,
      shareToken: {
        token: shareToken.token,
        method: shareToken.share_method,
        shareUrl,
        shareLink, // WhatsApp/Email link if applicable
        expiresAt: shareToken.expires_at,
      },
    })
  } catch (err) {
    return handleError(err)
  }
}

async function transitionMemoToSent(memoId: string, tenantId: string) {
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from("memos")
    .update({ state: "sent", updated_at: new Date().toISOString() })
    .eq("id", memoId)
    .eq("tenant_id", tenantId)
    .select("*")
    .single()

  if (error) throw error
  return data
}

function handleError(err: unknown) {
  if (err instanceof AccessError) {
    return NextResponse.json({ error: err.message }, { status: err.status })
  }
  console.error("[share] Error:", err)
  return NextResponse.json({ error: "Internal error" }, { status: 500 })
}
