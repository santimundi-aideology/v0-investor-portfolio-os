/**
 * Opportunity Scorer
 * Main scoring engine with tiered processing for cost optimization
 */

import "server-only"

import type { Investor, Property } from "@/lib/types"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { matchPropertiesToInvestor, evaluatePair } from "@/lib/property-matching"
import { compressInvestorContext, compressPropertyContext } from "../compression/compress-context"
import { 
  getCachedMarketContext,
  getCachedMarketContextsBatch,
  getCachedInvestorContext,
  setCachedInvestorContext,
  type CompressedInvestorContext,
  type CompressedPropertyContext,
  type CompressedMarketContext,
} from "../cache/context-cache"
import { batchScoreProperties } from "./batch-scorer"
import { type AIScoreOutput, createFallbackScore } from "../prompts/scoring-prompts"
import { TOKEN_BUDGETS } from "../config/token-budgets"

// Types
export type ScoredOpportunity = {
  property: Property
  ruleScore: number
  ruleReasons: string[]
  aiScore: AIScoreOutput | null
  combinedScore: number
  tier: "ai" | "rule" | "db"
}

export type OpportunitySearchResult = {
  investorId: string
  opportunities: ScoredOpportunity[]
  totalCandidates: number
  tiers: {
    db: number
    rule: number
    ai: number
  }
  scoredAt: string
}

/**
 * Main opportunity scoring function with tiered processing
 */
export async function scoreOpportunitiesForInvestor(args: {
  investor: Investor
  orgId: string
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
}): Promise<OpportunitySearchResult> {
  const { investor, orgId, filters = {}, maxToScore, includeNews = false } = args
  const startTime = Date.now()
  
  // ========================================
  // TIER 1: Database Filtering (FREE)
  // ========================================
  const dbCandidates = await queryListingsWithFilters(orgId, {
    areas: filters.areas ?? investor.mandate?.preferredAreas,
    propertyTypes: filters.propertyTypes ?? investor.mandate?.propertyTypes,
    minPrice: filters.minPrice ?? investor.mandate?.minInvestment,
    maxPrice: filters.maxPrice ?? investor.mandate?.maxInvestment,
    minYield: filters.minYield,
    status: filters.status ?? "available",
    limit: TOKEN_BUDGETS.tiers.tier1DbFilterMax,
  })
  
  console.log(`[opportunity-scorer] Tier 1: ${dbCandidates.length} candidates from DB`)
  
  if (dbCandidates.length === 0) {
    return {
      investorId: investor.id,
      opportunities: [],
      totalCandidates: 0,
      tiers: { db: 0, rule: 0, ai: 0 },
      scoredAt: new Date().toISOString(),
    }
  }
  
  // ========================================
  // TIER 2: Rule-Based Scoring (FREE)
  // ========================================
  const ruleScored = dbCandidates
    .map(property => {
      const { score, reasons } = evaluatePair(property, investor)
      return { property, ruleScore: score, ruleReasons: reasons }
    })
    .filter(m => m.ruleScore >= TOKEN_BUDGETS.tiers.tier2RuleScoreMin)
    .sort((a, b) => b.ruleScore - a.ruleScore)
    .slice(0, TOKEN_BUDGETS.tiers.tier2RuleScoreKeep)
  
  console.log(`[opportunity-scorer] Tier 2: ${ruleScored.length} passed rule scoring`)
  
  // ========================================
  // TIER 3: Get Cached Context (CHEAP)
  // ========================================
  
  // Get or compute investor context
  let investorContext = getCachedInvestorContext(investor.id)
  if (!investorContext) {
    investorContext = compressInvestorContext(investor)
    setCachedInvestorContext(investorContext)
  }
  
  // Get unique areas from candidates
  const uniqueAreas = [...new Set(ruleScored.map(c => c.property.area))]
  
  // Fetch market contexts (cached)
  const marketContexts = await getCachedMarketContextsBatch(orgId, uniqueAreas)
  
  // ========================================
  // TIER 4: AI Scoring (OPTIMIZED)
  // ========================================
  const aiLimit = maxToScore ?? TOKEN_BUDGETS.tiers.tier4AiScoreMax
  const topForAI = ruleScored.slice(0, aiLimit)
  const remainingRuleOnly = ruleScored.slice(aiLimit)
  
  console.log(`[opportunity-scorer] Tier 4: Sending ${topForAI.length} to AI scoring`)
  
  // Compress property contexts
  const propertiesForAI = topForAI.map(candidate => ({
    propertyId: candidate.property.id,
    context: compressPropertyContext(candidate.property),
    market: marketContexts.get(candidate.property.area) ?? null,
    ruleScore: candidate.ruleScore,
  }))
  
  // Batch score with AI
  const aiScores = await batchScoreProperties({
    investor: investorContext,
    properties: propertiesForAI,
  })
  
  // Build AI-scored opportunities
  const aiOpportunities: ScoredOpportunity[] = topForAI.map((candidate, i) => {
    const aiScore = aiScores[i] ?? null
    const combinedScore = aiScore
      ? Math.round(0.4 * candidate.ruleScore + 0.6 * aiScore.aiScore)
      : candidate.ruleScore
    
    return {
      property: candidate.property,
      ruleScore: candidate.ruleScore,
      ruleReasons: candidate.ruleReasons,
      aiScore,
      combinedScore,
      tier: "ai" as const,
    }
  })
  
  // Build rule-only opportunities
  const ruleOpportunities: ScoredOpportunity[] = remainingRuleOnly.map(candidate => ({
    property: candidate.property,
    ruleScore: candidate.ruleScore,
    ruleReasons: candidate.ruleReasons,
    aiScore: null,
    combinedScore: candidate.ruleScore,
    tier: "rule" as const,
  }))
  
  // Combine and sort by combined score
  const allOpportunities = [...aiOpportunities, ...ruleOpportunities]
    .sort((a, b) => b.combinedScore - a.combinedScore)
  
  const duration = Date.now() - startTime
  console.log(`[opportunity-scorer] Completed in ${duration}ms`)
  
  return {
    investorId: investor.id,
    opportunities: allOpportunities,
    totalCandidates: dbCandidates.length,
    tiers: {
      db: dbCandidates.length,
      rule: ruleScored.length,
      ai: topForAI.length,
    },
    scoredAt: new Date().toISOString(),
  }
}

/**
 * Quick score without AI (for fast previews)
 */
export function quickScoreOpportunities(
  investor: Investor,
  properties: Property[]
): Array<{ property: Property; score: number; reasons: string[] }> {
  return properties
    .map(property => {
      const { score, reasons } = evaluatePair(property, investor)
      return { property, score, reasons }
    })
    .filter(m => m.score > 0)
    .sort((a, b) => b.score - a.score)
}

// ============================================
// Database Query
// ============================================

async function queryListingsWithFilters(
  orgId: string,
  filters: {
    areas?: string[]
    propertyTypes?: string[]
    minPrice?: number
    maxPrice?: number
    minYield?: number
    status?: string
    limit?: number
  }
): Promise<Property[]> {
  const supabase = getSupabaseAdminClient()
  
  let query = supabase
    .from("listings")
    .select("*")
    .eq("tenant_id", orgId)
  
  // Apply filters
  if (filters.areas?.length) {
    query = query.in("area", filters.areas)
  }
  
  if (filters.propertyTypes?.length) {
    query = query.in("type", filters.propertyTypes)
  }
  
  if (filters.minPrice) {
    query = query.gte("price", filters.minPrice)
  }
  
  if (filters.maxPrice) {
    query = query.lte("price", filters.maxPrice)
  }
  
  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status)
  }
  
  // Execute with limit
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(filters.limit ?? TOKEN_BUDGETS.tiers.tier1DbFilterMax)
  
  if (error) {
    console.error("[opportunity-scorer] DB query failed:", error)
    return []
  }
  
  // Post-filter by yield if specified
  let results = (data ?? []) as Property[]
  
  if (filters.minYield) {
    results = results.filter(p => (p.roi ?? 0) >= filters.minYield!)
  }
  
  return results
}

// Re-export the evaluatePair function for external use
export { evaluatePair } from "@/lib/property-matching"
