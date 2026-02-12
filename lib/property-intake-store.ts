"use client"

import * as React from "react"
import type {
  OffPlanProject,
  OffPlanUnit,
  OffPlanPaymentPlan,
  OffPlanEvaluationResult,
  OffPlanExtractionResult,
  PaymentMilestone,
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
export type OffPlanStep = "input" | "upload" | "extracted" | "selecting" | "evaluating" | "evaluated" | "saving" | "saved"

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
  /** True when the portal extraction detected an off-plan property */
  offplanDetected: boolean

  // Off-Plan flow
  offplanStep: OffPlanStep
  offplanUrl: string
  offplanError: string | null
  offplanProject: OffPlanProject | null
  offplanUnits: OffPlanUnit[]
  offplanPaymentPlan: OffPlanPaymentPlan | null
  offplanStats: OffPlanExtractionResult["stats"] | null
  selectedOffplanUnits: OffPlanUnit[]
  offplanEvaluation: OffPlanEvaluationResult | null
  offplanSavedMemoId: string | null
  /** Rendered page images from uploaded PDF brochures (Supabase Storage URLs) */
  offplanBrochureImages: string[]
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
  offplanDetected: false,

  offplanStep: "input",
  offplanUrl: "",
  offplanError: null,
  offplanProject: null,
  offplanUnits: [],
  offplanPaymentPlan: null,
  offplanStats: null,
  selectedOffplanUnits: [],
  offplanEvaluation: null,
  offplanSavedMemoId: null,
  offplanBrochureImages: [],
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
      // If a step was stuck in a loading state (e.g. browser closed mid-fetch),
      // reset back to the input state so the user isn't permanently stuck.
      if (state.step === "extracting") state.step = "input"
      if (state.offplanStep === "upload") state.offplanStep = "input"
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

export function setOffplanUrl(url: string) {
  update({ offplanUrl: url })
}

/** Dismiss the off-plan detection banner without switching */
export function dismissOffplanDetected() {
  update({ offplanDetected: false })
}

/** Switch to the Off-Plan tab, carrying the current portal URL over */
export function switchToOffplanWithUrl() {
  const portalUrl = state.url
  // Reset portal state
  resetPortal()
  // Switch tab and pre-fill off-plan URL
  update({ activeTab: "offplan", offplanUrl: portalUrl })
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
    const isOffplan = data.property?.completionStatus === "off_plan" || data.property?.completionStatus === "under_construction"
    update({ property: data.property, step: "extracted", offplanDetected: isOffplan })
  } catch (err) {
    update({
      error: err instanceof Error ? err.message : "Failed to extract property",
      step: "input",
    })
  }
}

/**
 * Parse a built-property PDF brochure and load the extracted data.
 */
export async function parseBuiltPdf(file: File) {
  update({ error: null, step: "extracting" })

  try {
    const formData = new FormData()
    formData.append("file", file)

    const res = await fetch("/api/property-intake/parse-built-pdf", {
      method: "POST",
      body: formData,
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Failed to parse PDF")

    const isOffplan = data.property?.completionStatus === "off_plan" || data.property?.completionStatus === "under_construction"
    update({ property: data.property, step: "extracted", offplanDetected: isOffplan })
  } catch (err) {
    update({
      error: err instanceof Error ? err.message : "Failed to parse PDF",
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
    offplanDetected: false,
  })
}

// ---------------------------------------------------------------------------
// Off-Plan flow actions
// ---------------------------------------------------------------------------

/**
 * Bridge: Extract a property from a portal URL and convert it into the
 * off-plan data model (OffPlanProject + OffPlanUnit + OffPlanPaymentPlan).
 */
export async function extractPropertyForOffplan(url: string, pageContent?: string) {
  if (!url.trim()) {
    update({ offplanError: "Please enter a property URL" })
    return
  }
  update({ offplanError: null, offplanStep: "upload" }) // reuse "upload" step for loading state

  try {
    const res = await fetch("/api/property-intake/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, pageContent }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Failed to extract property")

    const extracted: ExtractedProperty = data.property

    // --- Bridge ExtractedProperty -> OffPlan data model ---
    const sizeSqft = extracted.size ?? 800
    const price = extracted.price ?? 0
    const pricePerSqft = extracted.pricePerSqft ?? (sizeSqft > 0 ? Math.round(price / sizeSqft) : 0)

    const project: OffPlanProject = {
      projectName: extracted.buildingName || extracted.title || "Off-Plan Project",
      developer: extracted.developer || "Unknown Developer",
      location: {
        area: extracted.area || "Dubai",
        subArea: extracted.subArea ?? undefined,
        landmark: undefined,
        coordinates: extracted.coordinates ?? undefined,
      },
      completionDate: extracted.handoverDate || "TBC",
      totalLevels: extracted.buildingFloors ?? 0,
      totalUnits: 0,
      propertyType: "residential",
      amenities: extracted.amenities || [],
      description: extracted.description || "",
    }

    const unit: OffPlanUnit = {
      unitNumber: extracted.referenceNumber || "Unit 1",
      level: 0,
      type: extracted.propertyType || "Apartment",
      sizeSqft,
      pricePerSqft,
      totalPrice: price,
      views: undefined,
      parking: extracted.parking ?? undefined,
      status: "available",
    }

    // Build a payment plan from extracted data or use sensible defaults
    const pp = extracted.paymentPlan
    const milestones: PaymentMilestone[] = []
    let constructionPercent = 0
    let postHandoverPercent = 0

    if (pp) {
      if (pp.downPaymentPercent) {
        milestones.push({ milestone: 1, description: "Down Payment / Booking", percentage: pp.downPaymentPercent, timing: "On booking" })
        constructionPercent += pp.downPaymentPercent
      }
      if (pp.preHandoverPercent) {
        milestones.push({ milestone: 2, description: "During Construction", percentage: pp.preHandoverPercent, timing: "During construction" })
        constructionPercent += pp.preHandoverPercent
      }
      if (pp.handoverPercent) {
        milestones.push({ milestone: 3, description: "On Handover", percentage: pp.handoverPercent, timing: "On completion" })
        constructionPercent += pp.handoverPercent
      }
      if (pp.postHandoverPercent) {
        milestones.push({ milestone: 4, description: "Post-Handover", percentage: pp.postHandoverPercent, timing: "Post handover" })
        postHandoverPercent = pp.postHandoverPercent
      }
    }

    if (milestones.length === 0) {
      // Default 60/40 plan
      milestones.push(
        { milestone: 1, description: "Down Payment", percentage: 20, timing: "On booking" },
        { milestone: 2, description: "During Construction", percentage: 40, timing: "During construction" },
        { milestone: 3, description: "On Handover", percentage: 40, timing: "On completion" },
      )
      constructionPercent = 60
      postHandoverPercent = 40
    }

    const paymentPlan: OffPlanPaymentPlan = {
      milestones,
      dldFeePercent: 4,
      totalPercent: 100,
      postHandoverPercent,
      constructionPercent: constructionPercent || (100 - postHandoverPercent),
    }

    update({
      offplanError: null,
      // Store the original extracted property so images + details are available
      property: extracted,
      offplanProject: project,
      offplanUnits: [unit],
      offplanPaymentPlan: paymentPlan,
      offplanStats: {
        totalUnits: 1,
        availableUnits: 1,
        soldUnits: 0,
        reservedUnits: 0,
        priceRange: { min: price, max: price },
        sizeRange: { min: sizeSqft, max: sizeSqft },
        avgPricePerSqft: pricePerSqft,
      },
      selectedOffplanUnits: [unit],
      offplanStep: "extracted",
    })
  } catch (err) {
    update({
      offplanError: err instanceof Error ? err.message : "Failed to extract property",
      offplanStep: "input",
    })
  }
}

export function handlePdfExtracted(result: {
  project: unknown
  units: unknown[]
  paymentPlan: unknown
  stats: unknown
  confidence: string
  model: string
  brochureImages?: string[]
}) {
  update({
    offplanError: null,
    offplanProject: result.project as OffPlanProject,
    offplanUnits: result.units as OffPlanUnit[],
    offplanPaymentPlan: result.paymentPlan as OffPlanPaymentPlan,
    offplanStats: result.stats as OffPlanExtractionResult["stats"],
    offplanBrochureImages: result.brochureImages ?? [],
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
    offplanStep: "input",
    offplanUrl: "",
    offplanError: null,
    offplanProject: null,
    offplanUnits: [],
    offplanPaymentPlan: null,
    offplanStats: null,
    selectedOffplanUnits: [],
    offplanEvaluation: null,
    offplanSavedMemoId: null,
    offplanBrochureImages: [],
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
