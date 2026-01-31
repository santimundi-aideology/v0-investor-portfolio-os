import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"

/**
 * GET /api/dld/freshness - Get data freshness status for DLD and portal data
 * 
 * Returns:
 * - dld: Latest DLD transaction date and counts
 * - portal: Latest portal listing scrape date and counts
 * - signals: Latest signal generation date and counts
 * - alerts: Any staleness warnings
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdminClient()
    
    // Get DLD data freshness
    const { data: dldLatest } = await supabase
      .from("dld_transactions")
      .select("instance_date")
      .order("instance_date", { ascending: false })
      .limit(1)
      .single()
    
    const { count: dldCount } = await supabase
      .from("dld_transactions")
      .select("*", { count: "exact", head: true })
    
    // Get DLD transactions from last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const { count: dldRecentCount } = await supabase
      .from("dld_transactions")
      .select("*", { count: "exact", head: true })
      .gte("instance_date", thirtyDaysAgo.toISOString().split("T")[0])
    
    // Get portal listings freshness
    const { data: portalLatest } = await supabase
      .from("portal_listings")
      .select("updated_at")
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .single()
    
    const { count: portalCount } = await supabase
      .from("portal_listings")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)
    
    // Get signals freshness
    const { data: signalLatest } = await supabase
      .from("market_signal")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
    
    const { count: signalCount } = await supabase
      .from("market_signal")
      .select("*", { count: "exact", head: true })
      .eq("status", "new")
    
    // Get pricing opportunity signals count
    const { count: pricingSignalCount } = await supabase
      .from("market_signal")
      .select("*", { count: "exact", head: true })
      .eq("type", "pricing_opportunity")
      .eq("status", "new")
    
    // Calculate staleness
    const now = new Date()
    const alerts: string[] = []
    
    // Check DLD data staleness (warn if latest transaction > 7 days old)
    const dldLatestDate = dldLatest?.instance_date ? new Date(dldLatest.instance_date) : null
    const dldDaysOld = dldLatestDate ? Math.floor((now.getTime() - dldLatestDate.getTime()) / (1000 * 60 * 60 * 24)) : null
    
    if (dldDaysOld && dldDaysOld > 7) {
      alerts.push(`DLD transaction data is ${dldDaysOld} days old`)
    }
    
    // Check portal listings staleness (warn if not updated in 24 hours)
    const portalLatestDate = portalLatest?.updated_at ? new Date(portalLatest.updated_at) : null
    const portalHoursOld = portalLatestDate ? Math.floor((now.getTime() - portalLatestDate.getTime()) / (1000 * 60 * 60)) : null
    
    if (portalHoursOld && portalHoursOld > 24) {
      alerts.push(`Portal listings haven't been updated in ${portalHoursOld} hours`)
    }
    
    // Check signals staleness (warn if pipeline not run in 24 hours)
    const signalLatestDate = signalLatest?.created_at ? new Date(signalLatest.created_at) : null
    const signalHoursOld = signalLatestDate ? Math.floor((now.getTime() - signalLatestDate.getTime()) / (1000 * 60 * 60)) : null
    
    if (signalHoursOld && signalHoursOld > 24) {
      alerts.push(`Signal pipeline hasn't run in ${signalHoursOld} hours`)
    }
    
    return NextResponse.json({
      dld: {
        latestDate: dldLatest?.instance_date || null,
        totalCount: dldCount || 0,
        recentCount: dldRecentCount || 0,
        daysOld: dldDaysOld,
        status: dldDaysOld && dldDaysOld > 7 ? "stale" : "fresh",
      },
      portal: {
        latestUpdate: portalLatest?.updated_at || null,
        activeCount: portalCount || 0,
        hoursOld: portalHoursOld,
        status: portalHoursOld && portalHoursOld > 24 ? "stale" : "fresh",
      },
      signals: {
        latestGenerated: signalLatest?.created_at || null,
        newCount: signalCount || 0,
        pricingOpportunities: pricingSignalCount || 0,
        hoursOld: signalHoursOld,
        status: signalHoursOld && signalHoursOld > 24 ? "stale" : "fresh",
      },
      alerts,
      overallStatus: alerts.length > 0 ? "warning" : "healthy",
      timestamp: now.toISOString(),
    })
  } catch (err) {
    console.error("Data freshness check error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}
