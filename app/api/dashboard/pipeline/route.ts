import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError } from "@/lib/security/rbac"

/**
 * GET /api/dashboard/pipeline
 * Returns pipeline breakdown by stage
 */
export async function GET(req: Request) {
  try {
    const ctx = await requireAuthContext(req)
    if (!ctx.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = getSupabaseAdminClient()

    const { data: deals } = await supabase
      .from("deal_rooms")
      .select("id, status, ticket_size_aed, property_title, investor_name, next_step, probability")
      .eq("tenant_id", ctx.tenantId)
      .neq("status", "completed")

    const stages: Record<string, { count: number; value: number; deals: unknown[] }> = {
      preparation: { count: 0, value: 0, deals: [] },
      "due-diligence": { count: 0, value: 0, deals: [] },
      negotiation: { count: 0, value: 0, deals: [] },
      closing: { count: 0, value: 0, deals: [] },
    }

    deals?.forEach((deal) => {
      const stage = deal.status as keyof typeof stages
      if (stages[stage]) {
        stages[stage].count++
        stages[stage].value += deal.ticket_size_aed || 0
        stages[stage].deals.push({
          id: deal.id,
          propertyTitle: deal.property_title,
          investorName: deal.investor_name,
          ticketSize: deal.ticket_size_aed,
          nextStep: deal.next_step,
          probability: deal.probability,
        })
      }
    })

    return NextResponse.json({ stages })
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[dashboard/pipeline] Error:", err)
    return NextResponse.json({ error: "Failed to fetch pipeline" }, { status: 500 })
  }
}
