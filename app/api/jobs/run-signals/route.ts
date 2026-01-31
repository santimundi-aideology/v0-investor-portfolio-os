import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"

// Dynamic import to avoid server-only issues in edge cases
async function getSignalsPipeline() {
  const mod = await import("@/jobs/signals/runSignalsPipeline")
  return mod.runSignalsPipeline
}

const JOB_SECRET = process.env.JOB_SECRET

function isAuthorized(req: Request): boolean {
  const secret = req.headers.get("x-job-secret")
  
  // In production, require JOB_SECRET
  if (JOB_SECRET) {
    return secret === JOB_SECRET
  }
  
  // In dev mode without JOB_SECRET, allow super_admin role or any request
  if (process.env.NODE_ENV !== "production") {
    return true
  }
  
  return false
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

/**
 * POST /api/jobs/run-signals
 *
 * Triggers the market signals pipeline for a given orgId.
 *
 * Security:
 *  - Requires header `x-job-secret` matching `process.env.JOB_SECRET`
 *  - If JOB_SECRET is not set, only allows in development mode
 *
 * Request body: { orgId?: string }
 *
 * Response:
 *  - 200: { ok: true, result: SignalsPipelineResult }
 *  - 401: { ok: false, error: "Unauthorized" }
 *  - 400: { ok: false, error: "orgId required" }
 *  - 500: { ok: false, error: string }
 *
 * Example curl:
 *   curl -X POST http://localhost:3000/api/jobs/run-signals \
 *     -H "Content-Type: application/json" \
 *     -H "x-job-secret: YOUR_SECRET" \
 *     -d '{"orgId":"tenant-1"}'
 */
export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Parse body
    const body = await req.json().catch(() => ({})) as { orgId?: string }
    const orgId = await resolveTenantId(body.orgId)

    if (!orgId) {
      return NextResponse.json({ ok: false, error: "Could not resolve orgId. Provide orgId in body or set DEMO_TENANT_ID." }, { status: 400 })
    }

    // Run the pipeline
    console.log(`[POST /api/jobs/run-signals] Starting pipeline for orgId=${orgId}`)
    const runSignalsPipeline = await getSignalsPipeline()
    const result = await runSignalsPipeline(orgId)

    if (result.errors.length > 0) {
      console.warn(`[POST /api/jobs/run-signals] Pipeline completed with errors:`, result.errors)
    }

    return NextResponse.json({ ok: true, result }, { status: 200 })
  } catch (e) {
    const error = e as Error & { name?: string; stack?: string }
    console.error("[POST /api/jobs/run-signals] Unexpected error:", error)
    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? String(e),
        details: {
          name: error?.name,
          stack: process.env.NODE_ENV === "development" ? error?.stack : undefined,
        },
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/jobs/run-signals
 *
 * Triggers the market signals pipeline (for Vercel Cron compatibility).
 * Uses DEMO_TENANT_ID or first tenant if orgId not specified.
 *
 * Vercel cron calls endpoints with GET by default.
 * Configure in vercel.json:
 *   {
 *     "crons": [{
 *       "path": "/api/jobs/run-signals",
 *       "schedule": "0 6 * * *"
 *     }]
 *   }
 */
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const orgId = await resolveTenantId(searchParams.get("orgId") ?? undefined)

    if (!orgId) {
      return NextResponse.json({ ok: false, error: "Could not resolve orgId. Set DEMO_TENANT_ID or pass ?orgId=..." }, { status: 400 })
    }

    // Run the pipeline
    console.log(`[GET /api/jobs/run-signals] Starting pipeline for orgId=${orgId}`)
    const runSignalsPipeline = await getSignalsPipeline()
    const result = await runSignalsPipeline(orgId)

    if (result.errors.length > 0) {
      console.warn(`[GET /api/jobs/run-signals] Pipeline completed with errors:`, result.errors)
    }

    return NextResponse.json({ ok: true, result }, { status: 200 })
  } catch (e) {
    const error = e as Error & { name?: string; stack?: string }
    console.error("[GET /api/jobs/run-signals] Unexpected error:", error)
    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? String(e),
        details: {
          name: error?.name,
          stack: process.env.NODE_ENV === "development" ? error?.stack : undefined,
        },
      },
      { status: 500 }
    )
  }
}

