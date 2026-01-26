import { NextResponse } from "next/server"

import { ingestEjariContracts, getEjariIngestionStats } from "@/jobs/ingestion/ingestEjariContracts"
import { getSupabaseAdminClient } from "@/lib/db/client"

/**
 * Ejari Ingestion API Route
 * -------------------------
 * Triggers Ejari contract ingestion for a tenant.
 * 
 * Security: Requires JOB_SECRET header or super_admin role in dev mode
 * 
 * POST /api/jobs/ingest-ejari
 * {
 *   "orgId": "tenant-uuid",
 *   "fromDate": "2024-01-01",  // optional
 *   "toDate": "2024-12-31",    // optional
 *   "useMockData": false       // optional, for testing
 * }
 */

const JOB_SECRET = process.env.JOB_SECRET

function isAuthorized(req: Request): boolean {
  const secret = req.headers.get("x-job-secret")
  
  // In production, require JOB_SECRET
  if (JOB_SECRET) {
    return secret === JOB_SECRET
  }
  
  // In dev mode without JOB_SECRET, allow super_admin role
  const role = req.headers.get("x-role")
  return role === "super_admin"
}

async function resolveTenantId(providedId?: string): Promise<string | null> {
  if (providedId) return providedId
  
  // Try environment variable
  if (process.env.DEMO_TENANT_ID) return process.env.DEMO_TENANT_ID
  
  // Fallback to first tenant
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
  
  try {
    const body = await req.json().catch(() => ({})) as {
      orgId?: string
      fromDate?: string
      toDate?: string
      useMockData?: boolean
      mockCount?: number
    }
    
    const orgId = await resolveTenantId(body.orgId)
    if (!orgId) {
      return NextResponse.json(
        { error: "Could not resolve orgId. Provide orgId in body or set DEMO_TENANT_ID." },
        { status: 400 }
      )
    }
    
    const result = await ingestEjariContracts({
      orgId,
      fromDate: body.fromDate,
      toDate: body.toDate,
      useMockData: body.useMockData ?? false,
      mockCount: body.mockCount,
      onProgress: (message) => {
        console.log(`[ingest-ejari] ${message}`)
      },
    })
    
    return NextResponse.json({
      ok: result.success,
      result: {
        orgId,
        contractsFetched: result.contractsFetched,
        contractsIngested: result.contractsIngested,
        contractsSkipped: result.contractsSkipped,
        dateRange: result.dateRange,
        durationMs: result.durationMs,
        errors: result.errors.length > 0 ? result.errors : undefined,
      },
    })
  } catch (error) {
    console.error("[ingest-ejari] Error:", error)
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { error: "Unauthorized. Provide x-job-secret header." },
      { status: 401 }
    )
  }
  
  try {
    const { searchParams } = new URL(req.url)
    const orgId = await resolveTenantId(searchParams.get("orgId") ?? undefined)
    
    if (!orgId) {
      return NextResponse.json(
        { error: "Could not resolve orgId." },
        { status: 400 }
      )
    }
    
    const stats = await getEjariIngestionStats(orgId)
    
    return NextResponse.json({
      ok: true,
      orgId,
      stats,
    })
  } catch (error) {
    console.error("[ingest-ejari] Stats error:", error)
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
