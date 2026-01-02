import "server-only"

import { NextResponse } from "next/server"

import { getSupabaseAdminClient } from "@/lib/db/client"

function isUuid(value: string | null | undefined): value is string {
  if (!value) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

async function resolveTenantId(req: Request): Promise<string> {
  const header = req.headers.get("x-tenant-id")
  if (isUuid(header)) return header
  if (isUuid(process.env.DEMO_TENANT_ID)) return process.env.DEMO_TENANT_ID

  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from("tenants")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (!data?.id) throw new Error("Unable to resolve tenantId (no tenants found).")
  return data.id as string
}

/**
 * GET /api/notifications
 *
 * Minimal endpoint to make pipeline output visible in the UI.
 * Returns notifications from the DB (not mock session data).
 *
 * Query params:
 *  - limit (default 50)
 *  - recipientUserId (optional; if omitted returns all for tenant)
 */
export async function GET(req: Request) {
  try {
    const tenantId = await resolveTenantId(req)
    const { searchParams } = new URL(req.url)
    const limit = Number(searchParams.get("limit") ?? "50")
    const recipientUserId = searchParams.get("recipientUserId")

    const supabase = getSupabaseAdminClient()
    let q = supabase
      .from("notifications")
      .select("id, org_id, recipient_user_id, entity_type, entity_id, title, body, read_at, created_at, metadata")
      .eq("org_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(Number.isFinite(limit) ? limit : 50)

    if (recipientUserId) q = q.eq("recipient_user_id", recipientUserId)

    const { data, error } = await q
    if (error) throw error

    return NextResponse.json({ ok: true, tenantId, notifications: data ?? [] }, { status: 200 })
  } catch (e) {
    const error = e as Error
    return NextResponse.json({ ok: false, error: error?.message ?? String(e) }, { status: 500 })
  }
}


