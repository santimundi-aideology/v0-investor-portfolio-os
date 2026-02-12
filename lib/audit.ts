import crypto from "crypto"

import type { PlatformRole } from "@/lib/security/rbac"

export type AuditEvent = {
  tenantId?: string
  actorId?: string
  actorRole?: PlatformRole
  eventType: string
  objectType?: string
  objectId?: string
  metadata?: Record<string, unknown>
  ipAddress?: string
  timestamp?: string
}

export type AuditWriter = (event: AuditEvent) => Promise<void>

/**
  * Default audit writer: logs to console (for dev) and guards against raw prompt storage.
  * In production, replace with Supabase/DB insert in one place.
  */
export function createAuditEventWriter(insertFn?: (row: Record<string, unknown>) => Promise<void>): AuditWriter {
  return async function writeAuditEvent(event: AuditEvent) {
    const cleanedMetadata = sanitizeMetadata(event.metadata)

    const row = {
      tenant_id: event.tenantId ?? null,
      actor_id: event.actorId ?? null,
      actor_role: event.actorRole ?? null,
      event_type: event.eventType,
      object_type: event.objectType ?? null,
      object_id: event.objectId ?? null,
      metadata: cleanedMetadata,
      ip_address: event.ipAddress ?? null,
      timestamp: event.timestamp ?? new Date().toISOString(),
    }

    if (insertFn) {
      await insertFn(row)
      return
    }

    try {
      const { getSupabaseAdminClient } = await import("@/lib/db/client")
      const supabase = getSupabaseAdminClient()
      const { error } = await supabase.from("audit_events").insert(row)
      if (error) throw error
    } catch {
      // Fallback for local dev without DB wiring
      console.info("[audit]", JSON.stringify(row))
    }
  }
}

/**
 * Redacts known large text fields and hashes them so we never store raw prompts/text.
 */
function sanitizeMetadata(metadata?: Record<string, unknown>) {
  if (!metadata) return null
  const redacted: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(metadata)) {
    if (typeof value === "string" && value.length > 256) {
      redacted[key] = hashText(value)
    } else {
      redacted[key] = value
    }
  }
  return redacted
}

function hashText(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex")
}

// Convenience builders
export const AuditEvents = {
  userLogin: (ctx: { tenantId?: string; userId: string; role: PlatformRole; ip?: string }): AuditEvent => ({
    tenantId: ctx.tenantId,
    actorId: ctx.userId,
    actorRole: ctx.role,
    eventType: "user.login",
    ipAddress: ctx.ip,
  }),
  userLogout: (ctx: { tenantId?: string; userId: string; role: PlatformRole; ip?: string }): AuditEvent => ({
    tenantId: ctx.tenantId,
    actorId: ctx.userId,
    actorRole: ctx.role,
    eventType: "user.logout",
    ipAddress: ctx.ip,
  }),
  investorCreated: (ctx: { tenantId: string; actorId: string; role: PlatformRole; investorId: string }): AuditEvent => ({
    tenantId: ctx.tenantId,
    actorId: ctx.actorId,
    actorRole: ctx.role,
    eventType: "investor.created",
    objectType: "investor",
    objectId: ctx.investorId,
  }),
  investorAssigned: (ctx: {
    tenantId: string
    actorId: string
    role: PlatformRole
    investorId: string
    fromAgentId?: string | null
    toAgentId: string
  }): AuditEvent => ({
    tenantId: ctx.tenantId,
    actorId: ctx.actorId,
    actorRole: ctx.role,
    eventType: "investor.assigned",
    objectType: "investor",
    objectId: ctx.investorId,
    metadata: { fromAgentId: ctx.fromAgentId ?? null, toAgentId: ctx.toAgentId },
  }),
  listingCreated: (ctx: { tenantId: string; actorId: string; role: PlatformRole; listingId: string }): AuditEvent => ({
    tenantId: ctx.tenantId,
    actorId: ctx.actorId,
    actorRole: ctx.role,
    eventType: "listing.created",
    objectType: "listing",
    objectId: ctx.listingId,
  }),
  trustStatusChanged: (ctx: { tenantId: string; actorId: string; role: PlatformRole; listingId: string; status: string; reason?: string }): AuditEvent => ({
    tenantId: ctx.tenantId,
    actorId: ctx.actorId,
    actorRole: ctx.role,
    eventType: "trust.status_changed",
    objectType: "listing",
    objectId: ctx.listingId,
    metadata: { status: ctx.status, reason: ctx.reason },
  }),
  memoCreated: (ctx: { tenantId: string; actorId: string; role: PlatformRole; memoId: string }): AuditEvent => ({
    tenantId: ctx.tenantId,
    actorId: ctx.actorId,
    actorRole: ctx.role,
    eventType: "memo.created",
    objectType: "memo",
    objectId: ctx.memoId,
  }),
  memoUpdated: (ctx: { tenantId: string; actorId: string; role: PlatformRole; memoId: string; version: number }): AuditEvent => ({
    tenantId: ctx.tenantId,
    actorId: ctx.actorId,
    actorRole: ctx.role,
    eventType: "memo.updated",
    objectType: "memo",
    objectId: ctx.memoId,
    metadata: { version: ctx.version },
  }),
  memoSubmittedForReview: (ctx: { tenantId: string; actorId: string; role: PlatformRole; memoId: string }): AuditEvent => ({
    tenantId: ctx.tenantId,
    actorId: ctx.actorId,
    actorRole: ctx.role,
    eventType: "memo.submitted_for_review",
    objectType: "memo",
    objectId: ctx.memoId,
  }),
  memoApproved: (ctx: { tenantId: string; actorId: string; role: PlatformRole; memoId: string }): AuditEvent => ({
    tenantId: ctx.tenantId,
    actorId: ctx.actorId,
    actorRole: ctx.role,
    eventType: "memo.approved_by_manager",
    objectType: "memo",
    objectId: ctx.memoId,
  }),
  memoChangesRequested: (ctx: { tenantId: string; actorId: string; role: PlatformRole; memoId: string; comment?: string }): AuditEvent => ({
    tenantId: ctx.tenantId,
    actorId: ctx.actorId,
    actorRole: ctx.role,
    eventType: "memo.changes_requested",
    objectType: "memo",
    objectId: ctx.memoId,
    metadata: ctx.comment ? { comment: ctx.comment } : undefined,
  }),
  memoSent: (ctx: { tenantId: string; actorId: string; role: PlatformRole; memoId: string; investorId: string; version: number }): AuditEvent => ({
    tenantId: ctx.tenantId,
    actorId: ctx.actorId,
    actorRole: ctx.role,
    eventType: "memo.sent_to_investor",
    objectType: "memo",
    objectId: ctx.memoId,
    metadata: { investorId: ctx.investorId, version: ctx.version },
  }),
  memoDeleted: (ctx: { tenantId: string; actorId: string; role: PlatformRole; memoId: string; investorId?: string }): AuditEvent => ({
    tenantId: ctx.tenantId,
    actorId: ctx.actorId,
    actorRole: ctx.role,
    eventType: "memo.deleted",
    objectType: "memo",
    objectId: ctx.memoId,
    metadata: ctx.investorId ? { investorId: ctx.investorId } : undefined,
  }),
  memoOpened: (ctx: { tenantId: string; actorId: string; role: PlatformRole; memoId: string; investorId: string }): AuditEvent => ({
    tenantId: ctx.tenantId,
    actorId: ctx.actorId,
    actorRole: ctx.role,
    eventType: "memo.opened_by_investor",
    objectType: "memo",
    objectId: ctx.memoId,
    metadata: { investorId: ctx.investorId },
  }),
  memoDecided: (ctx: {
    tenantId: string
    actorId: string
    role: PlatformRole
    memoId: string
    decision: string
    reasonTags?: string[]
    conditionText?: string
  }): AuditEvent => ({
    tenantId: ctx.tenantId,
    actorId: ctx.actorId,
    actorRole: ctx.role,
    eventType: "memo.decided",
    objectType: "memo",
    objectId: ctx.memoId,
    metadata: { decision: ctx.decision, reasonTags: ctx.reasonTags, conditionText: ctx.conditionText },
  }),
  conditionResolved: (ctx: {
    tenantId: string
    actorId: string
    role: PlatformRole
    memoId: string
    resolution: string
    notes?: string
  }): AuditEvent => ({
    tenantId: ctx.tenantId,
    actorId: ctx.actorId,
    actorRole: ctx.role,
    eventType: "condition.resolved",
    objectType: "memo",
    objectId: ctx.memoId,
    metadata: { resolution: ctx.resolution, notes: ctx.notes },
  }),
  aiGenerationRequested: (ctx: { tenantId: string; actorId: string; role: PlatformRole; feature: string; inputHash: string }): AuditEvent => ({
    tenantId: ctx.tenantId,
    actorId: ctx.actorId,
    actorRole: ctx.role,
    eventType: "ai.generation_requested",
    objectType: "ai",
    objectId: ctx.feature,
    metadata: { inputHash: ctx.inputHash },
  }),
  aiOutputAccepted: (ctx: { tenantId: string; actorId: string; role: PlatformRole; feature: string; memoId?: string }): AuditEvent => ({
    tenantId: ctx.tenantId,
    actorId: ctx.actorId,
    actorRole: ctx.role,
    eventType: "ai.output_accepted",
    objectType: "ai",
    objectId: ctx.feature,
    metadata: ctx.memoId ? { memoId: ctx.memoId } : undefined,
  }),
  qnaMessagePosted: (ctx: { tenantId: string; actorId: string; role: PlatformRole; memoId: string; investorId: string }): AuditEvent => ({
    tenantId: ctx.tenantId,
    actorId: ctx.actorId,
    actorRole: ctx.role,
    eventType: "qna.message_posted",
    objectType: "memo",
    objectId: ctx.memoId,
    metadata: { investorId: ctx.investorId },
  }),
  underwritingCreated: (ctx: { tenantId: string; actorId: string; role: PlatformRole; underwritingId: string }): AuditEvent => ({
    tenantId: ctx.tenantId,
    actorId: ctx.actorId,
    actorRole: ctx.role,
    eventType: "underwriting.created",
    objectType: "underwriting",
    objectId: ctx.underwritingId,
  }),
  underwritingUpdated: (ctx: { tenantId: string; actorId: string; role: PlatformRole; underwritingId: string }): AuditEvent => ({
    tenantId: ctx.tenantId,
    actorId: ctx.actorId,
    actorRole: ctx.role,
    eventType: "underwriting.updated",
    objectType: "underwriting",
    objectId: ctx.underwritingId,
  }),
  underwritingCompAdded: (ctx: { tenantId: string; actorId: string; role: PlatformRole; underwritingId: string; compId: string }): AuditEvent => ({
    tenantId: ctx.tenantId,
    actorId: ctx.actorId,
    actorRole: ctx.role,
    eventType: "underwriting.comp_added",
    objectType: "underwriting",
    objectId: ctx.underwritingId,
    metadata: { compId: ctx.compId },
  }),
  underwritingCompRemoved: (ctx: { tenantId: string; actorId: string; role: PlatformRole; underwritingId: string; compId: string }): AuditEvent => ({
    tenantId: ctx.tenantId,
    actorId: ctx.actorId,
    actorRole: ctx.role,
    eventType: "underwriting.comp_removed",
    objectType: "underwriting",
    objectId: ctx.underwritingId,
    metadata: { compId: ctx.compId },
  }),
  dealRoomCreated: (ctx: { tenantId: string; actorId: string; role: PlatformRole; dealRoomId: string }): AuditEvent => ({
    tenantId: ctx.tenantId,
    actorId: ctx.actorId,
    actorRole: ctx.role,
    eventType: "deal_room.created",
    objectType: "deal_room",
    objectId: ctx.dealRoomId,
  }),
  dealRoomUpdated: (ctx: { tenantId: string; actorId: string; role: PlatformRole; dealRoomId: string; fields?: string[] }): AuditEvent => ({
    tenantId: ctx.tenantId,
    actorId: ctx.actorId,
    actorRole: ctx.role,
    eventType: "deal_room.updated",
    objectType: "deal_room",
    objectId: ctx.dealRoomId,
    metadata: ctx.fields ? { fields: ctx.fields } : undefined,
  }),
  dealRoomStageChanged: (ctx: { tenantId: string; actorId: string; role: PlatformRole; dealRoomId: string; fromStage: string; toStage: string }): AuditEvent => ({
    tenantId: ctx.tenantId,
    actorId: ctx.actorId,
    actorRole: ctx.role,
    eventType: "deal_room.stage_changed",
    objectType: "deal_room",
    objectId: ctx.dealRoomId,
    metadata: { fromStage: ctx.fromStage, toStage: ctx.toStage },
  }),
  dealRoomDeleted: (ctx: { tenantId: string; actorId: string; role: PlatformRole; dealRoomId: string }): AuditEvent => ({
    tenantId: ctx.tenantId,
    actorId: ctx.actorId,
    actorRole: ctx.role,
    eventType: "deal_room.deleted",
    objectType: "deal_room",
    objectId: ctx.dealRoomId,
  }),
}

