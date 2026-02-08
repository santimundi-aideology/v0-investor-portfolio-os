import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"

/**
 * GET /api/market-report/areas
 * Returns top areas with transaction counts for the area picker
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdminClient()
    
    const { data, error } = await supabase.rpc("exec_sql_readonly", {
      sql_query: `
        SELECT area_name_en as area, COUNT(*)::int as txn_count
        FROM dld_transactions 
        WHERE trans_group_en = 'Sales' AND actual_worth > 0 AND area_name_en IS NOT NULL
        GROUP BY area_name_en 
        HAVING COUNT(*) >= 50
        ORDER BY txn_count DESC
        LIMIT 40
      `,
    })
    
    const areas = Array.isArray(data) ? data : []
    return NextResponse.json({ areas })
  } catch (err) {
    console.error("[market-report/areas] Error:", err)
    return NextResponse.json({ areas: [] })
  }
}
