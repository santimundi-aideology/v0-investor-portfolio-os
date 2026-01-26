/**
 * Batch Scorer
 * Score multiple properties in a single API call for cost efficiency
 */

import "server-only"

import OpenAI from "openai"
import type { CompressedInvestorContext, CompressedPropertyContext, CompressedMarketContext } from "../cache/context-cache"
import {
  BATCH_SCORING_SYSTEM_PROMPT,
  buildBatchScoringPrompt,
  type AIScoreOutput,
  type BatchScoreResponse,
  validateScoreOutput,
  createFallbackScore,
} from "../prompts/scoring-prompts"
import { canMakeAICall, canMakeAIRequest, recordUsage } from "../monitoring/token-monitor"
import { TOKEN_BUDGETS, estimateTokens } from "../config/token-budgets"

// OpenAI client (lazy init)
let openaiClient: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return openaiClient
}

/**
 * Batch score multiple properties in a single API call
 * This is the primary cost optimization - 1 call instead of N calls
 */
export async function batchScoreProperties(args: {
  investor: CompressedInvestorContext
  properties: Array<{
    propertyId: string
    context: CompressedPropertyContext
    market: CompressedMarketContext | null
    ruleScore: number
  }>
}): Promise<AIScoreOutput[]> {
  const { investor, properties } = args
  
  if (properties.length === 0) {
    return []
  }
  
  // Limit batch size
  const maxBatch = TOKEN_BUDGETS.rateLimits.batchSizeMax
  if (properties.length > maxBatch) {
    console.warn(`[batch-scorer] Truncating batch from ${properties.length} to ${maxBatch}`)
  }
  const batch = properties.slice(0, maxBatch)
  
  // Build prompt
  const userPrompt = buildBatchScoringPrompt(
    investor,
    batch.map(p => ({ property: p.context, market: p.market }))
  )
  
  // Estimate tokens
  const estimatedInputTokens = estimateTokens(BATCH_SCORING_SYSTEM_PROMPT) + estimateTokens(userPrompt)
  const estimatedOutputTokens = batch.length * 150 // ~150 tokens per score
  const estimatedTotal = estimatedInputTokens + estimatedOutputTokens
  
  // Check budgets
  const budgetCheck = canMakeAICall("scoring", estimatedTotal)
  if (!budgetCheck.allowed) {
    console.warn(`[batch-scorer] Budget exceeded: ${budgetCheck.reason}`)
    return batch.map(p => createFallbackScore(p.propertyId, p.ruleScore))
  }
  
  // Check rate limit
  const rateCheck = canMakeAIRequest()
  if (!rateCheck.allowed) {
    console.warn(`[batch-scorer] Rate limited, retry in ${rateCheck.retryAfterMs}ms`)
    return batch.map(p => createFallbackScore(p.propertyId, p.ruleScore))
  }
  
  try {
    const openai = getOpenAI()
    const startTime = Date.now()
    
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: BATCH_SCORING_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: batch.length * 200, // Budget for output
    })
    
    const duration = Date.now() - startTime
    
    // Record usage
    const actualInputTokens = response.usage?.prompt_tokens ?? estimatedInputTokens
    const actualOutputTokens = response.usage?.completion_tokens ?? estimatedOutputTokens
    recordUsage("scoring", actualInputTokens, actualOutputTokens)
    
    console.log(
      `[batch-scorer] Scored ${batch.length} properties in ${duration}ms ` +
      `(${actualInputTokens + actualOutputTokens} tokens)`
    )
    
    // Parse response
    const content = response.choices[0].message.content ?? "{}"
    const parsed = JSON.parse(content) as BatchScoreResponse
    
    if (!parsed.scores || !Array.isArray(parsed.scores)) {
      console.error("[batch-scorer] Invalid response format:", content.slice(0, 200))
      return batch.map(p => createFallbackScore(p.propertyId, p.ruleScore))
    }
    
    // Map scores back to properties
    const scoreMap = new Map<string, AIScoreOutput>()
    for (const score of parsed.scores) {
      if (validateScoreOutput(score)) {
        scoreMap.set(score.propertyId, score)
      }
    }
    
    // Return in original order, with fallbacks for missing
    return batch.map(p => {
      const score = scoreMap.get(p.propertyId)
      if (score) return score
      
      // Try to find by index if ID matching fails
      const index = batch.findIndex(bp => bp.propertyId === p.propertyId)
      if (index >= 0 && parsed.scores[index]) {
        const indexScore = parsed.scores[index]
        return {
          ...indexScore,
          propertyId: p.propertyId, // Ensure correct ID
        }
      }
      
      return createFallbackScore(p.propertyId, p.ruleScore)
    })
    
  } catch (error) {
    console.error("[batch-scorer] AI scoring failed:", error)
    return batch.map(p => createFallbackScore(p.propertyId, p.ruleScore))
  }
}

/**
 * Score a single property (fallback when batch not suitable)
 */
export async function scoreSingleProperty(args: {
  investor: CompressedInvestorContext
  property: CompressedPropertyContext
  market: CompressedMarketContext | null
  ruleScore: number
}): Promise<AIScoreOutput> {
  // Use batch scorer with single item for consistency
  const results = await batchScoreProperties({
    investor: args.investor,
    properties: [{
      propertyId: args.property.propertyId,
      context: args.property,
      market: args.market,
      ruleScore: args.ruleScore,
    }],
  })
  
  return results[0] ?? createFallbackScore(args.property.propertyId, args.ruleScore)
}
