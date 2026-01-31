import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"

/**
 * GET /api/dld/signals/metrics - Get signal accuracy metrics
 * 
 * Query params:
 *   signalType?: string - Filter by signal type
 *   daysBack?: number - Number of days to look back (default 90)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const signalType = searchParams.get("signalType")
    const daysBack = parseInt(searchParams.get("daysBack") || "90")

    const supabase = getSupabaseAdminClient()

    // Get aggregate metrics by signal type
    const { data: metrics, error } = await supabase
      .from("market_signal")
      .select("type, outcome, confidence_score, evidence")
      .gte("created_at", new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString())

    if (error) {
      console.error("Error fetching metrics:", error)
      return NextResponse.json(
        { error: "Failed to fetch metrics" },
        { status: 500 }
      )
    }

    // Calculate metrics by type
    const byType = new Map<string, {
      total: number
      withOutcome: number
      invested: number
      passed: number
      expired: number
      converted: number
      avgConfidence: number
      avgConfidenceInvested: number
      avgConfidencePassed: number
      totalCompositeScore: number
      compositeScoreCount: number
    }>()

    for (const signal of metrics || []) {
      const type = signal.type || "unknown"
      
      if (!byType.has(type)) {
        byType.set(type, {
          total: 0,
          withOutcome: 0,
          invested: 0,
          passed: 0,
          expired: 0,
          converted: 0,
          avgConfidence: 0,
          avgConfidenceInvested: 0,
          avgConfidencePassed: 0,
          totalCompositeScore: 0,
          compositeScoreCount: 0,
        })
      }

      const stats = byType.get(type)!
      stats.total++
      
      if (signal.confidence_score) {
        stats.avgConfidence += signal.confidence_score
      }

      const evidence = signal.evidence as Record<string, unknown> | null
      if (evidence?.composite_score) {
        stats.totalCompositeScore += evidence.composite_score as number
        stats.compositeScoreCount++
      }

      if (signal.outcome) {
        stats.withOutcome++
        switch (signal.outcome) {
          case "invested":
            stats.invested++
            if (signal.confidence_score) stats.avgConfidenceInvested += signal.confidence_score
            break
          case "passed":
            stats.passed++
            if (signal.confidence_score) stats.avgConfidencePassed += signal.confidence_score
            break
          case "expired":
            stats.expired++
            break
          case "converted":
            stats.converted++
            break
        }
      }
    }

    // Format results
    const results = Array.from(byType.entries()).map(([type, stats]) => ({
      signalType: type,
      totalSignals: stats.total,
      withOutcome: stats.withOutcome,
      invested: stats.invested,
      passed: stats.passed,
      expired: stats.expired,
      converted: stats.converted,
      conversionRate: stats.withOutcome > 0 
        ? Math.round(((stats.invested + stats.converted) / stats.withOutcome) * 100) 
        : 0,
      avgConfidence: stats.total > 0 
        ? Math.round((stats.avgConfidence / stats.total) * 100) / 100 
        : 0,
      avgConfidenceInvested: stats.invested > 0 
        ? Math.round((stats.avgConfidenceInvested / stats.invested) * 100) / 100 
        : 0,
      avgConfidencePassed: stats.passed > 0 
        ? Math.round((stats.avgConfidencePassed / stats.passed) * 100) / 100 
        : 0,
      avgCompositeScore: stats.compositeScoreCount > 0 
        ? Math.round(stats.totalCompositeScore / stats.compositeScoreCount) 
        : 0,
    }))

    // Filter by type if specified
    const filtered = signalType 
      ? results.filter(r => r.signalType === signalType)
      : results

    // Calculate overall summary
    const summary = {
      totalSignals: results.reduce((sum, r) => sum + r.totalSignals, 0),
      withOutcome: results.reduce((sum, r) => sum + r.withOutcome, 0),
      invested: results.reduce((sum, r) => sum + r.invested, 0),
      passed: results.reduce((sum, r) => sum + r.passed, 0),
      overallConversionRate: 0,
    }
    
    if (summary.withOutcome > 0) {
      summary.overallConversionRate = Math.round((summary.invested / summary.withOutcome) * 100)
    }

    return NextResponse.json({
      daysBack,
      summary,
      byType: filtered.sort((a, b) => b.totalSignals - a.totalSignals),
    })
  } catch (err) {
    console.error("Metrics error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}
