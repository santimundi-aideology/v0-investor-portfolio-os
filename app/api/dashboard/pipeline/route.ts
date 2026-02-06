import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { buildRequestContext } from "@/lib/security/rbac"

/**
 * GET /api/dashboard/pipeline
 * Returns pipeline breakdown by stage
 */
export async function GET(req: Request) {
  try {
    const ctx = buildRequestContext(req)
    if (!ctx.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Note: deal_rooms table doesn't exist in the current schema.
    // Return empty pipeline stages as placeholder until deal_rooms is created.
    const stages: Record<string, { count: number; value: number; deals: unknown[] }> = {
      preparation: { count: 0, value: 0, deals: [] },
      "due-diligence": { count: 0, value: 0, deals: [] },
      negotiation: { count: 0, value: 0, deals: [] },
      closing: { count: 0, value: 0, deals: [] },
    }

    return NextResponse.json({ stages })
  } catch (err) {
    console.error("[dashboard/pipeline] Error:", err)
    return NextResponse.json({ error: "Failed to fetch pipeline" }, { status: 500 })
  }
}
