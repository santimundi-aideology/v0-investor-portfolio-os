import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"

/**
 * POST /api/dld/signals/[id]/outcome - Update signal outcome
 * 
 * Body: {
 *   outcome: 'invested' | 'passed' | 'expired' | 'converted'
 *   notes?: string
 *   dealId?: string
 *   propertyId?: string
 *   actualValue?: number
 *   roiPct?: number
 * }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { outcome, notes, dealId, propertyId, actualValue, roiPct } = body

    if (!outcome) {
      return NextResponse.json(
        { error: "Outcome is required" },
        { status: 400 }
      )
    }

    const validOutcomes = ["invested", "passed", "expired", "converted"]
    if (!validOutcomes.includes(outcome)) {
      return NextResponse.json(
        { error: `Invalid outcome. Must be one of: ${validOutcomes.join(", ")}` },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdminClient()

    // Update the signal with outcome
    const { data, error } = await supabase
      .from("market_signal")
      .update({
        outcome,
        outcome_at: new Date().toISOString(),
        outcome_notes: notes || null,
        outcome_deal_id: dealId || null,
        outcome_property_id: propertyId || null,
        outcome_value: actualValue || null,
        outcome_roi_pct: roiPct || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating signal outcome:", error)
      return NextResponse.json(
        { error: "Failed to update signal outcome" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      signal: data,
    })
  } catch (err) {
    console.error("Signal outcome error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/dld/signals/[id]/outcome - Get signal outcome history
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getSupabaseAdminClient()

    const { data, error } = await supabase
      .from("market_signal")
      .select("id, outcome, outcome_at, outcome_notes, outcome_deal_id, outcome_property_id, outcome_value, outcome_roi_pct")
      .eq("id", id)
      .single()

    if (error) {
      return NextResponse.json(
        { error: "Signal not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error("Get outcome error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}
