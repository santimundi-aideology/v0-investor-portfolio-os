import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"

/**
 * GET /api/dld/areas - Get list of all areas with transaction counts
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdminClient()

    const { data, error } = await supabase
      .from("dld_transactions")
      .select("area_name_en")
      .eq("trans_group_en", "Sales")
      .gt("actual_worth", 0)

    if (error) throw error

    // Count transactions per area
    const areaCounts: Record<string, number> = {}
    for (const row of data || []) {
      const area = row.area_name_en || "Unknown"
      areaCounts[area] = (areaCounts[area] || 0) + 1
    }

    const areas = Object.entries(areaCounts)
      .map(([name, count]) => ({ name, transaction_count: count }))
      .sort((a, b) => b.transaction_count - a.transaction_count)

    return NextResponse.json({
      total_areas: areas.length,
      areas,
    })
  } catch (err) {
    console.error("DLD Areas API error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}
