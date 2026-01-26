/**
 * Token Usage Monitoring
 * Track and enforce token budgets across AI operations
 */

import { TOKEN_BUDGETS, estimateCost } from "../config/token-budgets"

// Usage types
export type UsageType = "scoring" | "news" | "chat" | "tools"

// Daily usage tracker (resets at midnight UTC)
type UsageTracker = {
  date: string
  scoring: number
  news: number
  chat: number
  tools: number
  totalCost: number
}

// In-memory tracker (use Redis in production for multi-instance)
let usageTracker: UsageTracker = createFreshTracker()

function createFreshTracker(): UsageTracker {
  return {
    date: new Date().toISOString().slice(0, 10),
    scoring: 0,
    news: 0,
    chat: 0,
    tools: 0,
    totalCost: 0,
  }
}

function resetIfNewDay(): void {
  const today = new Date().toISOString().slice(0, 10)
  if (usageTracker.date !== today) {
    // Log previous day's usage before reset
    console.log(
      `[token-monitor] Daily reset. Previous day (${usageTracker.date}): ` +
      `scoring=${usageTracker.scoring}, news=${usageTracker.news}, ` +
      `chat=${usageTracker.chat}, tools=${usageTracker.tools}, ` +
      `totalCost=$${usageTracker.totalCost.toFixed(4)}`
    )
    usageTracker = createFreshTracker()
  }
}

/**
 * Check if an AI call can be made within budget
 */
export function canMakeAICall(
  type: UsageType,
  estimatedTokens: number
): { allowed: boolean; reason?: string } {
  resetIfNewDay()
  
  const budgetKey = type === "scoring" ? "opportunityScoring"
    : type === "news" ? "newsSearches"
    : "chatConversations"
  
  const budget = TOKEN_BUDGETS.daily[budgetKey]
  const currentUsage = usageTracker[type]
  
  if (currentUsage + estimatedTokens > budget) {
    return {
      allowed: false,
      reason: `${type} budget exceeded: ${currentUsage}/${budget} tokens used`,
    }
  }
  
  // Check total daily budget
  const totalUsed = usageTracker.scoring + usageTracker.news + usageTracker.chat + usageTracker.tools
  if (totalUsed + estimatedTokens > TOKEN_BUDGETS.daily.total) {
    return {
      allowed: false,
      reason: `Total daily budget exceeded: ${totalUsed}/${TOKEN_BUDGETS.daily.total} tokens used`,
    }
  }
  
  return { allowed: true }
}

/**
 * Record token usage after an AI call
 */
export function recordUsage(
  type: UsageType,
  inputTokens: number,
  outputTokens: number,
  model: "gpt-4o-mini" | "gpt-4o" = "gpt-4o-mini"
): void {
  resetIfNewDay()
  
  const totalTokens = inputTokens + outputTokens
  usageTracker[type] += totalTokens
  
  const cost = estimateCost(inputTokens, outputTokens, model)
  usageTracker.totalCost += cost
  
  // Log if approaching limits
  const budgetKey = type === "scoring" ? "opportunityScoring"
    : type === "news" ? "newsSearches"
    : "chatConversations"
  
  const budget = TOKEN_BUDGETS.daily[budgetKey]
  const usagePercent = (usageTracker[type] / budget) * 100
  
  if (usagePercent > 80) {
    console.warn(
      `[token-monitor] ${type} usage at ${usagePercent.toFixed(0)}% ` +
      `(${usageTracker[type]}/${budget} tokens)`
    )
  }
}

/**
 * Get current usage statistics
 */
export function getUsageStats(): {
  date: string
  byType: Record<UsageType, { used: number; budget: number; percentUsed: string }>
  totalTokens: number
  totalBudget: number
  totalCost: string
  healthStatus: "ok" | "warning" | "critical"
} {
  resetIfNewDay()
  
  const totalTokens = usageTracker.scoring + usageTracker.news + usageTracker.chat + usageTracker.tools
  const totalPercent = (totalTokens / TOKEN_BUDGETS.daily.total) * 100
  
  const healthStatus: "ok" | "warning" | "critical" =
    totalPercent > 90 ? "critical" :
    totalPercent > 70 ? "warning" : "ok"
  
  return {
    date: usageTracker.date,
    byType: {
      scoring: {
        used: usageTracker.scoring,
        budget: TOKEN_BUDGETS.daily.opportunityScoring,
        percentUsed: ((usageTracker.scoring / TOKEN_BUDGETS.daily.opportunityScoring) * 100).toFixed(1) + "%",
      },
      news: {
        used: usageTracker.news,
        budget: TOKEN_BUDGETS.daily.newsSearches,
        percentUsed: ((usageTracker.news / TOKEN_BUDGETS.daily.newsSearches) * 100).toFixed(1) + "%",
      },
      chat: {
        used: usageTracker.chat,
        budget: TOKEN_BUDGETS.daily.chatConversations,
        percentUsed: ((usageTracker.chat / TOKEN_BUDGETS.daily.chatConversations) * 100).toFixed(1) + "%",
      },
      tools: {
        used: usageTracker.tools,
        budget: TOKEN_BUDGETS.daily.chatConversations, // Tools share chat budget
        percentUsed: ((usageTracker.tools / TOKEN_BUDGETS.daily.chatConversations) * 100).toFixed(1) + "%",
      },
    },
    totalTokens,
    totalBudget: TOKEN_BUDGETS.daily.total,
    totalCost: `$${usageTracker.totalCost.toFixed(4)}`,
    healthStatus,
  }
}

/**
 * Reset usage tracker (for testing)
 */
export function resetUsageTracker(): void {
  usageTracker = createFreshTracker()
}

/**
 * Rate limiter for specific operations
 */
type RateLimitTracker = {
  windowStart: number
  count: number
}

const rateLimiters = new Map<string, RateLimitTracker>()

export function checkRateLimit(
  key: string,
  maxPerWindow: number,
  windowMs: number
): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now()
  const tracker = rateLimiters.get(key)
  
  if (!tracker || now - tracker.windowStart > windowMs) {
    // New window
    rateLimiters.set(key, { windowStart: now, count: 1 })
    return { allowed: true }
  }
  
  if (tracker.count >= maxPerWindow) {
    const retryAfterMs = windowMs - (now - tracker.windowStart)
    return { allowed: false, retryAfterMs }
  }
  
  tracker.count++
  return { allowed: true }
}

/**
 * News fetch rate limiter
 */
export function canFetchNews(): { allowed: boolean; retryAfterMs?: number } {
  return checkRateLimit(
    "news-fetch",
    TOKEN_BUDGETS.rateLimits.newsFetchesPerHour,
    60 * 60 * 1000 // 1 hour
  )
}

/**
 * AI call rate limiter
 */
export function canMakeAIRequest(): { allowed: boolean; retryAfterMs?: number } {
  return checkRateLimit(
    "ai-call",
    TOKEN_BUDGETS.rateLimits.aiCallsPerMinute,
    60 * 1000 // 1 minute
  )
}
