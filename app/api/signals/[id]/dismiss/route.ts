import "server-only"

import { NextResponse } from "next/server"

import { createAuditEventWriter } from "@/lib/audit"
import { buildRequestContext } from "@/lib/security/rbac"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { updateMarketSignalStatus } from "@/lib/db/market-signals"

type Body = {
  tenantId?: string
  reason?: string
}

/**
 * POST /api/signals/:id/dismiss
 *
 * Marks a signal dismissed at the signal level (global triage).
 * Also marks any existing `market_signal_target` rows as dismissed.
 *
 * Idempotent: re-posting keeps status='dismissed'.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = getSupabaseAdminClient()

    // Prefer RBAC context when headers are present; otherwise fall back to explicit tenantId in body.
    let tenantId: string | undefined
    let actorUserId: string | undefined
    let actorRole: string | undefined
    try {
      // buildRequestContext expects NextRequest; but in route handlers we can still pass Request with same header API
      const ctx = buildRequestContext(req)
      tenantId = ctx.tenantId
      actorUserId = ctx.userId
      actorRole = ctx.role
    } catch {
      // allow dev/demo calls without headers
    }

    const body = (await req.json().catch(() => ({}))) as Body
    tenantId = tenantId ?? body.tenantId

    if (!tenantId) return NextResponse.json({ ok: false, error: "tenantId required" }, { status: 400 })

    const updated = await updateMarketSignalStatus({ tenantId, signalId: id, status: "dismissed", actorUserId: actorUserId ?? null })
    if (!updated) return NextResponse.json({ ok: false, error: "Signal not found" }, { status: 404 })

    // Best-effort: mark targets dismissed too
    await supabase
      .from("market_signal_target")
      .update({ status: "dismissed", updated_at: new Date().toISOString() })
      .eq("org_id", tenantId)
      .eq("signal_id", id)

    // Audit trail (best-effort)
    const writeAudit = createAuditEventWriter()
    await writeAudit({
      tenantId,
      actorId: actorUserId,
      // @ts-expect-error keep audit stable even if role is missing
      actorRole,
      eventType: "market_signal.dismissed",
      objectType: "market_signal",
      objectId: id,
      metadata: body.reason ? { reason: body.reason } : undefined,
    })

    return NextResponse.json({ ok: true, id, status: "dismissed" }, { status: 200 })
  } catch (e) {
    const error = e as Error
    return NextResponse.json({ ok: false, error: error?.message ?? String(e) }, { status: 500 })
  }
}


