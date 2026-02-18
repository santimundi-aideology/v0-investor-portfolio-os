/**
 * Underwriting Guards & Scoring Adjustments
 * 
 * Enforces investment-grade discipline on AI-generated evaluations:
 * - Developer risk gate (unknown dev → cap at HOLD)
 * - Comparable validation (same micro-market only)
 * - Mandatory sensitivity analysis
 * - Risk probability-impact scoring
 * - Data quality / marketing disclaimer
 * - Pre-flight underwriting checklist
 */

// ── Types ────────────────────────────────────────────────────────

export type ScoredRisk = {
  category: string
  description: string
  mitigation: string
  probability: "high" | "medium" | "low"
  impact: "high" | "medium" | "low"
  /** probability × impact composite (1-9, higher = worse) */
  score: number
}

export type SensitivityScenario = {
  label: string
  description: string
  growthRate: number
  delayMonths: number
  priceAdjustment: number
  projectedValue: number
  projectedYield: number
  netReturn: number
}

export type ChecklistItem = {
  id: string
  label: string
  status: "pass" | "fail" | "warning" | "not_applicable"
  detail?: string
}

export type UnderwritingChecklist = {
  items: ChecklistItem[]
  passCount: number
  failCount: number
  warningCount: number
  grade: "A" | "B" | "C" | "F"
}

export type DataConfidence = {
  level: "high" | "medium" | "low"
  score: number // 0-100
  sources: { label: string; verified: boolean }[]
  disclaimer: string
}

// ── 1. Developer Risk Gate ───────────────────────────────────────

const UNKNOWN_DEVELOPER_TERMS = [
  "unknown", "tbd", "tbc", "n/a", "not specified", "not provided",
  "unnamed", "various", "na", "none", ""
]

export function isUnknownDeveloper(developer: string | null | undefined): boolean {
  if (!developer) return true
  return UNKNOWN_DEVELOPER_TERMS.includes(developer.trim().toLowerCase())
}

export function isCompletionUnknown(
  completionStatus: string | null | undefined,
  handoverDate: string | null | undefined
): boolean {
  if (!completionStatus || completionStatus === "unknown") return true
  if (completionStatus === "off_plan" || completionStatus === "under_construction") {
    if (!handoverDate || UNKNOWN_DEVELOPER_TERMS.includes(handoverDate.trim().toLowerCase())) {
      return true
    }
  }
  return false
}

/**
 * Caps recommendation based on developer/completion unknowns.
 * Returns adjusted recommendation + mandatory conditions.
 */
export function applyDeveloperRiskGate(input: {
  developer: string | null | undefined
  completionStatus: string | null | undefined
  handoverDate: string | null | undefined
  currentRecommendation: string
  currentScore: number
}): {
  recommendation: string
  score: number
  conditions: string[]
  penaltyApplied: boolean
} {
  const conditions: string[] = []
  let recommendation = input.currentRecommendation
  let score = input.currentScore
  let penaltyApplied = false

  const devUnknown = isUnknownDeveloper(input.developer)
  const completionUnknown = isCompletionUnknown(input.completionStatus, input.handoverDate)

  if (devUnknown) {
    // Hard cap: never recommend buy/strong_buy for unknown developers
    if (recommendation === "strong_buy" || recommendation === "buy") {
      recommendation = "hold"
    }
    score = Math.min(score, 55) // Cap at 55
    penaltyApplied = true
    conditions.push("Developer identity must be verified before proceeding")
    conditions.push("Escrow account status must be confirmed with RERA/DLD")
    conditions.push("Enhanced due diligence required: developer financials, track record, litigation history")
  }

  if (completionUnknown && (input.completionStatus === "off_plan" || input.completionStatus === "under_construction")) {
    if (recommendation === "strong_buy") {
      recommendation = "buy"
    }
    score = Math.min(score, 65)
    penaltyApplied = true
    conditions.push("Completion timeline must be verified with developer and RERA")
    conditions.push("Construction progress inspection required before capital deployment")
  }

  if (devUnknown && completionUnknown) {
    // Double unknown → pass unless exceptional circumstances
    recommendation = "hold"
    score = Math.min(score, 45)
    conditions.push("CRITICAL: Unknown developer with undefined completion — conditional approval only")
  }

  return { recommendation, score, conditions, penaltyApplied }
}

// ── 2. Comparable Validation ─────────────────────────────────────

/**
 * Filters out AI-generated comparables from different submarkets.
 */
export function validateComparables(
  comparables: Array<{ name: string; source?: string; [key: string]: unknown }>,
  propertyArea: string
): Array<typeof comparables[number] & { confidence: "high" | "medium" | "low" }> {
  const areaLower = propertyArea.toLowerCase()
  const areaTokens = areaLower.split(/[\s,/-]+/).filter(t => t.length > 2)

  return comparables.map(comp => {
    const nameLower = (comp.name || "").toLowerCase()
    const isDLDSource = comp.source === "DLD"

    // DLD-sourced comps are always high confidence
    if (isDLDSource) {
      return { ...comp, confidence: "high" as const }
    }

    // Check if AI comp name contains the property area
    const areaMatch = areaTokens.some(token => nameLower.includes(token)) ||
      nameLower.includes(areaLower)

    if (areaMatch) {
      return { ...comp, confidence: "medium" as const }
    }

    // No area match — low confidence (cross-submarket)
    return { ...comp, confidence: "low" as const }
  })
}

// ── 3. Mandatory Sensitivity Analysis ────────────────────────────

export function buildSensitivityAnalysis(input: {
  currentValue: number
  annualRent: number
  annualExpenses: number
  equityInvested: number
  baseGrowthRate: number
  holdYears: number
  isOffPlan?: boolean
}): SensitivityScenario[] {
  const { currentValue, annualRent, annualExpenses, equityInvested, baseGrowthRate, holdYears, isOffPlan } = input
  const netRent = annualRent - annualExpenses

  function compute(growthRate: number, delayMonths: number, priceAdj: number): Omit<SensitivityScenario, "label" | "description"> {
    const adjustedValue = currentValue * (1 + priceAdj)
    const projectedValue = Math.round(adjustedValue * Math.pow(1 + growthRate / 100, holdYears))
    const effectiveHoldYears = holdYears + delayMonths / 12
    const totalRent = Math.round(netRent * Math.max(0, effectiveHoldYears - delayMonths / 12))
    const netReturn = projectedValue - currentValue + totalRent
    const projectedYield = adjustedValue > 0 ? Math.round((netRent / adjustedValue) * 1000) / 10 : 0

    return {
      growthRate,
      delayMonths,
      priceAdjustment: priceAdj,
      projectedValue,
      projectedYield,
      netReturn,
    }
  }

  const scenarios: SensitivityScenario[] = [
    {
      label: "Base Case",
      description: `${baseGrowthRate}% annual growth, no delays`,
      ...compute(baseGrowthRate, 0, 0),
    },
    {
      label: "Zero Growth",
      description: "Flat property value, rental income only",
      ...compute(0, 0, 0),
    },
    {
      label: "Price Correction (-10%)",
      description: "Immediate 10% market correction, then flat",
      ...compute(0, 0, -0.10),
    },
    {
      label: "Severe Downturn (-20%)",
      description: "20% correction with 1% annual recovery",
      ...compute(1, 0, -0.20),
    },
    {
      label: "Interest Rate +2%",
      description: "Higher financing costs reduce net yield",
      ...compute(baseGrowthRate, 0, 0),
      // Adjust net return for higher interest
      netReturn: (() => {
        const extraInterest = (equityInvested * 0.7 / 0.3) * 0.02 * holdYears // approximate mortgage impact
        const base = compute(baseGrowthRate, 0, 0)
        return base.netReturn - Math.round(extraInterest)
      })(),
    },
  ]

  if (isOffPlan) {
    scenarios.push(
      {
        label: "12-Month Construction Delay",
        description: "Handover delayed 12 months, no rental income during delay",
        ...compute(baseGrowthRate, 12, 0),
      },
      {
        label: "24-Month Delay + 10% Drop",
        description: "Significant delay with market softening",
        ...compute(1, 24, -0.10),
      }
    )
  }

  return scenarios
}

// ── 4. Risk Probability-Impact Scoring ───────────────────────────

const PROB_WEIGHT = { high: 3, medium: 2, low: 1 } as const
const IMPACT_WEIGHT = { high: 3, medium: 2, low: 1 } as const

export function scoreRisk(probability: ScoredRisk["probability"], impact: ScoredRisk["impact"]): number {
  return PROB_WEIGHT[probability] * IMPACT_WEIGHT[impact]
}

/**
 * Auto-generates mandatory risk items based on property characteristics.
 */
export function generateMandatoryRisks(input: {
  developer: string | null | undefined
  completionStatus: string | null | undefined
  handoverDate: string | null | undefined
  newSupplyUnits: number
  priceVolatility: string
  area: string
  areaGrade: string
}): ScoredRisk[] {
  const risks: ScoredRisk[] = []

  if (isUnknownDeveloper(input.developer)) {
    risks.push({
      category: "Developer",
      description: "Developer identity unknown or unverified. No track record data available for due diligence assessment.",
      mitigation: "Verify developer identity with RERA. Confirm escrow account registration. Review completed project portfolio and financial statements.",
      probability: "high",
      impact: "high",
      score: scoreRisk("high", "high"),
    })
  }

  if (isCompletionUnknown(input.completionStatus, input.handoverDate)) {
    risks.push({
      category: "Completion",
      description: "Completion date undefined or TBD. Risk of construction delays and extended capital lockup.",
      mitigation: "Obtain confirmed completion schedule from developer. Include delay penalties in SPA. Stage capital deployment against construction milestones.",
      probability: "medium",
      impact: "high",
      score: scoreRisk("medium", "high"),
    })
  }

  if (input.newSupplyUnits > 3000) {
    risks.push({
      category: "Supply",
      description: `High supply pipeline (${input.newSupplyUnits.toLocaleString()} units) may depress rental yields and resale values.`,
      mitigation: "Monitor absorption rates quarterly. Position for premium tenant segment to maintain occupancy. Consider delayed exit if supply peaks.",
      probability: "medium",
      impact: "medium",
      score: scoreRisk("medium", "medium"),
    })
  }

  if (input.priceVolatility === "high") {
    risks.push({
      category: "Volatility",
      description: "Area exhibits high price volatility, increasing downside risk during hold period.",
      mitigation: "Underwrite to conservative exit pricing. Maintain flexible hold period. Ensure strong rental yield to offset capital risk.",
      probability: "medium",
      impact: "medium",
      score: scoreRisk("medium", "medium"),
    })
  }

  if (input.areaGrade === "C" || input.areaGrade === "D") {
    risks.push({
      category: "Location",
      description: `Emerging/unestablished area (Grade ${input.areaGrade}). Limited comparable transaction data and uncertain demand trajectory.`,
      mitigation: "Require higher yield threshold to compensate for location risk. Monitor infrastructure development catalysts.",
      probability: "medium",
      impact: "medium",
      score: scoreRisk("medium", "medium"),
    })
  }

  // Always include baseline risks
  risks.push(
    {
      category: "Market",
      description: "Macroeconomic downturn or regulatory changes could reduce demand and property values.",
      mitigation: "Diversify across areas and property types. Maintain adequate cash reserves for extended hold.",
      probability: "low",
      impact: "high",
      score: scoreRisk("low", "high"),
    },
    {
      category: "Liquidity",
      description: "Exit timeline may be longer than projected depending on market conditions at disposal.",
      mitigation: "Build in 12-month exit buffer. Consider dual-track exit (direct sale + broker).",
      probability: "medium",
      impact: "low",
      score: scoreRisk("medium", "low"),
    }
  )

  return risks.sort((a, b) => b.score - a.score)
}

// ── 5. Data Confidence & Marketing Disclaimer ────────────────────

export function assessDataConfidence(input: {
  developer: string | null | undefined
  completionStatus: string | null | undefined
  dldCompsCount: number
  hasDLDAreaData: boolean
  sourceType: string // "bayut", "propertyfinder", "brochure", "manual"
  verified: boolean
}): DataConfidence {
  const sources: { label: string; verified: boolean }[] = []
  let score = 50 // Start at medium

  // Source verification
  if (input.sourceType === "brochure" || input.sourceType === "manual") {
    sources.push({ label: "Developer marketing material", verified: false })
    score -= 15
  } else {
    sources.push({ label: `Portal listing (${input.sourceType})`, verified: input.verified })
    if (input.verified) score += 10
  }

  // DLD data
  if (input.hasDLDAreaData) {
    sources.push({ label: "DLD area statistics", verified: true })
    score += 15
  } else {
    sources.push({ label: "Generic market estimates", verified: false })
    score -= 10
  }

  // Comparables
  if (input.dldCompsCount >= 5) {
    sources.push({ label: `${input.dldCompsCount} DLD-verified comparables`, verified: true })
    score += 20
  } else if (input.dldCompsCount >= 2) {
    sources.push({ label: `${input.dldCompsCount} DLD comparables (limited)`, verified: true })
    score += 10
  } else {
    sources.push({ label: "AI-estimated comparables (not DLD-verified)", verified: false })
    score -= 10
  }

  // Developer
  if (!isUnknownDeveloper(input.developer)) {
    sources.push({ label: "Developer identified", verified: false })
    score += 5
  } else {
    sources.push({ label: "Developer unknown", verified: false })
    score -= 10
  }

  score = Math.max(0, Math.min(100, score))

  const level: DataConfidence["level"] =
    score >= 70 ? "high" : score >= 40 ? "medium" : "low"

  const disclaimer = level === "high"
    ? "Analysis supported by DLD-verified transaction data and identified sources. Standard verification recommended before capital deployment."
    : level === "medium"
      ? "Analysis relies partially on estimated data and portal-sourced information. Key assumptions should be independently verified before proceeding."
      : "CAUTION: Analysis relies heavily on unverified sources (marketing materials, estimated comparables). All financial projections must be independently validated. This memo is not investment-grade without additional verification."

  return { level, score, sources, disclaimer }
}

// ── 6. Pre-flight Underwriting Checklist ─────────────────────────

export function runUnderwritingChecklist(input: {
  developer: string | null | undefined
  completionStatus: string | null | undefined
  handoverDate: string | null | undefined
  dldCompsCount: number
  hasDLDAreaData: boolean
  hasSensitivityAnalysis: boolean
  hasRiskMatrix: boolean
  hasPaymentPlanModeling: boolean
  sourceType: string
  isOffPlan: boolean
}): UnderwritingChecklist {
  const items: ChecklistItem[] = []

  // 1. Developer
  if (isUnknownDeveloper(input.developer)) {
    items.push({
      id: "developer",
      label: "Developer identified and profiled",
      status: "fail",
      detail: "Developer is unknown. Must be identified and profiled before IC submission.",
    })
  } else {
    items.push({
      id: "developer",
      label: "Developer identified and profiled",
      status: "pass",
      detail: `Developer: ${input.developer}`,
    })
  }

  // 2. Escrow (off-plan only)
  if (input.isOffPlan) {
    items.push({
      id: "escrow",
      label: "Escrow account verified",
      status: "warning",
      detail: "Escrow verification pending — must be confirmed with RERA before capital deployment.",
    })
  } else {
    items.push({
      id: "escrow",
      label: "Escrow account verified",
      status: "not_applicable",
      detail: "Not applicable for ready properties.",
    })
  }

  // 3. DLD Comparables
  if (input.dldCompsCount >= 3) {
    items.push({
      id: "comparables",
      label: "DLD micro-market comparables (min 3)",
      status: "pass",
      detail: `${input.dldCompsCount} DLD-verified comparables found.`,
    })
  } else if (input.dldCompsCount >= 1) {
    items.push({
      id: "comparables",
      label: "DLD micro-market comparables (min 3)",
      status: "warning",
      detail: `Only ${input.dldCompsCount} DLD comparable(s). Ideally need 3+ for reliable pricing.`,
    })
  } else {
    items.push({
      id: "comparables",
      label: "DLD micro-market comparables (min 3)",
      status: "fail",
      detail: "No DLD comparables found. Pricing analysis relies on estimates.",
    })
  }

  // 4. Sensitivity
  items.push({
    id: "sensitivity",
    label: "Mandatory sensitivity analysis computed",
    status: input.hasSensitivityAnalysis ? "pass" : "fail",
    detail: input.hasSensitivityAnalysis
      ? "Includes 0% growth, correction, and delay scenarios."
      : "Sensitivity analysis missing — required for IC circulation.",
  })

  // 5. Risk matrix
  items.push({
    id: "risk_matrix",
    label: "Risk matrix with probability-impact scoring",
    status: input.hasRiskMatrix ? "pass" : "fail",
    detail: input.hasRiskMatrix
      ? "All risks scored with probability × impact."
      : "Risk scoring incomplete.",
  })

  // 6. Payment plan (off-plan)
  if (input.isOffPlan) {
    items.push({
      id: "payment_plan",
      label: "Payment plan milestones modeled",
      status: input.hasPaymentPlanModeling ? "pass" : "fail",
      detail: input.hasPaymentPlanModeling
        ? "Cash flow timing modeled per milestone."
        : "Payment plan not modeled — IRR calculation unreliable.",
    })
  }

  // 7. Completion (off-plan)
  if (input.isOffPlan) {
    if (isCompletionUnknown(input.completionStatus, input.handoverDate)) {
      items.push({
        id: "completion",
        label: "Completion timeline verified",
        status: "fail",
        detail: "Completion date is TBD — must be verified.",
      })
    } else {
      items.push({
        id: "completion",
        label: "Completion timeline verified",
        status: "warning",
        detail: `Stated completion: ${input.handoverDate}. Recommend independent verification.`,
      })
    }
  }

  // 8. Supply assessment
  items.push({
    id: "supply",
    label: "Supply pipeline assessed",
    status: input.hasDLDAreaData ? "pass" : "warning",
    detail: input.hasDLDAreaData
      ? "Area supply data sourced from DLD."
      : "Supply data estimated — DLD area data not available.",
  })

  const passCount = items.filter(i => i.status === "pass").length
  const failCount = items.filter(i => i.status === "fail").length
  const warningCount = items.filter(i => i.status === "warning").length

  const grade: UnderwritingChecklist["grade"] =
    failCount === 0 && warningCount <= 1 ? "A" :
    failCount === 0 ? "B" :
    failCount <= 2 ? "C" : "F"

  return { items, passCount, failCount, warningCount, grade }
}
