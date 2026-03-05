import { NextResponse } from "next/server"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError, assertTenantScope } from "@/lib/security/rbac"
import { getSupabaseAdminClient } from "@/lib/db/client"
import {
  createPaymentMilestones,
  generateOffPlanMilestones,
  generateReadyMilestones,
  type MilestoneInput,
} from "@/lib/db/payment-milestones"

type RouteContext = { params: Promise<{ id: string }> }

/**
 * POST /api/holdings/:id/milestones
 * Accepts either explicit milestones or auto-generates them.
 *
 * Body options:
 *   { milestones: MilestoneInput[] }        — explicit
 *   { generate: "offplan", paymentPlan }     — from IC memo payment plan
 *   { generate: "ready" }                    — standard 3-step plan
 */
export async function POST(req: Request, { params }: RouteContext) {
  try {
    const ctx = await requireAuthContext(req)
    if (ctx.role === "investor") throw new AccessError("Investors cannot create milestones")

    const { id: holdingId } = await params

    const supabase = getSupabaseAdminClient()
    const { data: holding, error: hErr } = await supabase
      .from("holdings")
      .select("*")
      .eq("id", holdingId)
      .maybeSingle()

    if (hErr || !holding) {
      return NextResponse.json({ error: "Holding not found" }, { status: 404 })
    }

    assertTenantScope(holding.tenant_id as string, ctx)

    const body = await req.json()
    let rows: MilestoneInput[]

    if (Array.isArray(body.milestones)) {
      rows = body.milestones.map((m: MilestoneInput, i: number) => ({
        ...m,
        holdingId,
        sequenceOrder: m.sequenceOrder ?? i + 1,
      }))
    } else if (body.generate === "offplan" && body.paymentPlan) {
      rows = generateOffPlanMilestones(
        holdingId,
        Number(holding.purchase_price ?? 0),
        body.paymentPlan,
      )
    } else {
      rows = generateReadyMilestones(holdingId, Number(holding.purchase_price ?? 0))
    }

    const count = await createPaymentMilestones(rows)

    return NextResponse.json({ inserted: count }, { status: 201 })
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[holdings/:id/milestones]", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
