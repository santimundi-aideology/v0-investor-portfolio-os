import "server-only"

import { NextResponse } from "next/server"

import { getSupabaseAdminClient } from "@/lib/db/client"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError } from "@/lib/security/rbac"

/**
 * GET /api/notifications
 *
 * Returns notifications for the authenticated user only.
 * Investors see only their own; agents/managers see their own too
 * (agent-wide or tenant-wide notifications use recipient_user_id = null).
 *
 * Query params:
 *  - limit (default 50)
 */
export async function GET(req: Request) {
  try {
    const ctx = await requireAuthContext(req)
    if (!ctx.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 200)

    const supabase = getSupabaseAdminClient()

    // Always filter to the current user's notifications.
    // Rows where recipient_user_id IS NULL are treated as broadcast/tenant-wide.
    const { data, error } = await supabase
      .from("notifications")
      .select("id, org_id, recipient_user_id, entity_type, entity_id, title, body, read_at, created_at, metadata")
      .eq("org_id", ctx.tenantId)
      .or(`recipient_user_id.eq.${ctx.userId},recipient_user_id.is.null`)
      .order("created_at", { ascending: false })
      .limit(Number.isFinite(limit) ? limit : 50)

    if (error) {
      // Table may not exist yet — return empty instead of 500
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        return NextResponse.json({ ok: true, notifications: [] }, { status: 200 })
      }
      throw error
    }

    const response = NextResponse.json({ ok: true, notifications: data ?? [] })
    response.headers.set("Cache-Control", "private, max-age=15, stale-while-revalidate=30")
    return response
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[notifications] Error:", err)
    return NextResponse.json({ ok: true, notifications: [], _error: "Failed to fetch notifications" }, { status: 200 })
  }
}

export async function PATCH(req: Request) {
  try {
    const ctx = await requireAuthContext(req)
    if (!ctx.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { ids, markAll } = body as { ids?: string[]; markAll?: boolean }

    if (!markAll && (!Array.isArray(ids) || ids.length === 0)) {
      return NextResponse.json(
        { error: "Either markAll must be true or ids must be a non-empty array" },
        { status: 400 },
      )
    }

    const supabase = getSupabaseAdminClient()
    const readAt = new Date().toISOString()

    let q = supabase
      .from("notifications")
      .update({ read_at: readAt })
      .eq("org_id", ctx.tenantId)
      .eq("recipient_user_id", ctx.userId)
      .is("read_at", null)

    if (!markAll && ids?.length) {
      q = q.in("id", ids)
    }

    const { error } = await q
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: "Failed to mark read" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const ctx = await requireAuthContext(req)
    if (!ctx.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { ids } = body as { ids?: string[] }
    if (!ids?.length) {
      return NextResponse.json({ error: "ids required" }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient()
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("org_id", ctx.tenantId)
      .eq("recipient_user_id", ctx.userId)
      .in("id", ids)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: "Failed to delete notifications" }, { status: 500 })
  }
}
