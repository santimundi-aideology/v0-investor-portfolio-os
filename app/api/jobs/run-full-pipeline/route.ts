import { NextResponse } from "next/server"

import { runIngestionPipeline } from "@/jobs/ingestion/runIngestionPipeline"
import { runSignalsPipeline } from "@/jobs/signals/runSignalsPipeline"
import { runSummariesPipeline } from "@/jobs/summaries/runSummariesPipeline"
import { getSupabaseAdminClient } from "@/lib/db/client"

/**
 * Full Pipeline API Route
 * -----------------------
 * Runs the complete data pipeline:
 * 1. Ingestion (DLD, Ejari, Portals)
 * 2. Snapshot computation
 * 3. Signal detection
 * 4. Investor mapping
 * 5. Notifications
 * 6. AI summaries
 * 
 * Security: Requires JOB_SECRET header or super_admin role in dev mode
 * 
 * POST /api/jobs/run-full-pipeline
 * {
 *   "orgId": "tenant-uuid",
 *   "skipIngestion": false,
 *   "skipSignals": false,
 *   "skipSummaries": false,
 *   "useMockData": false
 * }
 */

const JOB_SECRET = process.env.JOB_SECRET

function isAuthorized(req: Request): boolean {
  const secret = req.headers.get("x-job-secret")
  
  if (JOB_SECRET) {
    return secret === JOB_SECRET
  }
  
  const role = req.headers.get("x-role")
  return role === "super_admin"
}

async function resolveTenantId(providedId?: string): Promise<string | null> {
  if (providedId) return providedId
  
  if (process.env.DEMO_TENANT_ID) return process.env.DEMO_TENANT_ID
  
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from("tenants")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()
  
  if (error || !data) return null
  return data.id as string
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { error: "Unauthorized. Provide x-job-secret header." },
      { status: 401 }
    )
  }
  
  const started = Date.now()
  
  try {
    const body = await req.json().catch(() => ({})) as {
      orgId?: string
      skipIngestion?: boolean
      skipSignals?: boolean
      skipSummaries?: boolean
      useMockData?: boolean
      // Ingestion options
      dldFromDate?: string
      dldToDate?: string
      ejariFromDate?: string
      ejariToDate?: string
      portals?: ('Bayut' | 'PropertyFinder')[]
    }
    
    const orgId = await resolveTenantId(body.orgId)
    if (!orgId) {
      return NextResponse.json(
        { error: "Could not resolve orgId. Provide orgId in body or set DEMO_TENANT_ID." },
        { status: 400 }
      )
    }
    
    const logs: string[] = []
    const logProgress = (stage: string, message: string) => {
      const entry = `[${stage}] ${message}`
      logs.push(entry)
      console.log(`[run-full-pipeline] ${entry}`)
    }
    
    // Results
    const result: {
      ok: boolean
      orgId: string
      ingestion?: Awaited<ReturnType<typeof runIngestionPipeline>>
      signals?: Awaited<ReturnType<typeof runSignalsPipeline>>
      summaries?: Awaited<ReturnType<typeof runSummariesPipeline>>
      totalDurationMs: number
      logs: string[]
    } = {
      ok: true,
      orgId,
      totalDurationMs: 0,
      logs,
    }
    
    // Step 1: Ingestion
    if (!body.skipIngestion) {
      logProgress('ingestion', 'Starting ingestion pipeline...')
      
      const ingestionResult = await runIngestionPipeline({
        orgId,
        dldFromDate: body.dldFromDate,
        dldToDate: body.dldToDate,
        ejariFromDate: body.ejariFromDate,
        ejariToDate: body.ejariToDate,
        portals: body.portals,
        useMockData: body.useMockData,
        onProgress: logProgress,
      })
      
      result.ingestion = ingestionResult
      
      if (!ingestionResult.success) {
        result.ok = false
      }
      
      logProgress('ingestion', `Complete: DLD=${ingestionResult.dld.ingested}, Ejari=${ingestionResult.ejari.ingested}, Portals=${ingestionResult.portals.ingested}`)
    } else {
      logProgress('ingestion', 'Skipped')
    }
    
    // Step 2: Signals (includes snapshot computation)
    if (!body.skipSignals) {
      logProgress('signals', 'Starting signal pipeline...')
      
      try {
        const signalsResult = await runSignalsPipeline(orgId)
        result.signals = signalsResult
        
        logProgress('signals', `Complete: Signals created=${(signalsResult.signals?.truthCreated ?? 0) + (signalsResult.signals?.portalCreated ?? 0)}, Mappings=${signalsResult.mappings?.targetsCreated ?? 0}`)
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        logProgress('signals', `Error: ${msg}`)
        result.ok = false
      }
    } else {
      logProgress('signals', 'Skipped')
    }
    
    // Step 3: AI Summaries
    if (!body.skipSummaries) {
      logProgress('summaries', 'Starting summaries pipeline...')
      
      const summariesResult = await runSummariesPipeline({
        orgId,
        onProgress: logProgress,
      })
      
      result.summaries = summariesResult
      
      if (!summariesResult.success) {
        result.ok = false
      }
      
      logProgress('summaries', `Complete: Market=${summariesResult.market.summariesCreated}, Investor=${summariesResult.investor.summariesCreated}`)
    } else {
      logProgress('summaries', 'Skipped')
    }
    
    result.totalDurationMs = Date.now() - started
    logProgress('complete', `Full pipeline completed in ${result.totalDurationMs}ms`)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error("[run-full-pipeline] Error:", error)
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        totalDurationMs: Date.now() - started,
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/jobs/run-full-pipeline
 *
 * Triggers the full pipeline (for Vercel Cron compatibility).
 * Runs ingestion + signals + summaries.
 *
 * Query params:
 *   - orgId: tenant UUID (optional, defaults to DEMO_TENANT_ID or first tenant)
 *   - skipIngestion: 'true' to skip ingestion stage
 *   - skipSignals: 'true' to skip signals stage
 *   - skipSummaries: 'true' to skip summaries stage
 *   - info: 'true' to just return endpoint info without running
 */
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { error: "Unauthorized. Provide x-job-secret header." },
      { status: 401 }
    )
  }
  
  const { searchParams } = new URL(req.url)
  
  // If info=true, return documentation
  if (searchParams.get("info") === "true") {
    return NextResponse.json({
      ok: true,
      message: "Full pipeline endpoint. Use POST for custom options or GET to run with defaults.",
      stages: [
        "1. Ingestion: DLD transactions, Ejari contracts, Portal listings",
        "2. Snapshots: Compute market_metric_snapshot, portal_listing_snapshot",
        "3. Signals: Detect price changes, supply spikes, yield opportunities, pricing opportunities",
        "4. Mapping: Match signals to investor mandates",
        "5. Notifications: Alert realtors of relevant signals",
        "6. Summaries: Compute AI-safe market and investor summaries",
      ],
    })
  }
  
  const started = Date.now()
  
  try {
    const orgId = await resolveTenantId(searchParams.get("orgId") ?? undefined)
    if (!orgId) {
      return NextResponse.json(
        { error: "Could not resolve orgId. Set DEMO_TENANT_ID or pass ?orgId=..." },
        { status: 400 }
      )
    }
    
    const skipIngestion = searchParams.get("skipIngestion") === "true"
    const skipSignals = searchParams.get("skipSignals") === "true"
    const skipSummaries = searchParams.get("skipSummaries") === "true"
    
    const logs: string[] = []
    const logProgress = (stage: string, message: string) => {
      const entry = `[${stage}] ${message}`
      logs.push(entry)
      console.log(`[run-full-pipeline GET] ${entry}`)
    }
    
    const result: {
      ok: boolean
      orgId: string
      ingestion?: Awaited<ReturnType<typeof runIngestionPipeline>>
      signals?: Awaited<ReturnType<typeof runSignalsPipeline>>
      summaries?: Awaited<ReturnType<typeof runSummariesPipeline>>
      totalDurationMs: number
      logs: string[]
    } = {
      ok: true,
      orgId,
      totalDurationMs: 0,
      logs,
    }
    
    // Step 1: Ingestion
    if (!skipIngestion) {
      logProgress('ingestion', 'Starting ingestion pipeline...')
      
      const ingestionResult = await runIngestionPipeline({
        orgId,
        onProgress: logProgress,
      })
      
      result.ingestion = ingestionResult
      
      if (!ingestionResult.success) {
        result.ok = false
      }
      
      logProgress('ingestion', `Complete: DLD=${ingestionResult.dld.ingested}, Ejari=${ingestionResult.ejari.ingested}, Portals=${ingestionResult.portals.ingested}`)
    } else {
      logProgress('ingestion', 'Skipped')
    }
    
    // Step 2: Signals
    if (!skipSignals) {
      logProgress('signals', 'Starting signal pipeline...')
      
      try {
        const signalsResult = await runSignalsPipeline(orgId)
        result.signals = signalsResult
        
        const signalCount = (signalsResult.signals?.truthCreated ?? 0) + (signalsResult.signals?.portalCreated ?? 0) + (signalsResult.signals?.pricingCreated ?? 0)
        logProgress('signals', `Complete: Signals created=${signalCount} (pricing=${signalsResult.signals?.pricingCreated ?? 0}), Mappings=${signalsResult.mappings?.targetsCreated ?? 0}`)
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        logProgress('signals', `Error: ${msg}`)
        result.ok = false
      }
    } else {
      logProgress('signals', 'Skipped')
    }
    
    // Step 3: AI Summaries
    if (!skipSummaries) {
      logProgress('summaries', 'Starting summaries pipeline...')
      
      const summariesResult = await runSummariesPipeline({
        orgId,
        onProgress: logProgress,
      })
      
      result.summaries = summariesResult
      
      if (!summariesResult.success) {
        result.ok = false
      }
      
      logProgress('summaries', `Complete: Market=${summariesResult.market.summariesCreated}, Investor=${summariesResult.investor.summariesCreated}`)
    } else {
      logProgress('summaries', 'Skipped')
    }
    
    result.totalDurationMs = Date.now() - started
    logProgress('complete', `Full pipeline completed in ${result.totalDurationMs}ms`)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error("[run-full-pipeline GET] Error:", error)
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        totalDurationMs: Date.now() - started,
      },
      { status: 500 }
    )
  }
}
