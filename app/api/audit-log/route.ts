import { NextResponse } from "next/server"

import { requireAuthContext } from "@/lib/auth/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { AccessError } from "@/lib/security/rbac"

function escapeCsv(value: unknown): string {
  const normalized = value == null ? "" : String(value)
  const escaped = normalized.replaceAll('"', '""')
  return `"${escaped}"`
}

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthContext(req)
    if (ctx.role !== "manager" && ctx.role !== "super_admin") {
      return NextResponse.json({ error: "Manager access required" }, { status: 403 })
    }
    if (!ctx.tenantId) {
      return NextResponse.json({ error: "Tenant context is required" }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient()
    const url = new URL(req.url)
    const eventType = (url.searchParams.get("eventType") ?? "").trim()
    const search = (url.searchParams.get("search") ?? "").trim().toLowerCase()
    const format = (url.searchParams.get("format") ?? "json").toLowerCase()
    const sinceRaw = (url.searchParams.get("since") ?? "").trim()
    const limitRaw = Number(url.searchParams.get("limit") ?? 100)
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 100

    let query = supabase
      .from("audit_events")
      .select("event_id, event_type, actor_id, actor_role, object_type, object_id, timestamp, metadata")
      .eq("tenant_id", ctx.tenantId)
      .order("timestamp", { ascending: false })
      .limit(limit)

    if (eventType) query = query.eq("event_type", eventType)
    if (sinceRaw) query = query.gte("timestamp", sinceRaw)

    const eventsResult = await query
    if (eventsResult.error) throw eventsResult.error
    const events = eventsResult.data ?? []

    const actorIds = [...new Set(events.map((e) => e.actor_id).filter(Boolean) as string[])]
    const usersResult = actorIds.length
      ? await supabase.from("users").select("id, name, email").in("id", actorIds)
      : { data: [], error: null }
    if (usersResult.error) throw usersResult.error
    const usersById = new Map((usersResult.data ?? []).map((u) => [u.id, u]))

    const rows = events
      .map((event) => {
        const user = event.actor_id ? usersById.get(event.actor_id) : null
        return {
          id: event.event_id,
          timestamp: event.timestamp,
          eventType: event.event_type,
          actorRole: event.actor_role,
          actorId: event.actor_id,
          actorName: user?.name ?? null,
          actorEmail: user?.email ?? null,
          objectType: event.object_type,
          objectId: event.object_id,
          metadata: event.metadata ?? null,
        }
      })
      .filter((event) => {
        if (!search) return true
        const text = [
          event.eventType,
          event.actorName,
          event.actorEmail,
          event.objectType,
          event.objectId,
          JSON.stringify(event.metadata ?? {}),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        return text.includes(search)
      })

    if (format === "csv") {
      const header = [
        "id",
        "timestamp",
        "event_type",
        "actor_role",
        "actor_name",
        "actor_email",
        "object_type",
        "object_id",
        "metadata_json",
      ].join(",")
      const lines = rows.map((row) =>
        [
          escapeCsv(row.id),
          escapeCsv(row.timestamp),
          escapeCsv(row.eventType),
          escapeCsv(row.actorRole),
          escapeCsv(row.actorName),
          escapeCsv(row.actorEmail),
          escapeCsv(row.objectType),
          escapeCsv(row.objectId),
          escapeCsv(JSON.stringify(row.metadata ?? {})),
        ].join(",")
      )
      const csv = [header, ...lines].join("\n")
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="audit-log.csv"',
        },
      })
    }

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      total: rows.length,
      events: rows,
    })
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[audit-log] Error:", err)
    return NextResponse.json({ error: "Failed to load audit log" }, { status: 500 })
  }
}

