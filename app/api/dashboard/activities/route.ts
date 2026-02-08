import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError } from "@/lib/security/rbac"

/**
 * GET /api/dashboard/activities
 * Returns recent activity feed
 */
export async function GET(req: Request) {
  try {
    const ctx = await requireAuthContext(req)
    if (!ctx.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = getSupabaseAdminClient()

    // Get recent audit events as activity feed
    const { data: activities } = await supabase
      .from("audit_events")
      .select("event_id, event_type, object_type, object_id, timestamp, metadata, actor_id")
      .eq("tenant_id", ctx.tenantId)
      .order("timestamp", { ascending: false })
      .limit(20)

    // Transform audit events to activity format
    const activityFeed = activities?.map((event) => {
      const metadata = (event.metadata as Record<string, unknown>) || {}
      let title = ""
      let description = ""
      let type = event.event_type

      // Generate human-readable activity from event type
      switch (event.event_type) {
        case "investor.created":
          title = "New investor added"
          description = metadata.name ? `${metadata.name} was added to the system` : "A new investor was added"
          type = "investor_added"
          break
        case "memo.created":
          title = "IC Memo created"
          description = metadata.propertyTitle ? `Memo created for ${metadata.propertyTitle}` : "A new IC memo was created"
          type = "memo_created"
          break
        case "property.listed":
          title = "Property listed"
          description = metadata.title ? `${metadata.title} was added to inventory` : "A new property was listed"
          type = "property_listed"
          break
        case "task.completed":
          title = "Task completed"
          description = metadata.title ? `${metadata.title} was marked complete` : "A task was completed"
          type = "task_completed"
          break
        case "deal.updated":
          title = "Deal updated"
          description = metadata.propertyTitle ? `${metadata.propertyTitle} deal progressed` : "A deal was updated"
          type = "deal_updated"
          break
        default:
          title = event.event_type.replace(/\./g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
          description = metadata.description as string || "Activity occurred"
      }

      return {
        id: event.event_id,
        type,
        title,
        description,
        timestamp: event.timestamp,
      }
    }) || []

    return NextResponse.json({ activities: activityFeed })
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[dashboard/activities] Error:", err)
    return NextResponse.json({ error: "Failed to fetch activities" }, { status: 500 })
  }
}
