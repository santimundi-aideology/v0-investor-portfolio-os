/**
 * RATE LIMITER
 * ------------
 * Simple rate limiter for API requests.
 * Prevents hitting rate limits when ingesting data from external APIs.
 */

export interface RateLimiterOptions {
  maxRequests: number      // Maximum requests per window
  windowMs: number         // Window size in milliseconds
  retryAfterMs?: number    // Wait time after hitting limit (default: windowMs)
}

export interface RateLimiter {
  acquire(): Promise<void>
  tryAcquire(): boolean
  getStats(): { remaining: number; resetIn: number }
}

/**
 * Create a sliding window rate limiter
 */
export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const { maxRequests, windowMs, retryAfterMs = windowMs } = options
  const timestamps: number[] = []
  
  function cleanup() {
    const cutoff = Date.now() - windowMs
    while (timestamps.length > 0 && timestamps[0] < cutoff) {
      timestamps.shift()
    }
  }
  
  function tryAcquire(): boolean {
    cleanup()
    
    if (timestamps.length < maxRequests) {
      timestamps.push(Date.now())
      return true
    }
    
    return false
  }
  
  async function acquire(): Promise<void> {
    while (!tryAcquire()) {
      // Calculate wait time until oldest request expires
      const oldestRequest = timestamps[0] ?? Date.now()
      const waitTime = Math.max(0, oldestRequest + windowMs - Date.now() + 10)
      
      await sleep(Math.min(waitTime, retryAfterMs))
    }
  }
  
  function getStats(): { remaining: number; resetIn: number } {
    cleanup()
    const remaining = Math.max(0, maxRequests - timestamps.length)
    const resetIn = timestamps.length > 0
      ? Math.max(0, timestamps[0] + windowMs - Date.now())
      : 0
    
    return { remaining, resetIn }
  }
  
  return { acquire, tryAcquire, getStats }
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: {
    maxRetries?: number
    initialDelayMs?: number
    maxDelayMs?: number
    shouldRetry?: (error: unknown) => boolean
  }
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 30000,
    shouldRetry = () => true,
  } = options ?? {}
  
  let lastError: unknown
  let delay = initialDelayMs
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error
      }
      
      console.warn(
        `[withRetry] Attempt ${attempt + 1}/${maxRetries + 1} failed, retrying in ${delay}ms:`,
        error instanceof Error ? error.message : error
      )
      
      await sleep(delay)
      delay = Math.min(delay * 2, maxDelayMs)
    }
  }
  
  throw lastError
}

/**
 * Create a rate-limited version of a function
 */
export function withRateLimit<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  limiter: RateLimiter
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    await limiter.acquire()
    return fn(...args)
  }
}

/**
 * Batch process items with rate limiting
 */
export async function batchProcess<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options?: {
    batchSize?: number
    delayBetweenBatches?: number
    limiter?: RateLimiter
    onProgress?: (processed: number, total: number) => void
  }
): Promise<{ results: R[]; errors: Array<{ item: T; error: unknown }> }> {
  const {
    batchSize = 10,
    delayBetweenBatches = 100,
    limiter,
    onProgress,
  } = options ?? {}
  
  const results: R[] = []
  const errors: Array<{ item: T; error: unknown }> = []
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    
    // Process batch in parallel
    const batchPromises = batch.map(async (item) => {
      try {
        if (limiter) {
          await limiter.acquire()
        }
        const result = await processor(item)
        results.push(result)
      } catch (error) {
        errors.push({ item, error })
      }
    })
    
    await Promise.all(batchPromises)
    
    onProgress?.(Math.min(i + batchSize, items.length), items.length)
    
    // Delay between batches (unless this is the last batch)
    if (i + batchSize < items.length && delayBetweenBatches > 0) {
      await sleep(delayBetweenBatches)
    }
  }
  
  return { results, errors }
}

// Pre-configured rate limiters for common APIs
export const API_RATE_LIMITERS = {
  // DLD API: Conservative default
  dld: createRateLimiter({
    maxRequests: 10,
    windowMs: 1000,
  }),
  
  // Portal APIs: More conservative for scraping
  bayut: createRateLimiter({
    maxRequests: 5,
    windowMs: 1000,
  }),
  
  propertyfinder: createRateLimiter({
    maxRequests: 5,
    windowMs: 1000,
  }),
  
  // Default for unknown APIs
  default: createRateLimiter({
    maxRequests: 3,
    windowMs: 1000,
  }),
}
