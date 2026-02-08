import { NextResponse } from "next/server"

import { AuditEvents, createAuditEventWriter } from "@/lib/audit"
import { listDealRooms, createDealRoom } from "@/lib/db/deal-rooms"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError, assertTenantScope } from "@/lib/security/rbac"

/**
 * GET /api/deal-rooms
 * List deal rooms for the current tenant.
 * Supports optional filters: ?stage=, ?investorId=, ?agentId=
 */
export async function GET(req: Request) {
  try {
    const ctx = await requireAuthContext(req)
    const tenantId = ctx.tenantId!
    assertTenantScope(tenantId, ctx)

    const url = new URL(req.url)
    const stage = url.searchParams.get("stage") ?? undefined
    const investorId = url.searchParams.get("investorId") ?? undefined
    const agentId = url.searchParams.get("agentId") ?? undefined

    // Investors can only see their own deal rooms
    const effectiveInvestorId =
      ctx.role === "investor" ? ctx.investorId : investorId

    // Agents can only see deal rooms assigned to them (unless manager/super_admin)
    const effectiveAgentId =
      ctx.role === "agent" ? ctx.userId : agentId

    const deals = await listDealRooms(tenantId, {
      stage,
      investorId: effectiveInvestorId,
      assignedAgentId: ctx.role === "agent" ? effectiveAgentId : undefined,
    })

    return NextResponse.json(deals)
  } catch (err) {
    return handleError(err)
  }
}

/**
 * POST /api/deal-rooms
 * Create a new deal room.
 */
export async function POST(req: Request) {
  try {
    const ctx = await requireAuthContext(req)
    if (ctx.role === "investor") {
      throw new AccessError("Investors cannot create deal rooms")
    }
    assertTenantScope(ctx.tenantId!, ctx)

    const body = await req.json()

    if (!body.title || typeof body.title !== "string") {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    const record = await createDealRoom({
      tenantId: ctx.tenantId!,
      title: body.title,
      propertyId: body.propertyId ?? null,
      investorId: body.investorId ?? null,
      investorName: body.investorName ?? null,
      propertyTitle: body.propertyTitle ?? null,
      status: body.status ?? "preparation",
      ticketSizeAed: body.ticketSizeAed ?? null,
      offerPriceAed: body.offerPriceAed ?? null,
      targetCloseDate: body.targetCloseDate ?? null,
      probability: body.probability ?? null,
      priority: body.priority ?? "medium",
      nextStep: body.nextStep ?? null,
      summary: body.summary ?? null,
      assignedAgentId: ctx.role === "agent" ? ctx.userId : (body.assignedAgentId ?? ctx.userId),
      parties: body.parties ?? [],
      checklist: body.checklist ?? [],
      timeline: body.timeline ?? [],
      notes: body.notes ?? null,
    })

    if (!record) throw new Error("Failed to create deal room")

    const write = createAuditEventWriter()
    await write(
      AuditEvents.dealRoomCreated({
        tenantId: ctx.tenantId!,
        actorId: ctx.userId,
        role: ctx.role,
        dealRoomId: record.id,
      }),
    )

    return NextResponse.json(record, { status: 201 })
  } catch (err) {
    return handleError(err)
  }
}

function handleError(err: unknown) {
  if (err instanceof AccessError) {
    return NextResponse.json({ error: err.message }, { status: err.status })
  }
  console.error("[deal-rooms]", err)
  return NextResponse.json({ error: "Internal error" }, { status: 500 })
}
