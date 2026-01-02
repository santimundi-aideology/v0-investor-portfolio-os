import "server-only"

import { NextResponse } from "next/server"

import { createAuditEventWriter } from "@/lib/audit"
import { buildRequestContext } from "@/lib/security/rbac"
import { updateMarketSignalStatus } from "@/lib/db/market-signals"

type Body = {
  tenantId?: string
}

/**
 * POST /api/signals/:id/acknowledge
 *
 * Marks a signal acknowledged (triaged).
 * Idempotent: re-posting keeps status='acknowledged'.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    let tenantId: string | undefined
    let actorUserId: string | undefined
    let actorRole: string | undefined
    try {
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

    const updated = await updateMarketSignalStatus({ tenantId, signalId: id, status: "acknowledged", actorUserId: actorUserId ?? null })
    if (!updated) return NextResponse.json({ ok: false, error: "Signal not found" }, { status: 404 })

    const writeAudit = createAuditEventWriter()
    await writeAudit({
      tenantId,
      actorId: actorUserId,
      // @ts-expect-error keep audit stable even if role is missing
      actorRole,
      eventType: "market_signal.acknowledged",
      objectType: "market_signal",
      objectId: id,
    })

    return NextResponse.json({ ok: true, id, status: "acknowledged" }, { status: 200 })
  } catch (e) {
    const error = e as Error
    return NextResponse.json({ ok: false, error: error?.message ?? String(e) }, { status: 500 })
  }
}


