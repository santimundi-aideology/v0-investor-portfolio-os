/**
 * Opportunity Scoring API
 * Score investment opportunities for an investor with tiered processing
 */

import { NextResponse } from "next/server"
import { scoreOpportunitiesForInvestor, quickScoreOpportunities } from "@/lib/ai/scoring/opportunity-scorer"
import { getUsageStats } from "@/lib/ai/monitoring/token-monitor"
import { getSupabaseAdminClient } from "@/lib/db/client"
import type { Investor, Property } from "@/lib/types"

type ScoreRequestBody = {
  investorId: string
  propertyIds?: string[]
  filters?: {
    areas?: string[]
    propertyTypes?: string[]
    minPrice?: number
    maxPrice?: number
    minYield?: number
    status?: string
  }
  maxToScore?: number
  includeNews?: boolean
  quickScore?: boolean  // Skip AI scoring, use rules only
}

export async function POST(req: Request) {
  try {
    // Verify session via headers set by middleware
    const userId = req.headers.get("x-user-id")
    const tenantId = req.headers.get("x-tenant-id")

    if (!userId || !tenantId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const body = (await req.json()) as ScoreRequestBody
    
    // Validate required fields
    if (!body.investorId) {
      return NextResponse.json(
        { error: "investorId is required" },
        { status: 400 }
      )
    }
    
    const supabase = getSupabaseAdminClient()
    
    // Get investor
    const { data: investorData, error: investorError } = await supabase
      .from("investors")
      .select("*")
      .eq("id", body.investorId)
      .maybeSingle()
    
    if (investorError || !investorData) {
      return NextResponse.json(
        { error: "Investor not found" },
        { status: 404 }
      )
    }
    
    const investor = mapDbInvestor(investorData)
    const orgId = investorData.tenant_id as string
    
    // Quick score mode (no AI, rules only)
    if (body.quickScore) {
      const properties = await getProperties(supabase, orgId, body.propertyIds, body.filters)
      const scored = quickScoreOpportunities(investor, properties)
      
      return NextResponse.json({
        investorId: investor.id,
        mode: "quick",
        opportunities: scored.slice(0, body.maxToScore ?? 20).map(s => ({
          propertyId: s.property.id,
          title: s.property.title,
          area: s.property.area,
          type: s.property.type,
          price: s.property.price,
          yield: s.property.roi,
          score: s.score,
          reasons: s.reasons,
        })),
        totalCandidates: properties.length,
        scoredAt: new Date().toISOString(),
      })
    }
    
    // Full AI-enhanced scoring
    const result = await scoreOpportunitiesForInvestor({
      investor,
      orgId,
      filters: body.filters,
      maxToScore: body.maxToScore,
      includeNews: body.includeNews ?? false,
    })
    
    // Get usage stats for monitoring
    const usageStats = getUsageStats()
    
    return NextResponse.json({
      investorId: result.investorId,
      mode: "ai-enhanced",
      opportunities: result.opportunities.map(o => ({
        propertyId: o.property.id,
        title: o.property.title,
        area: o.property.area,
        type: o.property.type,
        price: o.property.price,
        priceFormatted: formatPrice(o.property.price),
        yield: o.property.roi,
        size: o.property.size,
        bedrooms: o.property.bedrooms,
        // Scores
        ruleScore: o.ruleScore,
        ruleReasons: o.ruleReasons,
        aiScore: o.aiScore?.aiScore ?? null,
        combinedScore: o.combinedScore,
        tier: o.tier,
        // AI insights (if available)
        headline: o.aiScore?.headline ?? null,
        reasoning: o.aiScore?.reasoning ?? null,
        keyStrengths: o.aiScore?.keyStrengths ?? [],
        considerations: o.aiScore?.considerations ?? [],
        factors: o.aiScore?.factors ?? null,
      })),
      totalCandidates: result.totalCandidates,
      tiers: result.tiers,
      scoredAt: result.scoredAt,
      usageStats: {
        date: usageStats.date,
        scoringUsed: usageStats.byType.scoring.percentUsed,
        healthStatus: usageStats.healthStatus,
      },
    })
    
  } catch (error) {
    console.error("[opportunities/score] Error:", error)
    return NextResponse.json(
      { error: "Failed to score opportunities" },
      { status: 500 }
    )
  }
}

// GET endpoint for usage stats
export async function GET() {
  const stats = getUsageStats()
  return NextResponse.json(stats)
}

// ============================================
// Helper Functions
// ============================================

function mapDbInvestor(data: Record<string, unknown>): Investor {
  return {
    id: data.id as string,
    name: data.name as string,
    company: (data.company as string) ?? "",
    email: data.email as string,
    phone: (data.phone as string) ?? "",
    status: (data.status as Investor["status"]) ?? "active",
    mandate: data.mandate as Investor["mandate"],
    createdAt: data.created_at as string,
    lastContact: (data.last_contact as string) ?? data.created_at as string,
    totalDeals: (data.total_deals as number) ?? 0,
    tags: data.tags as string[],
    segment: data.segment as Investor["segment"],
  }
}

async function getProperties(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  orgId: string,
  propertyIds?: string[],
  filters?: ScoreRequestBody["filters"]
): Promise<Property[]> {
  let query = supabase
    .from("listings")
    .select("*")
    .eq("tenant_id", orgId)
  
  if (propertyIds?.length) {
    query = query.in("id", propertyIds)
  } else {
    // Apply filters
    if (filters?.areas?.length) {
      query = query.in("area", filters.areas)
    }
    if (filters?.propertyTypes?.length) {
      query = query.in("type", filters.propertyTypes)
    }
    if (filters?.minPrice) {
      query = query.gte("price", filters.minPrice)
    }
    if (filters?.maxPrice) {
      query = query.lte("price", filters.maxPrice)
    }
    if (filters?.status && filters.status !== "all") {
      query = query.eq("status", filters.status)
    }
  }
  
  const { data, error } = await query.limit(100)
  
  if (error) {
    console.error("[opportunities/score] Failed to fetch properties:", error)
    return []
  }
  
  let results = (data ?? []) as Property[]
  
  // Post-filter by yield
  if (filters?.minYield) {
    results = results.filter(p => (p.roi ?? 0) >= filters.minYield!)
  }
  
  return results
}

function formatPrice(price: number): string {
  if (price >= 1_000_000) {
    return `AED ${(price / 1_000_000).toFixed(1)}M`
  }
  return `AED ${price.toLocaleString()}`
}
