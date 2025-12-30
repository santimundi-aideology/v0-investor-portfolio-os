import "server-only"
import {
  getNotificationRecipientsForInvestor,
  batchInsertNotifications,
  type NotificationRow,
} from "../../lib/db/notifications"
import { getSupabaseAdminClient } from "../../lib/db/client"

/**
 * Publishes notifications for newly mapped signals (status='new' in market_signal_target).
 * For each target, creates one notification per assigned realtor/team user.
 *
 * Notification title/body:
 *  - If source_type='official': prefix "Market Truth:"
 *  - If source_type='portal': prefix "Inventory Signal:"
 *
 * Dedupe: uses deterministic notification_key: org_id|recipient_user_id|signal_id|investor_id
 *
 * Returns: { sent: number, skipped: number }
 */
export async function publishNotifications(orgId: string): Promise<{ sent: number; skipped: number }> {
  try {
    const supabase = getSupabaseAdminClient()

    // 1) Fetch all market_signal_target rows with status='new' for this org
    const { data: targets, error: targetsError } = await supabase
      .from("market_signal_target")
      .select(
        `
        id,
        signal_id,
        investor_id,
        relevance_score,
        status
      `
      )
      .eq("org_id", orgId)
      .eq("status", "new")

    if (targetsError) throw targetsError
    if (!targets || targets.length === 0) {
      return { sent: 0, skipped: 0 }
    }

    // 2) Fetch the corresponding signals to build notification content
    const signalIds = [...new Set(targets.map((t) => t.signal_id))]
    const { data: signals, error: signalsError } = await supabase
      .from("market_signal")
      .select(
        `
        id,
        source_type,
        source,
        type,
        geo_name,
        segment,
        metric,
        timeframe,
        delta_pct,
        confidence_score
      `
      )
      .in("id", signalIds)

    if (signalsError) throw signalsError

    const signalMap = new Map(signals?.map((s) => [s.id, s]) ?? [])

    // 3) For each target, find recipients and build notification rows
    const notificationRows: NotificationRow[] = []

    for (const target of targets) {
      const signal = signalMap.get(target.signal_id)
      if (!signal) {
        console.warn(`[publishNotifications] signal ${target.signal_id} not found; skipping target ${target.id}`)
        continue
      }

      const recipients = await getNotificationRecipientsForInvestor(orgId, target.investor_id)
      if (recipients.length === 0) {
        console.warn(
          `[publishNotifications] no recipients for investor ${target.investor_id}; skipping target ${target.id}`
        )
        continue
      }

      const prefix = signal.source_type === "official" ? "Market Truth:" : "Inventory Signal:"
      const title = `${prefix} ${formatSignalType(signal.type)} in ${signal.geo_name} (${signal.segment})`

      const deltaPctFormatted = signal.delta_pct != null ? `${(signal.delta_pct * 100).toFixed(1)}%` : "N/A"
      const confidenceFormatted = signal.confidence_score != null ? `${(signal.confidence_score * 100).toFixed(0)}%` : "N/A"

      const body = `${signal.metric} changed by ${deltaPctFormatted} (${signal.timeframe}). Confidence: ${confidenceFormatted}. Relevance: ${(target.relevance_score * 100).toFixed(0)}%.`

      for (const recipientUserId of recipients) {
        const notificationKey = `${orgId}|${recipientUserId}|${target.signal_id}|${target.investor_id}`
        notificationRows.push({
          org_id: orgId,
          recipient_user_id: recipientUserId,
          entity_type: "market_signal",
          entity_id: target.signal_id,
          title,
          body,
          notification_key: notificationKey,
          metadata: {
            signal_id: target.signal_id,
            investor_id: target.investor_id,
            target_id: target.id,
            relevance_score: target.relevance_score,
          },
        })
      }
    }

    // 4) Batch insert notifications with dedupe
    const { inserted, skipped } = await batchInsertNotifications(notificationRows)

    console.log(`[publishNotifications] sent=${inserted}, skipped=${skipped} for orgId=${orgId}`)
    return { sent: inserted, skipped }
  } catch (e) {
    console.error("[publishNotifications] error:", e)
    return { sent: 0, skipped: 0 }
  }
}

function formatSignalType(type: string): string {
  switch (type) {
    case "price_change":
      return "Price change"
    case "rent_change":
      return "Rent change"
    case "yield_opportunity":
      return "Yield opportunity"
    case "supply_spike":
      return "Supply spike"
    case "discounting_spike":
      return "Discounting spike"
    case "staleness_rise":
      return "Staleness rise"
    default:
      return type
  }
}
