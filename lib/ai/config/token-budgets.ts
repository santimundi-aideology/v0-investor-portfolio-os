/**
 * Token Budget Configuration
 * Centralized cost control for AI operations
 */

export const TOKEN_BUDGETS = {
  // Daily token limits by operation type
  daily: {
    opportunityScoring: 100_000,    // ~$0.015 at gpt-4o-mini
    newsSearches: 50_000,           // ~$0.0075
    chatConversations: 200_000,     // ~$0.03
    total: 500_000,                 // ~$0.075/day max
  },

  // Per-request limits
  perRequest: {
    maxInputTokens: 2000,
    maxOutputTokens: 500,
  },

  // Context compression targets (chars, not tokens)
  context: {
    maxInvestorContext: 200,        // ~50 tokens
    maxPropertyContext: 150,        // ~40 tokens
    maxMarketContext: 200,          // ~50 tokens
    maxNewsContext: 150,            // ~40 tokens
    maxSignalsContext: 100,         // ~25 tokens
    maxTotalContext: 800,           // ~200 tokens total
  },

  // Caching TTLs
  cache: {
    marketSummaryHours: 24,
    newsHours: 24,
    investorContextHours: 168,      // 1 week (unless mandate changes)
    propertyContextHours: 4,        // Refresh more frequently
  },

  // Rate limiting
  rateLimits: {
    newsFetchesPerHour: 20,
    aiCallsPerMinute: 30,
    batchSizeMax: 10,
  },

  // Tiered processing thresholds
  tiers: {
    tier1DbFilterMax: 100,          // Max from initial DB query
    tier2RuleScoreMin: 40,          // Minimum rule score to proceed
    tier2RuleScoreKeep: 15,         // Keep top N after rule scoring
    tier4AiScoreMax: 8,             // Max properties for AI scoring
  },
} as const

export type TokenBudgets = typeof TOKEN_BUDGETS

/**
 * Cost estimation utilities
 */
export const COST_PER_1K_TOKENS = {
  "gpt-4o-mini": {
    input: 0.00015,   // $0.15 per 1M input tokens
    output: 0.0006,   // $0.60 per 1M output tokens
  },
  "gpt-4o": {
    input: 0.005,     // $5 per 1M input tokens
    output: 0.015,    // $15 per 1M output tokens
  },
} as const

export function estimateCost(
  inputTokens: number,
  outputTokens: number,
  model: keyof typeof COST_PER_1K_TOKENS = "gpt-4o-mini"
): number {
  const costs = COST_PER_1K_TOKENS[model]
  return (inputTokens / 1000) * costs.input + (outputTokens / 1000) * costs.output
}

/**
 * Rough token estimation (4 chars ≈ 1 token for English text)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}
