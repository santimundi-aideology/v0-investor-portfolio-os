import "server-only"

import { NextResponse } from "next/server"

import { getSupabaseAdminClient } from "@/lib/db/client"
import { listMarketSignalsFeed } from "@/lib/db/market-signals"

function isUuid(value: string | null | undefined): value is string {
  if (!value) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

async function resolveTenantId(req: Request): Promise<string> {
  const header = req.headers.get("x-tenant-id")
  if (isUuid(header)) return header
  if (isUuid(process.env.DEMO_TENANT_ID)) return process.env.DEMO_TENANT_ID

  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase.from("tenants").select("id").order("created_at", { ascending: true }).limit(1).maybeSingle()
  if (error) throw error
  if (!data?.id) throw new Error("Unable to resolve tenantId (no tenants found).")
  return data.id as string
}

/**
 * GET /api/signals
 *
 * Returns Market Signals feed for a tenant/org.
 * NOTE: This endpoint reads derived signals (not raw market data).
 */
export async function GET(req: Request) {
  try {
    const tenantId = await resolveTenantId(req)
    const { searchParams } = new URL(req.url)
    const limit = Number(searchParams.get("limit") ?? "50")

    const items = await listMarketSignalsFeed({ tenantId, limit: Number.isFinite(limit) ? limit : 50 })
    return NextResponse.json({ ok: true, tenantId, signals: items }, { status: 200 })
  } catch (e) {
    const error = e as Error
    return NextResponse.json({ ok: false, error: error?.message ?? String(e) }, { status: 500 })
  }
}


