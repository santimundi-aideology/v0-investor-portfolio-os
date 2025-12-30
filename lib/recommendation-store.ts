/**
 * Mock Recommendation Store (internal CRM)
 *
 * In-memory repository for Realtor Recommendations.
 * Mirrors the style of `lib/property-store.ts` (CRUD + simple domain actions).
 */

import type {
  Counterfactual,
  Recommendation,
  RecommendationDecision,
  RecommendationStatus,
} from "@/lib/types"
import { getInvestorById, getPropertyById } from "@/lib/mock-data"

let recommendations: Recommendation[] = []
let seq = 1

function nowIso() {
  return new Date().toISOString()
}

function newId() {
  seq += 1
  return `rec-${seq}`
}

function pushActivity(rec: Recommendation, type: string, label: string, meta?: any) {
  const at = nowIso()
  rec.activity.push({ at, type, label, meta })
  rec.lastActivityAt = at
  rec.updatedAt = at
}

export function initRecommendationStore(seed: Recommendation[]) {
  recommendations = [...seed]
}

export function listRecommendationsByInvestor(investorId: string) {
  return recommendations
    .filter((r) => r.investorId === investorId)
    .slice()
    .sort((a, b) => (b.lastActivityAt ?? b.updatedAt).localeCompare(a.lastActivityAt ?? a.updatedAt))
}

export function getRecommendationById(id: string) {
  return recommendations.find((r) => r.id === id) ?? null
}

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

  recommendations.push(rec)
  return rec
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

// ---- Seed data (demo) ----
function seeded(): Recommendation[] {
  // Use stable-ish dates to avoid empty timelines; relative time is computed on client in UI.
  const base1 = "2025-12-10T10:00:00.000Z"
  const base2 = "2025-12-18T14:30:00.000Z"

  const investorId = "inv-1"
  const inv = getInvestorById(investorId)
  const investorLabel = inv?.name ?? investorId

  const mk = (partial: Partial<Recommendation> & Pick<Recommendation, "id" | "status" | "trigger">): Recommendation => ({
    id: partial.id,
    investorId,
    createdByRole: "realtor",
    title: partial.title ?? `Recommendations for ${investorLabel}`,
    summary: partial.summary ?? "",
    status: partial.status,
    trigger: partial.trigger,
    createdAt: partial.createdAt ?? base1,
    updatedAt: partial.updatedAt ?? base1,
    sentAt: partial.sentAt,
    lastActivityAt: partial.lastActivityAt,
    propertyIds: partial.propertyIds ?? [],
    counterfactuals: partial.counterfactuals ?? [],
    propertyNotes: partial.propertyNotes ?? {},
    qna: partial.qna ?? [],
    decision: partial.decision,
    activity: partial.activity ?? [{ at: partial.createdAt ?? base1, type: "created", label: "Created recommendation" }],
    supersededById: partial.supersededById,
  })

  const cfPool: Counterfactual[] = [
    {
      propertyId: "prop-4",
      title: "Business Bay Mixed-Use Tower",
      reasonCodes: ["over_budget", "complexity"],
      reasonLabels: ["Over budget threshold", "Management complexity"],
      details: "Great upside but exceeds ticket size and adds operational complexity for this mandate.",
      whatWouldChangeMyMind: ["If priced below AED 40M", "If we can secure a strong operator/PM agreement"],
      score: 78,
    },
    {
      propertyId: "prop-5",
      title: "Dubai South Land Plot",
      reasonCodes: ["yield_below_target"],
      reasonLabels: ["Yield not stabilized (land play)"],
      details: "Land is strategic but doesn't meet near-term income needs for this investor.",
      whatWouldChangeMyMind: ["If investor shifts to opportunistic land thesis", "If we structure phased payments"],
      score: 74,
    },
    {
      propertyId: "prop-10",
      title: "Al Quoz Logistics Warehouse",
      reasonCodes: ["tenant_risk"],
      reasonLabels: ["Single-tenant exposure"],
      details: "Strong yield, but renewal risk is high without a diversified tenant stack.",
      whatWouldChangeMyMind: ["If we lock in a 5-year lease renewal", "If we add a second tenant unit split"],
      score: 81,
    },
    {
      propertyId: "prop-12",
      title: "Dubai Creek Harbour Retail Podium",
      reasonCodes: ["seasonality"],
      reasonLabels: ["Seasonality risk"],
      details: "Footfall is strong, but NOI fluctuates seasonally.",
      whatWouldChangeMyMind: ["If we secure anchor F&B leases", "If rent guarantees are included"],
      score: 79,
    },
    {
      propertyId: "prop-14",
      title: "Expo City Innovation Campus",
      reasonCodes: ["lease_up"],
      reasonLabels: ["Lease-up period required"],
      details: "Value-add opportunity but requires lease-up execution.",
      whatWouldChangeMyMind: ["If pre-leased to 60%+", "If investor accepts 12–18 month ramp"],
      score: 76,
    },
  ]

  const sentViewed = mk({
    id: "rec-1001",
    status: "VIEWED",
    trigger: "ai_insight",
    title: "3 opportunities aligned with Core Plus thesis",
    summary:
      "Based on the mandate (Core Plus, 8–12% target yield) and current exposure, these opportunities prioritize Grade A assets with downside protection and clear tenant demand.",
    propertyIds: ["prop-1", "prop-2", "prop-9"],
    counterfactuals: cfPool,
    createdAt: base1,
    updatedAt: base1,
    sentAt: "2025-12-11T09:00:00.000Z",
    lastActivityAt: "2025-12-12T16:30:00.000Z",
    activity: [
      { at: base1, type: "created", label: "Created recommendation" },
      { at: "2025-12-11T09:00:00.000Z", type: "sent", label: "Sent to investor" },
      { at: "2025-12-12T16:30:00.000Z", type: "viewed", label: "Investor viewed recommendation" },
    ],
  })

  const questions = mk({
    id: "rec-1002",
    status: "QUESTIONS",
    trigger: "nlp_query",
    title: "Follow-up set: focus on Dubai Marina + Downtown",
    summary:
      "Investor asked for a tighter focus on prime locations with predictable NOI. This set narrows to assets with stronger comps and clearer rent roll visibility.",
    propertyIds: ["prop-8", "prop-6", "prop-13"],
    counterfactuals: cfPool,
    createdAt: base2,
    updatedAt: base2,
    sentAt: "2025-12-19T10:00:00.000Z",
    lastActivityAt: "2025-12-20T12:15:00.000Z",
    qna: [
      {
        id: "qna-1",
        question: "Can you break down the ROI assumptions and vacancy buffer on the Downtown penthouse?",
        askedAt: "2025-12-20T12:15:00.000Z",
        askedBy: "investor",
      },
    ],
    activity: [
      { at: base2, type: "created", label: "Created recommendation" },
      { at: "2025-12-19T10:00:00.000Z", type: "sent", label: "Sent to investor" },
      { at: "2025-12-20T12:15:00.000Z", type: "question", label: "Investor asked a question", meta: { qnaId: "qna-1" } },
    ],
  })

  // Ensure referenced properties exist (avoid broken demo)
  ;[sentViewed, questions].forEach((r) => {
    r.propertyIds = r.propertyIds.filter((pid) => !!getPropertyById(pid))
    r.counterfactuals = r.counterfactuals.filter((c) => !!getPropertyById(c.propertyId))
  })

  return [sentViewed, questions]
}

// Auto-init with demo data
if (recommendations.length === 0) {
  recommendations = seeded()
  seq = 2000
}


