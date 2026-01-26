/**
 * Scoring Prompts
 * Optimized prompts for opportunity scoring with minimal tokens
 */

import type { CompressedInvestorContext, CompressedPropertyContext, CompressedMarketContext } from "../cache/context-cache"

/**
 * System prompt for batch scoring
 * Kept minimal to reduce token usage
 */
export const BATCH_SCORING_SYSTEM_PROMPT = `You are a real estate investment analyst scoring properties for investors.

SCORING FACTORS (each 0-25, total 0-100):
1. mandateFit: Type, area, budget, yield alignment
2. marketTiming: Price vs DLD truth, trends, competition
3. portfolioFit: Diversification, concentration risk
4. riskAlignment: Lease stability, exit liquidity, investor tolerance

OUTPUT: JSON with "scores" array. Each score must have:
- propertyId: string
- aiScore: number (0-100)
- factors: { mandateFit, marketTiming, portfolioFit, riskAlignment }
- headline: string (8 words max)
- reasoning: string (1 sentence, reference data)
- keyStrengths: string[] (2 items max)
- considerations: string[] (1 item max)

Be concise. Reference specific numbers.`

/**
 * Build user prompt for batch scoring
 */
export function buildBatchScoringPrompt(
  investor: CompressedInvestorContext,
  properties: Array<{
    property: CompressedPropertyContext
    market: CompressedMarketContext | null
  }>
): string {
  const lines: string[] = []
  
  // Investor context (compact)
  lines.push(`INVESTOR: ${investor.summaryText}`)
  lines.push(`Strategy: ${investor.strategy} | Risk: ${investor.riskLevel} | Areas: ${investor.keyAreas.join(", ") || "open"}`)
  lines.push("")
  
  // Properties (numbered list)
  lines.push(`SCORE THESE ${properties.length} PROPERTIES:`)
  lines.push("")
  
  for (let i = 0; i < properties.length; i++) {
    const { property, market } = properties[i]
    const marketInfo = market 
      ? `${market.sentiment}, ${market.priceDirection}${market.topNews ? `, ${market.topNews.slice(0, 30)}` : ""}`
      : "no market data"
    
    lines.push(`${i + 1}. [${property.propertyId}] ${property.summaryText}`)
    lines.push(`   Market: ${marketInfo}`)
  }
  
  lines.push("")
  lines.push(`Return JSON: { "scores": [...] } for all ${properties.length} properties.`)
  
  return lines.join("\n")
}

/**
 * System prompt for single property scoring (when batch not possible)
 */
export const SINGLE_SCORING_SYSTEM_PROMPT = `Score this property for the investor (0-100).

OUTPUT JSON:
{
  "aiScore": number,
  "factors": { "mandateFit": 0-25, "marketTiming": 0-25, "portfolioFit": 0-25, "riskAlignment": 0-25 },
  "headline": "8 words max",
  "reasoning": "1 sentence with data",
  "keyStrengths": ["max 2"],
  "considerations": ["max 1"]
}`

/**
 * Build prompt for single property scoring
 */
export function buildSingleScoringPrompt(
  investor: CompressedInvestorContext,
  property: CompressedPropertyContext,
  market: CompressedMarketContext | null
): string {
  const lines: string[] = []
  
  lines.push(`INVESTOR: ${investor.summaryText}`)
  lines.push(`PROPERTY: ${property.summaryText}`)
  
  if (market) {
    lines.push(`MARKET: ${market.summaryText}`)
    if (market.topNews) {
      lines.push(`NEWS: ${market.topNews}`)
    }
  }
  
  lines.push("")
  lines.push("Score this opportunity.")
  
  return lines.join("\n")
}

/**
 * Score result type matching AI output
 */
export type AIScoreOutput = {
  propertyId: string
  aiScore: number
  factors: {
    mandateFit: number
    marketTiming: number
    portfolioFit: number
    riskAlignment: number
  }
  headline: string
  reasoning: string
  keyStrengths: string[]
  considerations: string[]
}

/**
 * Batch score response type
 */
export type BatchScoreResponse = {
  scores: AIScoreOutput[]
}

/**
 * Validate AI score output
 */
export function validateScoreOutput(output: unknown): output is AIScoreOutput {
  if (!output || typeof output !== "object") return false
  
  const o = output as Record<string, unknown>
  
  return (
    typeof o.propertyId === "string" &&
    typeof o.aiScore === "number" &&
    o.aiScore >= 0 && o.aiScore <= 100 &&
    typeof o.factors === "object" &&
    typeof o.headline === "string" &&
    typeof o.reasoning === "string" &&
    Array.isArray(o.keyStrengths) &&
    Array.isArray(o.considerations)
  )
}

/**
 * Create fallback score when AI fails
 */
export function createFallbackScore(propertyId: string, ruleScore: number): AIScoreOutput {
  return {
    propertyId,
    aiScore: ruleScore,
    factors: {
      mandateFit: Math.round(ruleScore * 0.25),
      marketTiming: Math.round(ruleScore * 0.25),
      portfolioFit: Math.round(ruleScore * 0.25),
      riskAlignment: Math.round(ruleScore * 0.25),
    },
    headline: "Score based on rule matching",
    reasoning: "AI scoring unavailable, using rule-based score.",
    keyStrengths: [],
    considerations: ["AI analysis not available"],
  }
}
