"use client"

import * as React from "react"
import type {
  OffPlanProject,
  OffPlanUnit,
  OffPlanPaymentPlan,
  OffPlanEvaluationResult,
  OffPlanExtractionResult,
} from "@/lib/types"
import type {
  CashFlowTable,
  OperatingExpenses,
  ScenarioRow,
  ComparableTransaction,
} from "@/lib/pdf/intake-report"

export interface EnhancedPdfData {
  cashFlowTable: CashFlowTable
  operatingExpenses: OperatingExpenses
  scenarios: ScenarioRow[]
  comparables: ComparableTransaction[]
}

// ---------------------------------------------------------------------------
// Types (previously local to page.tsx)
// ---------------------------------------------------------------------------

export interface ExtractedProperty {
  source: string
  listingId: string | null
  title: string
  price: number
  pricePerSqft: number | null
  size: number | null
  bedrooms: number
  bathrooms: number
  propertyType: string
  area: string
  subArea: string | null
  address: string | null
  furnished: boolean
  parking: number | null
  amenities: string[]
  description: string | null
  images: string[]
  agentName: string | null
  agencyName: string | null
  listingUrl: string
  listedDate: string | null
  coordinates: { lat: number; lng: number } | null
  // Extended fields from Bayut API
  completionStatus?: "ready" | "off_plan" | "under_construction" | "unknown"
  developer?: string | null
  handoverDate?: string | null
  serviceCharge?: number | null
  rentalPotential?: number | null
  referenceNumber?: string | null
  permitNumber?: string | null
  purpose?: "for-sale" | "for-rent" | null
  buildingName?: string | null
  buildingFloors?: number | null
  totalParkingSpaces?: number | null
  elevators?: number | null
  floorPlanImages?: string[]
  paymentPlan?: {
    downPaymentPercent?: number | null
    preHandoverPercent?: number | null
    handoverPercent?: number | null
    postHandoverPercent?: number | null
  } | null
  verified?: boolean
  verifiedDate?: string | null
  plotSize?: number | null
  coverImageUrl?: string | null
}

export interface EvaluationAnalysis {
  summary: string
  keyPoints: string[]
  neighborhood: {
    name: string
    grade: string
    profile: string
    highlights: string[]
    metrics: { label: string; value: string; trend?: string }[]
  }
  property: {
    description: string
    condition: string
    specs: { label: string; value: string }[]
    highlights: string[]
  }
  market: {
    overview: string
    drivers: string[]
    supply: string
    demand: string
    absorption: string
  }
  growth?: {
    narrative: string
    neighborhoodTrend: string
    annualGrowthBase: number
    annualGrowthConservative: number
    annualGrowthUpside: number
    projectedValue1Y: number
    projectedValue3Y: number
    projectedValue5Y: number
    drivers: string[]
    sensitivities: string[]
  }
  pricing: {
    askingPrice: number
    pricePerSqft: number | null
    marketAvgPricePerSqft: number | null
    recommendedOffer: number
    stabilizedValue: number
    valueAddBudget: number
    rentCurrent: number
    rentPotential: number
    irr: number
    equityMultiple: number
  }
  comparables: {
    name: string
    distance: string
    size: string
    closingDate: string
    price: number
    pricePerSqft: number
    note?: string
  }[]
  strategy: {
    plan: string
    holdPeriod: string
    exit: string
    focusPoints: string[]
  }
  investmentThesis: string
  financialAnalysis: {
    noi: number
    capRate: number
    targetIrr: number
    holdPeriod: string
    returnBridge?: {
      purchasePrice: number
      dldRatePct: number
      dldFee: number
      brokerFeePct: number
      brokerFee: number
      renovation: number
      totalProjectCost: number
      mortgageLtvPct: number
      mortgageAmount: number
      equityInvested: number
      annualInterestRatePct: number
      annualInterest: number
      resalePrice: number
      netSaleProceedsAfterMortgage: number
      netProfitAfterInterest: number
      roiOnEquityPct: number
      assumptions: string
    }
  }
  risks: { risk: string; mitigation: string }[]
  finalRecommendation: {
    decision: "PROCEED" | "CONDITIONAL" | "PASS"
    condition?: string
  }
}

export interface EvaluationResult {
  overallScore: number
  factors: {
    mandateFit: number
    marketTiming: number
    portfolioFit: number
    riskAlignment: number
  }
  headline: string
  reasoning: string
  keyStrengths: string[]
  considerations: string[]
  recommendation: "strong_buy" | "buy" | "hold" | "pass"
  analysis: EvaluationAnalysis
}

export interface MarketContext {
  areaMedianPrice: number
  areaMedianPricePerSqft: number
  areaAverageYield: number
  priceVsMarket: number
  marketTrend: "rising" | "stable" | "declining"
}

export type Step = "input" | "extracting" | "extracted" | "evaluating" | "evaluated" | "saving" | "saved"
export type OffPlanStep = "upload" | "extracted" | "selecting" | "evaluating" | "evaluated" | "saving" | "saved"

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

export interface IntakeState {
  // Portal URL flow
  activeTab: "portal" | "offplan"
  step: Step
  url: string
  error: string | null
  property: ExtractedProperty | null
  evaluation: EvaluationResult | null
  marketContext: MarketContext | null
  enhancedPdfData: EnhancedPdfData | null
  notes: string
  savedMemoId: string | null
  scoreRevealComplete: boolean

  // Off-Plan flow
  offplanStep: OffPlanStep
  offplanError: string | null
  offplanProject: OffPlanProject | null
  offplanUnits: OffPlanUnit[]
  offplanPaymentPlan: OffPlanPaymentPlan | null
  offplanStats: OffPlanExtractionResult["stats"] | null
  selectedOffplanUnits: OffPlanUnit[]
  offplanEvaluation: OffPlanEvaluationResult | null
  offplanSavedMemoId: string | null
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const INITIAL_STATE: IntakeState = {
  activeTab: "portal",
  step: "input",
  url: "",
  error: null,
  property: null,
  evaluation: null,
  marketContext: null,
  enhancedPdfData: null,
  notes: "",
  savedMemoId: null,
  scoreRevealComplete: false,

  offplanStep: "upload",
  offplanError: null,
  offplanProject: null,
  offplanUnits: [],
  offplanPaymentPlan: null,
  offplanStats: null,
  selectedOffplanUnits: [],
  offplanEvaluation: null,
  offplanSavedMemoId: null,
}

// ---------------------------------------------------------------------------
// Module-level singleton (survives component unmount)
// ---------------------------------------------------------------------------

type Listener = () => void

let state: IntakeState = { ...INITIAL_STATE }
let hydrated = false
const listeners = new Set<Listener>()

const STORAGE_KEY = "property-intake:v1"

// Fields that are transient and should NOT be persisted
const TRANSIENT_KEYS: (keyof IntakeState)[] = ["error", "offplanError"]

function emit() {
  for (const l of listeners) l()
}

function persist() {
  if (typeof window === "undefined") return
  try {
    // Strip transient fields before saving
    const toSave: Record<string, unknown> = { ...state }
    for (const key of TRANSIENT_KEYS) {
      delete toSave[key]
    }
    // If a fetch is in-flight (step contains "ing"), persist it so we can
    // show the spinner when the user navigates back. The fetch callback will
    // update the state when it completes.
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  } catch {
    // quota exceeded or private browsing — ignore
  }
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return
  hydrated = true
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === "object") {
      // Merge persisted state on top of defaults so new fields get defaults
      state = { ...INITIAL_STATE, ...parsed, error: null, offplanError: null }
    }
  } catch {
    // corrupt data — ignore, keep defaults
  }
}

function update(patch: Partial<IntakeState>) {
  state = { ...state, ...patch }
  persist()
  emit()
}

// ---------------------------------------------------------------------------
// Setters (simple field updates)
// ---------------------------------------------------------------------------

export function setActiveTab(tab: "portal" | "offplan") {
  update({ activeTab: tab })
}

export function setUrl(url: string) {
  update({ url })
}

export function setNotes(notes: string) {
  update({ notes })
}

export function setScoreRevealComplete(v: boolean) {
  update({ scoreRevealComplete: v })
}

export function setSelectedOffplanUnits(units: OffPlanUnit[]) {
  update({ selectedOffplanUnits: units })
}

export function setPortalError(err: string | null) {
  update({ error: err })
}

export function setOffplanError(err: string | null) {
  update({ offplanError: err })
}

// ---------------------------------------------------------------------------
// Portal flow actions
// ---------------------------------------------------------------------------

export async function extractProperty(url: string, pageContent?: string) {
  if (!url.trim()) {
    update({ error: "Please enter a property URL" })
    return
  }
  update({ error: null, step: "extracting" })

  try {
    const res = await fetch("/api/property-intake/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, pageContent }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Failed to extract property")
    update({ property: data.property, step: "extracted" })
  } catch (err) {
    update({
      error: err instanceof Error ? err.message : "Failed to extract property",
      step: "input",
    })
  }
}

export async function evaluateProperty() {
  const { property } = state
  if (!property) return
  update({ step: "evaluating", error: null, scoreRevealComplete: false })

  try {
    const res = await fetch("/api/property-intake/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ property }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Failed to evaluate property")
    update({
      evaluation: data.evaluation,
      marketContext: data.marketContext,
      enhancedPdfData: data.enhancedPdfData ?? null,
      step: "evaluated",
    })
  } catch (err) {
    update({
      error: err instanceof Error ? err.message : "Failed to evaluate property",
      step: "extracted",
    })
  }
}

export async function saveMemo() {
  const { property, evaluation, notes } = state
  if (!property || !evaluation) return
  update({ step: "saving", error: null })

  try {
    const res = await fetch("/api/property-intake/save-memo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ property, evaluation, notes }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Failed to save memo")
    update({ savedMemoId: data.memo.id, step: "saved" })
  } catch (err) {
    update({
      error: err instanceof Error ? err.message : "Failed to save memo",
      step: "evaluated",
    })
  }
}

export function resetPortal() {
  update({
    step: "input",
    url: "",
    error: null,
    property: null,
    evaluation: null,
    marketContext: null,
    enhancedPdfData: null,
    notes: "",
    savedMemoId: null,
    scoreRevealComplete: false,
  })
}

// ---------------------------------------------------------------------------
// Off-Plan flow actions
// ---------------------------------------------------------------------------

export function handlePdfExtracted(result: {
  project: unknown
  units: unknown[]
  paymentPlan: unknown
  stats: unknown
  confidence: string
  model: string
}) {
  update({
    offplanError: null,
    offplanProject: result.project as OffPlanProject,
    offplanUnits: result.units as OffPlanUnit[],
    offplanPaymentPlan: result.paymentPlan as OffPlanPaymentPlan,
    offplanStats: result.stats as OffPlanExtractionResult["stats"],
    offplanStep: "extracted",
  })
  console.log(`Data extracted using ${result.model} with ${result.confidence} confidence`)
}

export async function evaluateOffplan() {
  const { offplanProject, offplanPaymentPlan, selectedOffplanUnits, offplanUnits } = state
  if (!offplanProject || !offplanPaymentPlan || selectedOffplanUnits.length === 0) {
    update({ offplanError: "Please select a unit to evaluate" })
    return
  }

  update({ offplanError: null, offplanStep: "evaluating" })

  try {
    const res = await fetch("/api/property-intake/evaluate-offplan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project: offplanProject,
        selectedUnit: selectedOffplanUnits[0],
        paymentPlan: offplanPaymentPlan,
        allUnits: offplanUnits,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Failed to evaluate off-plan property")
    update({ offplanEvaluation: data, offplanStep: "evaluated" })
  } catch (err) {
    update({
      offplanError: err instanceof Error ? err.message : "Failed to evaluate off-plan property",
      offplanStep: "selecting",
    })
  }
}

export async function saveOffplanMemo(notes: string) {
  const { offplanProject, offplanPaymentPlan, offplanEvaluation, selectedOffplanUnits } = state
  if (!offplanProject || !offplanPaymentPlan || !offplanEvaluation || selectedOffplanUnits.length === 0) {
    return
  }

  update({ offplanStep: "saving", offplanError: null })

  try {
    const res = await fetch("/api/property-intake/save-offplan-memo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project: offplanProject,
        selectedUnit: selectedOffplanUnits[0],
        paymentPlan: offplanPaymentPlan,
        evaluation: offplanEvaluation,
        notes,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Failed to save off-plan memo")
    update({ offplanSavedMemoId: data.memo.id, offplanStep: "saved" })
  } catch (err) {
    update({
      offplanError: err instanceof Error ? err.message : "Failed to save off-plan memo",
      offplanStep: "evaluated",
    })
  }
}

export function resetOffplan() {
  update({
    offplanStep: "upload",
    offplanError: null,
    offplanProject: null,
    offplanUnits: [],
    offplanPaymentPlan: null,
    offplanStats: null,
    selectedOffplanUnits: [],
    offplanEvaluation: null,
    offplanSavedMemoId: null,
  })
}

// ---------------------------------------------------------------------------
// React hook — subscribe to the module-level state
// ---------------------------------------------------------------------------

export function useIntakeStore(): IntakeState {
  // Hydrate from sessionStorage on first client render
  hydrate()

  return React.useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => state,
    () => INITIAL_STATE, // SSR snapshot — safe defaults
  )
}

// ---------------------------------------------------------------------------
// Snapshot accessor (for use outside React, e.g. in clipboard handler)
// ---------------------------------------------------------------------------

export function getIntakeSnapshot(): IntakeState {
  hydrate()
  return state
}
