import { NextResponse } from "next/server"

// Dynamic import to avoid server-only issues in edge cases
async function getSignalsPipeline() {
  const mod = await import("@/jobs/signals/runSignalsPipeline")
  return mod.runSignalsPipeline
}

/**
 * POST /api/jobs/run-signals
 *
 * Triggers the market signals pipeline for a given orgId.
 *
 * Security:
 *  - Requires header `x-job-secret` matching `process.env.JOB_SECRET`
 *  - If JOB_SECRET is not set, only allows in development mode with super_admin role
 *
 * Request body: { orgId: string }
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
 *
 * Cron entry (example with Vercel Cron):
 *   Add to vercel.json:
 *   {
 *     "crons": [{
 *       "path": "/api/jobs/run-signals",
 *       "schedule": "0 6 * * *"
 *     }]
 *   }
 */
export async function POST(req: Request) {
  try {
    // Security: check shared secret or dev mode + super_admin
    const jobSecret = process.env.JOB_SECRET
    const providedSecret = req.headers.get("x-job-secret")

    if (jobSecret) {
      // Production: require matching secret
      if (providedSecret !== jobSecret) {
        return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
      }
    } else {
      // Dev mode: allow if no JOB_SECRET is configured
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
          { ok: false, error: "JOB_SECRET not configured in production" },
          { status: 500 }
        )
      }
      // In development, allow requests without secret (for local testing)
      console.log("[run-signals] Dev mode: allowing request without JOB_SECRET")
    }

    // Parse body
    const body = await req.json().catch(() => ({}))
    const { orgId } = body

    if (!orgId || typeof orgId !== "string") {
      return NextResponse.json({ ok: false, error: "orgId required" }, { status: 400 })
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

