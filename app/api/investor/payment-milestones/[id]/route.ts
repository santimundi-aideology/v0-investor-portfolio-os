import { NextResponse } from "next/server"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError } from "@/lib/security/rbac"
import { getSupabaseAdminClient } from "@/lib/db/client"

/**
 * PATCH /api/investor/payment-milestones/[id]
 * Mark a milestone as paid (investor self-service).
 * Body: { paidDate?: string } optional ISO date; defaults to today.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuthContext(req)
    const investorId = ctx.investorId

    if (!investorId) {
      return NextResponse.json({ error: "No investor context" }, { status: 400 })
    }

    const { id: milestoneId } = await params
    if (!milestoneId) {
      return NextResponse.json({ error: "Milestone ID required" }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const paidDate = (body.paidDate as string) || new Date().toISOString().slice(0, 10)

    const supabase = getSupabaseAdminClient()

    // Get milestone and verify it belongs to investor's holding
    const { data: milestone, error: fetchError } = await supabase
      .from("payment_milestones")
      .select("id, holding_id, status")
      .eq("id", milestoneId)
      .single()

    if (fetchError || !milestone) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 })
    }

    const { data: holding } = await supabase
      .from("holdings")
      .select("id")
      .eq("id", milestone.holding_id)
      .eq("investor_id", investorId)
      .single()

    if (!holding) {
      return NextResponse.json({ error: "Not authorized to update this milestone" }, { status: 403 })
    }

    if (milestone.status === "paid") {
      return NextResponse.json({ error: "Milestone is already marked as paid" }, { status: 400 })
    }

    const { data: updated, error: updateError } = await supabase
      .from("payment_milestones")
      .update({ status: "paid", paid_date: paidDate })
      .eq("id", milestoneId)
      .select()
      .single()

    if (updateError) {
      console.error("[payment-milestones PATCH] Error:", updateError)
      return NextResponse.json({ error: "Failed to update milestone" }, { status: 500 })
    }

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      paid_date: updated.paid_date,
    })
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[payment-milestones PATCH] Error:", err)
    return NextResponse.json({ error: "Failed to update milestone" }, { status: 500 })
  }
}
