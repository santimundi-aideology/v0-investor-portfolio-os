import "server-only"
import { getSupabaseAdminClient } from "./client"

/**
 * Fetches user_ids who should receive notifications for a given investor.
 * Priority:
 *  1. The investor's assigned agent (if present in investors.assigned_agent_id)
 *  2. All users with role='agent' or role='manager' in the org
 */
export async function getNotificationRecipientsForInvestor(
  orgId: string,
  investorId: string
): Promise<string[]> {
  try {
    const supabase = getSupabaseAdminClient()

    // 1) Try to find the assigned agent
    const { data: investor } = await supabase
      .from("investors")
      .select("assigned_agent_id")
      .eq("id", investorId)
      .eq("tenant_id", orgId)
      .maybeSingle()

    const recipients = new Set<string>()

    if (investor?.assigned_agent_id) {
      recipients.add(investor.assigned_agent_id)
    }

    // 2) Fallback: all agents/managers in org
    const { data: users } = await supabase
      .from("users")
      .select("id")
      .eq("tenant_id", orgId)
      .in("role", ["agent", "manager"])

    if (users) {
      for (const u of users) {
        recipients.add(u.id)
      }
    }

    return Array.from(recipients)
  } catch (e) {
    console.warn("[getNotificationRecipientsForInvestor] fallback to empty", e)
    return []
  }
}

export interface NotificationRow {
  org_id: string
  recipient_user_id: string
  entity_type: string
  entity_id: string
  title: string
  body: string
  notification_key?: string
  metadata?: Record<string, unknown>
  created_at?: string
}

/**
 * Batch-inserts notifications with dedupe:
 *  - If `notification_key` is provided, upsert on conflict.
 *  - Otherwise, check existing rows by (entity_type, entity_id, recipient_user_id) to avoid duplicates.
 * Returns: { inserted: number, skipped: number }
 */
export async function batchInsertNotifications(
  rows: NotificationRow[]
): Promise<{ inserted: number; skipped: number }> {
  if (rows.length === 0) return { inserted: 0, skipped: 0 }

  try {
    const supabase = getSupabaseAdminClient()

    // If all rows have notification_key, we can upsert directly
    const allHaveKey = rows.every((r) => r.notification_key)

    if (allHaveKey) {
      const payload = rows.map((r) => ({
        org_id: r.org_id,
        recipient_user_id: r.recipient_user_id,
        entity_type: r.entity_type,
        entity_id: r.entity_id,
        title: r.title,
        body: r.body,
        notification_key: r.notification_key!,
        metadata: r.metadata ?? null,
        created_at: r.created_at ?? new Date().toISOString(),
      }))

      const { data, error } = await supabase
        .from("notifications")
        .upsert(payload, { onConflict: "notification_key" })
        .select("id")

      if (error) throw error
      return { inserted: data?.length ?? 0, skipped: rows.length - (data?.length ?? 0) }
    }

    // Otherwise, check existing and insert only new
    const existingKeys = new Set<string>()
    for (const r of rows) {
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("org_id", r.org_id)
        .eq("entity_type", r.entity_type)
        .eq("entity_id", r.entity_id)
        .eq("recipient_user_id", r.recipient_user_id)
        .limit(1)

      if (existing && existing.length > 0) {
        existingKeys.add(`${r.org_id}|${r.entity_type}|${r.entity_id}|${r.recipient_user_id}`)
      }
    }

    const toInsert = rows.filter(
      (r) => !existingKeys.has(`${r.org_id}|${r.entity_type}|${r.entity_id}|${r.recipient_user_id}`)
    )

    if (toInsert.length === 0) return { inserted: 0, skipped: rows.length }

    const payload = toInsert.map((r) => ({
      org_id: r.org_id,
      recipient_user_id: r.recipient_user_id,
      entity_type: r.entity_type,
      entity_id: r.entity_id,
      title: r.title,
      body: r.body,
      notification_key: r.notification_key ?? null,
      metadata: r.metadata ?? null,
      created_at: r.created_at ?? new Date().toISOString(),
    }))

    const { error } = await supabase.from("notifications").insert(payload)
    if (error) throw error

    return { inserted: toInsert.length, skipped: rows.length - toInsert.length }
  } catch (e) {
    console.warn("[batchInsertNotifications] unable to insert; treating as skipped", e)
    return { inserted: 0, skipped: rows.length }
  }
}

