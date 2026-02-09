import { NextResponse } from "next/server"

import { ingestPortalListings, getPortalIngestionStats } from "@/jobs/ingestion/ingestPortalListings"
import { getSupabaseAdminClient } from "@/lib/db/client"

/**
 * Portal Ingestion API Route
 * --------------------------
 * Triggers portal listings ingestion for a tenant.
 * 
 * Security: Requires JOB_SECRET header or super_admin role in dev mode
 * 
 * POST /api/jobs/ingest-portals
 * {
 *   "orgId": "tenant-uuid",
 *   "portals": ["Bayut", "PropertyFinder"],  // optional
 *   "listingType": "sale",                    // optional
 *   "useMockData": false                      // optional
 * }
 */

const JOB_SECRET = process.env.JOB_SECRET

function isAuthorized(req: Request): boolean {
  if (!JOB_SECRET) {
    console.error("[ingest-portals] JOB_SECRET is not configured. Rejecting request.")
    return false
  }
  return req.headers.get("x-job-secret") === JOB_SECRET
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
  
  try {
    const body = await req.json().catch(() => ({})) as {
      orgId?: string
      portals?: ('Bayut' | 'PropertyFinder')[]
      listingType?: 'sale' | 'rent'
      areas?: string[]
      useMockData?: boolean
      mockCountPerPortal?: number
    }
    
    const orgId = await resolveTenantId(body.orgId)
    if (!orgId) {
      return NextResponse.json(
        { error: "Could not resolve orgId. Provide orgId in body or set DEMO_TENANT_ID." },
        { status: 400 }
      )
    }
    
    const result = await ingestPortalListings({
      orgId,
      portals: body.portals,
      listingType: body.listingType,
      areas: body.areas,
      useMockData: body.useMockData ?? false,
      mockCountPerPortal: body.mockCountPerPortal,
      onProgress: (message) => {
        console.log(`[ingest-portals] ${message}`)
      },
    })
    
    return NextResponse.json({
      ok: result.success,
      result: {
        orgId,
        totalFetched: result.totalFetched,
        totalIngested: result.totalIngested,
        totalSkipped: result.totalSkipped,
        totalPriceCuts: result.totalPriceCuts,
        durationMs: result.durationMs,
        portals: result.results.map(r => ({
          portal: r.portal,
          fetched: r.listingsFetched,
          ingested: r.listingsIngested,
          priceCuts: r.priceCutsDetected,
          success: r.success,
          errors: r.errors.length > 0 ? r.errors : undefined,
        })),
      },
    })
  } catch (error) {
    console.error("[ingest-portals] Error:", error)
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
    
    const stats = await getPortalIngestionStats(orgId)
    
    return NextResponse.json({
      ok: true,
      orgId,
      stats,
    })
  } catch (error) {
    console.error("[ingest-portals] Stats error:", error)
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
