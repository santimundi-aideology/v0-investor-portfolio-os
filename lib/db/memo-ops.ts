/**
 * Memo, Decision, and Message CRUD operations backed by Supabase.
 * Replaces the in-memory store that was in lib/data/store.ts.
 */
import { getSupabaseAdminClient } from "@/lib/db/client"
import type {
  MemoRecord,
  MemoVersion,
  MemoState,
  DecisionRecord,
  MessageRecord,
} from "@/lib/data/types"

// ── Memo Operations ──────────────────────────────────────────────

export async function getMemo(id: string): Promise<MemoRecord | undefined> {
  const supabase = getSupabaseAdminClient()
  const { data: row, error } = await supabase
    .from("memos")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error) throw error
  if (!row) return undefined

  const { data: versionRows } = await supabase
    .from("memo_versions")
    .select("*")
    .eq("memo_id", id)
    .order("version", { ascending: true })

  return mapMemoRow(row, versionRows ?? [])
}

export async function createMemo(input: {
  investorId?: string | null
  listingId?: string
  underwritingId?: string
  content: unknown
  createdBy: string
  tenantId?: string
}): Promise<MemoRecord> {
  const supabase = getSupabaseAdminClient()
  const now = new Date().toISOString()

  // Resolve tenantId: prefer explicit, then from investor, then from the creating user
  let tenantId = input.tenantId
  if (!tenantId && input.investorId) {
    const { data: inv } = await supabase
      .from("investors")
      .select("tenant_id")
      .eq("id", input.investorId)
      .maybeSingle()
    tenantId = inv?.tenant_id ?? undefined
  }
  if (!tenantId) {
    // Resolve from the creating user's tenant
    const { data: usr } = await supabase
      .from("users")
      .select("tenant_id")
      .eq("id", input.createdBy)
      .maybeSingle()
    tenantId = usr?.tenant_id ?? undefined
  }

  if (!tenantId) {
    throw new Error("Cannot create memo: unable to resolve tenant")
  }

  const { data: memoRow, error: memoErr } = await supabase
    .from("memos")
    .insert({
      tenant_id: tenantId,
      investor_id: input.investorId ?? null,
      listing_id: input.listingId ?? null,
      underwriting_id: input.underwritingId ?? null,
      state: "draft",
      current_version: 1,
      created_by: input.createdBy,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single()
  if (memoErr) throw memoErr

  const { error: verErr } = await supabase.from("memo_versions").insert({
    memo_id: memoRow.id,
    version: 1,
    content: input.content as Record<string, unknown>,
    created_by: input.createdBy,
    created_at: now,
  })
  if (verErr) throw verErr

  // Auto-link memo to matching investor_opportunity if one exists
  if (input.investorId && input.listingId) {
    try {
      const { data: opp } = await supabase
        .from("investor_opportunities")
        .select("id")
        .eq("investor_id", input.investorId)
        .eq("listing_id", input.listingId)
        .is("memo_id", null)
        .maybeSingle()

      if (opp) {
        await supabase
          .from("investor_opportunities")
          .update({ memo_id: memoRow.id, status: "memo_review", updated_at: now })
          .eq("id", opp.id)
      }
    } catch (linkErr) {
      // Non-fatal: memo was created successfully, just log the linking failure
      console.warn("[memo-ops] Failed to auto-link memo to opportunity:", linkErr)
    }
  }

  const versions: MemoVersion[] = [
    { version: 1, content: input.content, createdAt: now, createdBy: input.createdBy },
  ]
  return mapMemoRow(memoRow, versions.map(v => ({
    version: v.version,
    content: v.content as Record<string, unknown>,
    created_by: v.createdBy,
    created_at: v.createdAt,
    memo_id: memoRow.id,
  })))
}

export async function deleteMemo(id: string): Promise<void> {
  const supabase = getSupabaseAdminClient()

  // Break optional links first for tables that reference memos without
  // ON DELETE behavior. investor_opportunities.memo_id is nullable and should
  // be cleared when a memo is deleted.
  const { error: detachError } = await supabase
    .from("investor_opportunities")
    .update({ memo_id: null, updated_at: new Date().toISOString() })
    .eq("memo_id", id)
  // Some environments may not have this table yet; ignore that specific case.
  if (detachError && detachError.code !== "42P01") throw detachError

  const { error } = await supabase.from("memos").delete().eq("id", id)
  if (error) throw error
}

export async function saveMemo(updated: MemoRecord): Promise<void> {
  const supabase = getSupabaseAdminClient()
  const { error } = await supabase
    .from("memos")
    .update({
      state: updated.state,
      current_version: updated.currentVersion,
      updated_at: new Date().toISOString(),
    })
    .eq("id", updated.id)
  if (error) throw error

  // Upsert the latest version if it changed
  if (updated.versions.length > 0) {
    const latest = updated.versions[updated.versions.length - 1]
    await supabase.from("memo_versions").upsert(
      {
        memo_id: updated.id,
        version: latest.version,
        content: latest.content as Record<string, unknown>,
        created_by: latest.createdBy,
        created_at: latest.createdAt,
      },
      { onConflict: "memo_id,version" }
    )
  }
}

// ── Decision Operations ──────────────────────────────────────────

export async function addDecision(
  decision: Omit<DecisionRecord, "id" | "tenantId" | "createdAt" | "resolvedStatus"> & {
    resolvedStatus?: DecisionRecord["resolvedStatus"]
    tenantId?: string
  }
): Promise<DecisionRecord> {
  const supabase = getSupabaseAdminClient()
  const now = new Date().toISOString()

  // Resolve tenantId from memo if not provided
  let tenantId = decision.tenantId
  if (!tenantId) {
    const { data: memo } = await supabase
      .from("memos")
      .select("tenant_id")
      .eq("id", decision.memoId)
      .maybeSingle()
    tenantId = memo?.tenant_id ?? undefined
  }

  const { data, error } = await supabase
    .from("decisions")
    .insert({
      tenant_id: tenantId,
      memo_id: decision.memoId,
      investor_id: decision.investorId,
      decision_type: decision.decisionType,
      reason_tags: decision.reasonTags,
      condition_text: decision.conditionText ?? null,
      deadline: decision.deadline ?? null,
      resolved_status: decision.resolvedStatus ?? "pending",
      created_at: now,
    })
    .select("*")
    .single()
  if (error) throw error
  return mapDecisionRow(data)
}

export async function getDecisionByMemo(memoId: string): Promise<DecisionRecord | undefined> {
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from("decisions")
    .select("*")
    .eq("memo_id", memoId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data ? mapDecisionRow(data) : undefined
}

export async function resolveDecision(
  memoId: string,
  resolution: DecisionRecord["resolvedStatus"],
  resolvedBy: string,
  notes?: string
): Promise<DecisionRecord | undefined> {
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from("decisions")
    .update({
      resolved_status: resolution,
      resolved_by: resolvedBy,
      resolved_at: new Date().toISOString(),
      resolved_notes: notes ?? null,
    })
    .eq("memo_id", memoId)
    .select("*")
    .maybeSingle()
  if (error) throw error
  return data ? mapDecisionRow(data) : undefined
}

// ── Message Operations ───────────────────────────────────────────

export async function addMessage(
  input: Omit<MessageRecord, "id" | "tenantId" | "createdAt"> & { tenantId?: string }
): Promise<MessageRecord> {
  const supabase = getSupabaseAdminClient()
  const now = new Date().toISOString()

  let tenantId = input.tenantId
  if (!tenantId) {
    const { data: memo } = await supabase
      .from("memos")
      .select("tenant_id")
      .eq("id", input.memoId)
      .maybeSingle()
    tenantId = memo?.tenant_id ?? undefined
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      tenant_id: tenantId,
      memo_id: input.memoId,
      body: input.body,
      version_context: input.versionContext ?? null,
      sender_id: input.senderId ?? null,
      created_at: now,
    })
    .select("*")
    .single()
  if (error) throw error
  return mapMessageRow(data)
}

export async function getMessagesByMemo(memoId: string): Promise<MessageRecord[]> {
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("memo_id", memoId)
    .order("created_at", { ascending: true })
  if (error) throw error
  return (data ?? []).map(mapMessageRow)
}

// ── Row Mappers ──────────────────────────────────────────────────

function mapMemoRow(row: Record<string, unknown>, versionRows: Record<string, unknown>[]): MemoRecord {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    investorId: (row.investor_id as string) ?? null,
    listingId: (row.listing_id as string) ?? undefined,
    underwritingId: (row.underwriting_id as string) ?? undefined,
    state: row.state as MemoState,
    currentVersion: row.current_version as number,
    versions: versionRows.map((v) => ({
      version: v.version as number,
      content: v.content as unknown,
      createdAt: v.created_at as string,
      createdBy: (v.created_by as string) ?? "unknown",
    })),
    createdBy: (row.created_by as string) ?? "unknown",
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

function mapDecisionRow(row: Record<string, unknown>): DecisionRecord {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    memoId: row.memo_id as string,
    investorId: row.investor_id as string,
    decisionType: row.decision_type as DecisionRecord["decisionType"],
    reasonTags: (row.reason_tags as string[]) ?? [],
    conditionText: (row.condition_text as string) ?? undefined,
    deadline: (row.deadline as string) ?? undefined,
    resolvedStatus: row.resolved_status as DecisionRecord["resolvedStatus"],
    resolvedBy: (row.resolved_by as string) ?? undefined,
    resolvedAt: (row.resolved_at as string) ?? undefined,
    createdAt: row.created_at as string,
    resolvedNotes: (row.resolved_notes as string) ?? undefined,
  }
}

function mapMessageRow(row: Record<string, unknown>): MessageRecord {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    memoId: row.memo_id as string,
    body: row.body as string,
    versionContext: (row.version_context as number) ?? undefined,
    senderId: (row.sender_id as string) ?? undefined,
    createdAt: row.created_at as string,
  }
}
