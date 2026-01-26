import "server-only"

import { ingestDldTransactions } from "./ingestDldTransactions"
import { ingestEjariContracts } from "./ingestEjariContracts"
import { ingestPortalListings } from "./ingestPortalListings"

/**
 * INGESTION PIPELINE ORCHESTRATOR
 * --------------------------------
 * Runs all data ingestion jobs in sequence.
 * 
 * Pipeline:
 * 1. DLD Transactions (government truth)
 * 2. Ejari Contracts (rental truth)
 * 3. Portal Listings (market data)
 * 
 * After this completes, run:
 * - Signal pipeline (jobs/signals/runSignalsPipeline.ts)
 * - AI summary computation (jobs/summaries/)
 */

export interface IngestionPipelineOptions {
  orgId: string
  // DLD options
  dldFromDate?: string
  dldToDate?: string
  skipDld?: boolean
  // Ejari options
  ejariFromDate?: string
  ejariToDate?: string
  skipEjari?: boolean
  // Portal options
  portals?: ('Bayut' | 'PropertyFinder')[]
  skipPortals?: boolean
  // Testing
  useMockData?: boolean
  // Progress callback
  onProgress?: (stage: string, message: string) => void
}

export interface IngestionPipelineResult {
  success: boolean
  dld: {
    fetched: number
    ingested: number
    skipped: boolean
    errors: string[]
  }
  ejari: {
    fetched: number
    ingested: number
    skipped: boolean
    errors: string[]
  }
  portals: {
    fetched: number
    ingested: number
    priceCuts: number
    skipped: boolean
    errors: string[]
  }
  totalDurationMs: number
}

export async function runIngestionPipeline(
  options: IngestionPipelineOptions
): Promise<IngestionPipelineResult> {
  const started = Date.now()
  const result: IngestionPipelineResult = {
    success: true,
    dld: { fetched: 0, ingested: 0, skipped: false, errors: [] },
    ejari: { fetched: 0, ingested: 0, skipped: false, errors: [] },
    portals: { fetched: 0, ingested: 0, priceCuts: 0, skipped: false, errors: [] },
    totalDurationMs: 0,
  }
  
  options.onProgress?.('init', 'Starting ingestion pipeline')
  
  // Step 1: DLD Transactions
  if (!options.skipDld) {
    options.onProgress?.('dld', 'Ingesting DLD transactions...')
    
    try {
      const dldResult = await ingestDldTransactions({
        orgId: options.orgId,
        fromDate: options.dldFromDate,
        toDate: options.dldToDate,
        useMockData: options.useMockData,
        onProgress: (msg) => options.onProgress?.('dld', msg),
      })
      
      result.dld = {
        fetched: dldResult.transactionsFetched,
        ingested: dldResult.transactionsIngested,
        skipped: false,
        errors: dldResult.errors,
      }
      
      if (!dldResult.success) {
        result.success = false
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      result.dld.errors.push(msg)
      result.success = false
    }
    
    options.onProgress?.('dld', `DLD complete: ${result.dld.ingested} ingested`)
  } else {
    result.dld.skipped = true
    options.onProgress?.('dld', 'DLD skipped')
  }
  
  // Step 2: Ejari Contracts
  if (!options.skipEjari) {
    options.onProgress?.('ejari', 'Ingesting Ejari contracts...')
    
    try {
      const ejariResult = await ingestEjariContracts({
        orgId: options.orgId,
        fromDate: options.ejariFromDate,
        toDate: options.ejariToDate,
        useMockData: options.useMockData,
        onProgress: (msg) => options.onProgress?.('ejari', msg),
      })
      
      result.ejari = {
        fetched: ejariResult.contractsFetched,
        ingested: ejariResult.contractsIngested,
        skipped: false,
        errors: ejariResult.errors,
      }
      
      if (!ejariResult.success) {
        result.success = false
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      result.ejari.errors.push(msg)
      result.success = false
    }
    
    options.onProgress?.('ejari', `Ejari complete: ${result.ejari.ingested} ingested`)
  } else {
    result.ejari.skipped = true
    options.onProgress?.('ejari', 'Ejari skipped')
  }
  
  // Step 3: Portal Listings
  if (!options.skipPortals) {
    options.onProgress?.('portals', 'Ingesting portal listings...')
    
    try {
      const portalResult = await ingestPortalListings({
        orgId: options.orgId,
        portals: options.portals,
        useMockData: options.useMockData,
        onProgress: (msg) => options.onProgress?.('portals', msg),
      })
      
      result.portals = {
        fetched: portalResult.totalFetched,
        ingested: portalResult.totalIngested,
        priceCuts: portalResult.totalPriceCuts,
        skipped: false,
        errors: portalResult.results.flatMap(r => r.errors),
      }
      
      if (!portalResult.success) {
        result.success = false
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      result.portals.errors.push(msg)
      result.success = false
    }
    
    options.onProgress?.('portals', `Portals complete: ${result.portals.ingested} ingested, ${result.portals.priceCuts} price cuts`)
  } else {
    result.portals.skipped = true
    options.onProgress?.('portals', 'Portals skipped')
  }
  
  result.totalDurationMs = Date.now() - started
  
  options.onProgress?.('complete', `Pipeline complete in ${result.totalDurationMs}ms`)
  
  console.log(
    `[runIngestionPipeline] orgId=${options.orgId} ` +
    `dld=${result.dld.ingested} ejari=${result.ejari.ingested} ` +
    `portals=${result.portals.ingested} priceCuts=${result.portals.priceCuts} ` +
    `success=${result.success} duration=${result.totalDurationMs}ms`
  )
  
  return result
}
