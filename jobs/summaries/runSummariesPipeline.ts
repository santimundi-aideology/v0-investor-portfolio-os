import "server-only"

import { computeAIMarketSummaries } from "./computeAISummaries"
import { computeInvestorSummaries } from "./computeInvestorSummaries"

/**
 * SUMMARIES PIPELINE ORCHESTRATOR
 * --------------------------------
 * Computes all AI summary tables after ingestion and signal detection.
 * 
 * Pipeline:
 * 1. AI Market Summaries (from snapshot tables)
 * 2. AI Investor Summaries (from investors + holdings)
 * 
 * Run after: Signal pipeline completes
 */

export interface SummariesPipelineOptions {
  orgId: string
  skipMarket?: boolean
  skipInvestor?: boolean
  onProgress?: (stage: string, message: string) => void
}

export interface SummariesPipelineResult {
  success: boolean
  market: {
    summariesCreated: number
    skipped: boolean
    errors: string[]
  }
  investor: {
    summariesCreated: number
    skipped: boolean
    errors: string[]
  }
  totalDurationMs: number
}

export async function runSummariesPipeline(
  options: SummariesPipelineOptions
): Promise<SummariesPipelineResult> {
  const started = Date.now()
  const result: SummariesPipelineResult = {
    success: true,
    market: { summariesCreated: 0, skipped: false, errors: [] },
    investor: { summariesCreated: 0, skipped: false, errors: [] },
    totalDurationMs: 0,
  }
  
  options.onProgress?.('init', 'Starting summaries pipeline')
  
  // Step 1: Market Summaries
  if (!options.skipMarket) {
    options.onProgress?.('market', 'Computing AI market summaries...')
    
    try {
      const marketResult = await computeAIMarketSummaries(options.orgId)
      
      result.market = {
        summariesCreated: marketResult.summariesCreated,
        skipped: false,
        errors: marketResult.errors,
      }
      
      if (marketResult.errors.length > 0) {
        result.success = false
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      result.market.errors.push(msg)
      result.success = false
    }
    
    options.onProgress?.('market', `Market summaries complete: ${result.market.summariesCreated} created`)
  } else {
    result.market.skipped = true
    options.onProgress?.('market', 'Market summaries skipped')
  }
  
  // Step 2: Investor Summaries
  if (!options.skipInvestor) {
    options.onProgress?.('investor', 'Computing AI investor summaries...')
    
    try {
      const investorResult = await computeInvestorSummaries(options.orgId)
      
      result.investor = {
        summariesCreated: investorResult.summariesCreated,
        skipped: false,
        errors: investorResult.errors,
      }
      
      if (investorResult.errors.length > 0) {
        result.success = false
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      result.investor.errors.push(msg)
      result.success = false
    }
    
    options.onProgress?.('investor', `Investor summaries complete: ${result.investor.summariesCreated} created`)
  } else {
    result.investor.skipped = true
    options.onProgress?.('investor', 'Investor summaries skipped')
  }
  
  result.totalDurationMs = Date.now() - started
  
  options.onProgress?.('complete', `Summaries pipeline complete in ${result.totalDurationMs}ms`)
  
  console.log(
    `[runSummariesPipeline] orgId=${options.orgId} ` +
    `market=${result.market.summariesCreated} investor=${result.investor.summariesCreated} ` +
    `success=${result.success} duration=${result.totalDurationMs}ms`
  )
  
  return result
}
