/**
 * Recommendation Store (internal CRM)
 *
 * Repository for Realtor Recommendations.
 * Uses Supabase for persistence with in-memory fallback.
 * 
 * Note: Recommendations are stored using a combination of:
 * - memos table (for persisted recommendations)
 * - shortlists table (for property selections)
 */

import type {
  Counterfactual,
  Recommendation,
  RecommendationDecision,
} from "@/lib/types"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { getInvestorById as getInvestorByIdDb } from "@/lib/db/investors"

// In-memory store as fallback
let localRecommendations: Recommendation[] = []
let seq = 1

function nowIso() {
  return new Date().toISOString()
}

function newId() {
  seq += 1
  return `rec-${seq}`
}

function pushActivity(rec: Recommendation, type: string, label: string, meta?: Record<string, unknown>) {
  const at = nowIso()
  rec.activity.push({ at, type, label, meta })
  rec.lastActivityAt = at
  rec.updatedAt = at
}

export function initRecommendationStore(seed: Recommendation[]) {
  localRecommendations = [...seed]
}

/**
 * List recommendations by investor - async version
 */
export async function listRecommendationsByInvestorAsync(investorId: string): Promise<Recommendation[]> {
  try {
    const supabase = getSupabaseAdminClient()
    
    // Get memos for investor that have recommendations
    const { data: memos, error } = await supabase
      .from("memos")
      .select(`
        id,
        investor_id,
        created_by,
        state,
        created_at,
        updated_at,
        memo_versions (
          id,
          version,
          title,
          summary,
          content,
          created_at
        )
      `)
      .eq("investor_id", investorId)
      .order("created_at", { ascending: false })
    
    if (error || !memos) {
      console.warn("[recommendation-store] Error fetching memos:", error?.message)
      return listRecommendationsByInvestor(investorId)
    }
    
    // Map memos to recommendations
    const recs: Recommendation[] = memos.map(memo => {
      const latestVersion = Array.isArray(memo.memo_versions) 
        ? memo.memo_versions.sort((a: { version: number }, b: { version: number }) => b.version - a.version)[0]
        : null
      
      return {
        id: memo.id,
        investorId: memo.investor_id,
        createdByRole: "realtor" as const,
        title: latestVersion?.title || "Recommendation",
        summary: latestVersion?.summary || "",
        status: mapMemoStateToRecStatus(memo.state),
        trigger: "ai_insight" as const,
        createdAt: memo.created_at,
        updatedAt: memo.updated_at,
        propertyIds: [], // Would need to parse from memo content
        counterfactuals: [],
        qna: [],
        activity: [{
          at: memo.created_at,
          type: "created",
          label: "Created recommendation"
        }],
        lastActivityAt: memo.updated_at,
        propertyNotes: {},
      }
    })
    
    return recs
  } catch (err) {
    console.warn("[recommendation-store] Error fetching recommendations:", err)
    return listRecommendationsByInvestor(investorId)
  }
}

function mapMemoStateToRecStatus(state: string): Recommendation["status"] {
  switch (state) {
    case "draft": return "DRAFT"
    case "pending_review": return "DRAFT"
    case "ready": return "DRAFT"
    case "sent": return "SENT"
    case "opened": return "VIEWED"
    case "decided": return "APPROVED"
    default: return "DRAFT"
  }
}

/**
 * List recommendations by investor - sync version
 */
export function listRecommendationsByInvestor(investorId: string) {
  return localRecommendations
    .filter((r) => r.investorId === investorId)
    .slice()
    .sort((a, b) => (b.lastActivityAt ?? b.updatedAt).localeCompare(a.lastActivityAt ?? a.updatedAt))
}

/**
 * Get recommendation by ID - async version
 */
export async function getRecommendationByIdAsync(id: string): Promise<Recommendation | null> {
  try {
    const supabase = getSupabaseAdminClient()
    
    const { data: memo, error } = await supabase
      .from("memos")
      .select(`
        id,
        investor_id,
        created_by,
        state,
        created_at,
        updated_at,
        memo_versions (
          id,
          version,
          title,
          summary,
          content,
          created_at
        )
      `)
      .eq("id", id)
      .maybeSingle()
    
    if (error || !memo) {
      return getRecommendationById(id)
    }
    
    const latestVersion = Array.isArray(memo.memo_versions)
      ? memo.memo_versions.sort((a: { version: number }, b: { version: number }) => b.version - a.version)[0]
      : null
    
    return {
      id: memo.id,
      investorId: memo.investor_id,
      createdByRole: "realtor" as const,
      title: latestVersion?.title || "Recommendation",
      summary: latestVersion?.summary || "",
      status: mapMemoStateToRecStatus(memo.state),
      trigger: "ai_insight" as const,
      createdAt: memo.created_at,
      updatedAt: memo.updated_at,
      propertyIds: [],
      counterfactuals: [],
      qna: [],
      activity: [{
        at: memo.created_at,
        type: "created",
        label: "Created recommendation"
      }],
      lastActivityAt: memo.updated_at,
      propertyNotes: {},
    }
  } catch (err) {
    console.warn("[recommendation-store] Error fetching recommendation:", err)
    return getRecommendationById(id)
  }
}

export function getRecommendationById(id: string) {
  return localRecommendations.find((r) => r.id === id) ?? null
}

/**
 * Create recommendation - async version with DB persistence
 */
export async function createRecommendationAsync(input: {
  investorId: string
  createdByRole: Recommendation["createdByRole"]
  trigger: Recommendation["trigger"]
  title?: string
  summary?: string
  propertyIds?: string[]
  counterfactuals?: Counterfactual[]
  tenantId?: string
  createdBy?: string
}): Promise<Recommendation> {
  const at = nowIso()
  
  try {
    const supabase = getSupabaseAdminClient()
    
    // Create memo in database
    const { data: memo, error } = await supabase
      .from("memos")
      .insert({
        investor_id: input.investorId,
        created_by: input.createdBy || null,
        state: "draft",
        created_at: at,
        updated_at: at,
      })
      .select("id")
      .maybeSingle()
    
    if (error || !memo) {
      console.warn("[recommendation-store] Error creating memo:", error?.message)
      return createRecommendation(input)
    }
    
    // Create initial memo version
    await supabase
      .from("memo_versions")
      .insert({
        memo_id: memo.id,
        version: 1,
        title: input.title ?? "New recommendation",
        summary: input.summary ?? "",
        content: JSON.stringify({
          propertyIds: input.propertyIds ?? [],
          counterfactuals: input.counterfactuals ?? [],
          trigger: input.trigger,
        }),
        created_at: at,
      })
    
    return {
      id: memo.id,
      investorId: input.investorId,
      createdByRole: input.createdByRole,
      title: input.title ?? "New recommendation",
      summary: input.summary ?? "",
      status: "DRAFT",
      trigger: input.trigger,
      createdAt: at,
      updatedAt: at,
      propertyIds: input.propertyIds ?? [],
      counterfactuals: input.counterfactuals ?? [],
      qna: [],
      activity: [{ at, type: "created", label: "Created recommendation" }],
      lastActivityAt: at,
      propertyNotes: {},
    }
  } catch (err) {
    console.warn("[recommendation-store] Error creating recommendation:", err)
    return createRecommendation(input)
  }
}

/**
 * Create recommendation - sync version (local only)
 */
export function createRecommendation(input: {
  investorId: string
  createdByRole: Recommendation["createdByRole"]
  trigger: Recommendation["trigger"]
  title?: string
  summary?: string
  propertyIds?: string[]
  counterfactuals?: Counterfactual[]
}) {
  const at = nowIso()
  const rec: Recommendation = {
    id: newId(),
    investorId: input.investorId,
    createdByRole: input.createdByRole,
    title: input.title ?? "New recommendation",
    summary: input.summary ?? "",
    status: "DRAFT",
    trigger: input.trigger,
    createdAt: at,
    updatedAt: at,
    propertyIds: input.propertyIds ?? [],
    counterfactuals: input.counterfactuals ?? [],
    qna: [],
    activity: [{ at, type: "created", label: "Created recommendation" }],
    lastActivityAt: at,
    propertyNotes: {},
  }

  localRecommendations.push(rec)
  return rec
}

/**
 * Update recommendation - async version
 */
export async function updateRecommendationAsync(
  id: string,
  patch: Partial<Pick<Recommendation, "title" | "summary" | "status" | "trigger" | "propertyNotes">>,
): Promise<Recommendation | null> {
  try {
    const supabase = getSupabaseAdminClient()
    const at = nowIso()
    
    // Update memo state if status changed
    if (patch.status) {
      const stateMap: Record<string, string> = {
        "DRAFT": "draft",
        "SENT": "sent",
        "VIEWED": "opened",
        "QUESTIONS": "pending_review",
        "APPROVED": "decided",
        "REJECTED": "decided",
        "SUPERSEDED": "decided",
      }
      
      await supabase
        .from("memos")
        .update({ 
          state: stateMap[patch.status] || "draft",
          updated_at: at
        })
        .eq("id", id)
    }
    
    // If title/summary changed, create new version
    if (patch.title || patch.summary) {
      // Get latest version number
      const { data: versions } = await supabase
        .from("memo_versions")
        .select("version")
        .eq("memo_id", id)
        .order("version", { ascending: false })
        .limit(1)
      
      const nextVersion = (versions?.[0]?.version || 0) + 1
      
      await supabase
        .from("memo_versions")
        .insert({
          memo_id: id,
          version: nextVersion,
          title: patch.title,
          summary: patch.summary,
          created_at: at,
        })
    }
    
    return await getRecommendationByIdAsync(id)
  } catch (err) {
    console.warn("[recommendation-store] Error updating recommendation:", err)
    return updateRecommendation(id, patch)
  }
}

export function updateRecommendation(
  id: string,
  patch: Partial<Pick<Recommendation, "title" | "summary" | "status" | "trigger" | "propertyNotes">>,
) {
  const rec = getRecommendationById(id)
  if (!rec) return null
  Object.assign(rec, patch)
  rec.updatedAt = nowIso()
  rec.lastActivityAt = rec.updatedAt
  return rec
}

export function addProperty(id: string, propertyId: string) {
  const rec = getRecommendationById(id)
  if (!rec) return null
  if (!rec.propertyIds.includes(propertyId)) rec.propertyIds.push(propertyId)
  pushActivity(rec, "property_added", "Added property to recommendation", { propertyId })
  return rec
}

export function removeProperty(id: string, propertyId: string) {
  const rec = getRecommendationById(id)
  if (!rec) return null
  rec.propertyIds = rec.propertyIds.filter((p) => p !== propertyId)
  pushActivity(rec, "property_removed", "Removed property from recommendation", { propertyId })
  return rec
}

export function sendRecommendation(id: string) {
  const rec = getRecommendationById(id)
  if (!rec) return null
  const at = nowIso()
  rec.status = "SENT"
  rec.sentAt = at
  pushActivity(rec, "sent", "Sent to investor")
  return rec
}

export function markViewed(id: string) {
  const rec = getRecommendationById(id)
  if (!rec) return null
  rec.status = rec.status === "SENT" ? "VIEWED" : rec.status
  pushActivity(rec, "viewed", "Investor viewed recommendation")
  return rec
}

export function addInvestorQuestion(id: string, question: string) {
  const rec = getRecommendationById(id)
  if (!rec) return null
  const at = nowIso()
  const qnaId = `qna-${Math.random().toString(16).slice(2)}`
  rec.qna.push({ id: qnaId, question, askedAt: at, askedBy: "investor" })
  rec.status = "QUESTIONS"
  pushActivity(rec, "question", "Investor asked a question", { qnaId })
  return rec
}

export function saveDraftAnswer(id: string, qnaId: string, draftAnswer: string) {
  const rec = getRecommendationById(id)
  if (!rec) return null
  const q = rec.qna.find((x) => x.id === qnaId)
  if (!q) return null
  q.draftAnswer = draftAnswer
  pushActivity(rec, "draft_answer", "Saved draft answer", { qnaId })
  return rec
}

export function sendAnswer(id: string, qnaId: string, finalAnswer: string) {
  const rec = getRecommendationById(id)
  if (!rec) return null
  const at = nowIso()
  const q = rec.qna.find((x) => x.id === qnaId)
  if (!q) return null
  q.finalAnswer = finalAnswer
  q.answeredAt = at
  q.answeredBy = "realtor"
  pushActivity(rec, "answer_sent", "Sent answer to investor", { qnaId })
  return rec
}

export function setDecision(id: string, decision: RecommendationDecision) {
  const rec = getRecommendationById(id)
  if (!rec) return null
  rec.decision = decision
  rec.status = decision.outcome
  pushActivity(
    rec,
    "decision",
    decision.outcome === "APPROVED" ? "Investor approved recommendation" : "Investor rejected recommendation",
    { reasonTags: decision.reasonTags, note: decision.note },
  )
  return rec
}

export function supersede(id: string, newRecommendationId: string) {
  const rec = getRecommendationById(id)
  const next = getRecommendationById(newRecommendationId)
  if (!rec || !next) return null
  rec.status = "SUPERSEDED"
  rec.supersededById = newRecommendationId
  pushActivity(rec, "superseded", "Superseded by newer recommendation", { newRecommendationId })
  return rec
}

export function addCounterfactualToRecommendation(id: string, propertyId: string) {
  const rec = getRecommendationById(id)
  if (!rec) return null

  const cf = rec.counterfactuals.find((c) => c.propertyId === propertyId)
  if (!cf) return null

  // Add to recommended list
  if (!rec.propertyIds.includes(propertyId)) rec.propertyIds.push(propertyId)

  // Remove from counterfactuals (no longer "not recommended")
  rec.counterfactuals = rec.counterfactuals.filter((c) => c.propertyId !== propertyId)

  // Add note scaffold
  rec.propertyNotes = rec.propertyNotes ?? {}
  rec.propertyNotes[propertyId] = {
    includedDespite: cf.reasonLabels?.[0] ?? "Excluded by policy",
    rationale: "",
  }

  pushActivity(rec, "added_anyway", "Added counterfactual property anyway", {
    propertyId,
    topReason: cf.reasonLabels?.[0],
  })

  return rec
}

// Store starts empty — no auto-seeding with mock data
