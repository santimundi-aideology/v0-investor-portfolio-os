import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { getSupabaseAdminClient } from "@/lib/db/client"
import type {
  OffPlanProject,
  OffPlanUnit,
  OffPlanPaymentPlan,
  OffPlanEvaluationResult,
  OffPlanMemoContent,
  PaymentCashFlow,
  DeveloperAssessment,
  OffPlanFinancialProjections,
  OffPlanComparable,
  OffPlanRisk,
} from "@/lib/types"
import type {
  CashFlowTable,
  CashFlowRow,
  OperatingExpenses,
  ScenarioRow,
  ComparableTransaction,
} from "@/lib/pdf/intake-report"

export const runtime = "nodejs"
export const maxDuration = 120

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
})

// Use Sonnet for evaluation (faster + cheaper); Opus stays for extraction
const CLAUDE_MODEL = process.env.ANTHROPIC_EVAL_MODEL || "claude-sonnet-4-20250514"

/**
 * Robustly extract a JSON object from a string that may contain markdown or trailing text.
 * Uses balanced brace counting instead of greedy regex.
 */
function extractJSON(raw: string): any {
  // Try direct parse first
  try { return JSON.parse(raw) } catch { /* continue */ }

  // Find the first '{' and match balanced braces
  const start = raw.indexOf("{")
  if (start === -1) throw new Error("No JSON object found in response")

  let depth = 0
  let inString = false
  let escape = false

  for (let i = start; i < raw.length; i++) {
    const ch = raw[i]
    if (escape) { escape = false; continue }
    if (ch === "\\") { escape = true; continue }
    if (ch === '"' && !escape) { inString = !inString; continue }
    if (inString) continue
    if (ch === "{") depth++
    if (ch === "}") {
      depth--
      if (depth === 0) {
        try {
          return JSON.parse(raw.slice(start, i + 1))
        } catch {
          // Parsing failed at this position, continue looking
        }
      }
    }
  }

  // Fallback: try the greedy regex approach
  const match = raw.match(/\{[\s\S]*\}/)
  if (match) {
    try { return JSON.parse(match[0]) } catch { /* continue */ }
  }

  throw new Error("Failed to parse JSON from AI response")
}

// Dubai area data for context
const DUBAI_AREA_DATA: Record<string, { 
  grade: string
  avgPsfCompleted: number
  avgPsfOffplan: number
  appreciation5yr: number
  rentalYield: number
  profile: string
}> = {
  "DIFC": { grade: "A+", avgPsfCompleted: 3500, avgPsfOffplan: 4000, appreciation5yr: 45, rentalYield: 5.5, profile: "Premium financial district" },
  "Downtown Dubai": { grade: "A+", avgPsfCompleted: 2800, avgPsfOffplan: 3200, appreciation5yr: 40, rentalYield: 5.0, profile: "Prime mixed-use destination" },
  "Dubai Marina": { grade: "A", avgPsfCompleted: 2200, avgPsfOffplan: 2500, appreciation5yr: 35, rentalYield: 6.0, profile: "Waterfront lifestyle hub" },
  "Business Bay": { grade: "A", avgPsfCompleted: 2000, avgPsfOffplan: 2300, appreciation5yr: 38, rentalYield: 6.5, profile: "Central business corridor" },
  "Palm Jumeirah": { grade: "A+", avgPsfCompleted: 3200, avgPsfOffplan: 3800, appreciation5yr: 50, rentalYield: 4.5, profile: "Ultra-luxury island living" },
  "JBR": { grade: "A", avgPsfCompleted: 2400, avgPsfOffplan: 2700, appreciation5yr: 32, rentalYield: 5.5, profile: "Beachfront resort-style" },
  "Sheikh Zayed Road": { grade: "A", avgPsfCompleted: 2500, avgPsfOffplan: 3000, appreciation5yr: 42, rentalYield: 6.0, profile: "Premium commercial corridor" },
  "City Walk": { grade: "A", avgPsfCompleted: 2600, avgPsfOffplan: 3000, appreciation5yr: 38, rentalYield: 5.5, profile: "Urban lifestyle district" },
  "Dubai Hills": { grade: "A-", avgPsfCompleted: 1800, avgPsfOffplan: 2100, appreciation5yr: 35, rentalYield: 5.8, profile: "Green suburban community" },
  "JVC": { grade: "B+", avgPsfCompleted: 1100, avgPsfOffplan: 1300, appreciation5yr: 28, rentalYield: 7.0, profile: "Affordable family community" },
  "Dubai South": { grade: "B", avgPsfCompleted: 900, avgPsfOffplan: 1100, appreciation5yr: 25, rentalYield: 7.5, profile: "Emerging logistics hub" },
}

function getAreaData(area: string) {
  // Try exact match first
  if (DUBAI_AREA_DATA[area]) return DUBAI_AREA_DATA[area]
  
  // Try partial match
  const areaLower = area.toLowerCase()
  for (const [key, data] of Object.entries(DUBAI_AREA_DATA)) {
    if (areaLower.includes(key.toLowerCase()) || key.toLowerCase().includes(areaLower)) {
      return data
    }
  }
  
  // Default
  return { grade: "B", avgPsfCompleted: 1500, avgPsfOffplan: 1800, appreciation5yr: 30, rentalYield: 6.0, profile: "Dubai area" }
}

const EVALUATION_SYSTEM_PROMPT = `You are a senior real estate investment analyst specializing in off-plan properties in Dubai.
Evaluate the investment potential of off-plan units based on the provided project data, selected unit, and market context.

SCORING FACTORS (0-25 each, total 0-100):

1. DEVELOPER CREDIBILITY (0-25):
   - Track record of completed projects on time
   - Quality of past developments
   - Financial stability indicators
   - Reputation in the market
   - Current project pipeline managability

2. LOCATION PREMIUM (0-25):
   - Area grade (A+/A/B+/B/C)
   - Proximity to business districts, metro, landmarks
   - Views and positioning within building
   - Future infrastructure plans (Expo, Metro extensions)
   - Neighborhood growth trajectory

3. PAYMENT PLAN ATTRACTIVENESS (0-25):
   - Post-handover percentage (higher = better)
   - Spread of payments during construction
   - Flexibility and milestone structure
   - DLD fee timing
   - Cash flow friendliness for investor

4. APPRECIATION POTENTIAL (0-25):
   - Current price vs similar completed projects
   - Area appreciation trends
   - Supply pipeline in the area
   - Unique selling points
   - Exit liquidity potential

REQUIRED ANALYSIS — be as thorough as a professional IC memo:

1. Executive Summary: Clear investment thesis with key metrics.
2. Project Overview: Detailed description, condition, USPs, design quality.
3. Neighborhood & Market Analysis: Area grade, supply/demand dynamics, absorption trends, tenant demand, market drivers, infrastructure plans.
4. Developer Assessment: Track record, financial stability, strengths, concerns.
5. Unit Analysis: Value assessment vs market, positioning within project.
6. Payment Plan Analysis: Cash flow schedule, insights, attractiveness.
7. Financial Projections (DETAILED):
   - Purchase price breakdown (DLD fees, broker fees, total project cost)
   - Estimated completion value with appreciation %
   - Post-completion rental yield (gross & net after expenses)
   - Estimated annual rent
   - Return bridge: equity invested, total cost, exit proceeds, ROI on equity
   - Strategy: hold period, exit plan, focus points
8. Future Value Outlook:
   - Annual growth rate (base, conservative, upside)
   - Projected value at 1Y, 3Y, 5Y post-completion
   - Growth narrative and neighborhood trend
   - Key growth drivers and sensitivities
9. Risk Assessment: 5+ risks with severity and mitigation strategies.
10. Market Comparables: 3-5 similar projects (off-plan and completed) with price/sqft, status, notes.
11. Investment Thesis: 2-3 paragraph comprehensive thesis.
12. Recommendation: Clear decision (PROCEED/CONDITIONAL/PASS) with reasoning and negotiation points.

OUTPUT: Return valid JSON with structure matching OffPlanEvaluationResult type.
Be specific, use actual numbers, and reference the provided data. Always respond with valid JSON only — no explanation or markdown.`

interface EvaluationRequest {
  project: OffPlanProject
  selectedUnit: OffPlanUnit
  paymentPlan: OffPlanPaymentPlan
  allUnits?: OffPlanUnit[]
}

/**
 * POST /api/property-intake/evaluate-offplan
 * 
 * Evaluates an off-plan unit for investment potential using GPT-4.
 * 
 * Request: { project, selectedUnit, paymentPlan, allUnits? }
 * Response: OffPlanEvaluationResult
 */
export async function POST(req: NextRequest) {
  try {
    const body: EvaluationRequest = await req.json()
    const { project, selectedUnit, paymentPlan, allUnits } = body

    if (!project || !selectedUnit || !paymentPlan) {
      return NextResponse.json(
        { error: "Missing required data: project, selectedUnit, and paymentPlan are required." },
        { status: 400 }
      )
    }

    // Get area context
    const areaData = getAreaData(project.location.area)

    // Calculate basic metrics
    const priceVsMarket = selectedUnit.pricePerSqft / areaData.avgPsfOffplan
    const potentialAppreciation = ((areaData.avgPsfCompleted - selectedUnit.pricePerSqft) / selectedUnit.pricePerSqft) * 100

    // Build context for AI
    const contextPrompt = buildContextPrompt(project, selectedUnit, paymentPlan, areaData, allUnits)

    // Use streaming for reliable completion of long responses
    const stream = anthropic.messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: 16000,
      system: EVALUATION_SYSTEM_PROMPT,
      messages: [
        { role: "user", content: contextPrompt },
      ],
    })

    const finalMessage = await stream.finalMessage()

    const textBlock = finalMessage.content.find(block => block.type === "text")
    const content = textBlock && textBlock.type === "text" ? textBlock.text : null
    if (!content) {
      throw new Error("No response from Claude")
    }

    // Extract JSON from potential markdown wrapping — use balanced brace matching
    const aiResult = extractJSON(content)

    // Build complete evaluation result
    const evaluation = buildEvaluationResult(
      aiResult,
      project,
      selectedUnit,
      paymentPlan,
      areaData,
      priceVsMarket,
      potentialAppreciation
    )

    // Build enhanced PDF data (same depth as built properties)
    const enhancedPdfData = await buildEnhancedPdfData(
      project,
      selectedUnit,
      paymentPlan,
      areaData,
      evaluation,
      aiResult,
    )

    return NextResponse.json({ ...evaluation, enhancedPdfData })
  } catch (error) {
    console.error("Off-plan evaluation error:", error)

    // Return fallback evaluation
    return NextResponse.json(
      { error: "Failed to evaluate off-plan property. Please try again." },
      { status: 500 }
    )
  }
}

function buildContextPrompt(
  project: OffPlanProject,
  unit: OffPlanUnit,
  paymentPlan: OffPlanPaymentPlan,
  areaData: ReturnType<typeof getAreaData>,
  allUnits?: OffPlanUnit[]
): string {
  const availableUnits = allUnits?.filter((u) => u.status === "available") || []
  const soldUnits = allUnits?.filter((u) => u.status === "sold") || []

  const estMonths = monthsToCompletion(project.completionDate)

  return `
EVALUATE THIS OFF-PLAN INVESTMENT OPPORTUNITY:

=== PROJECT INFO ===
Project: ${project.projectName}
Developer: ${project.developer}
Location: ${project.location.area}${project.location.subArea ? `, ${project.location.subArea}` : ""}
Completion: ${project.completionDate}
Estimated months to completion: ${estMonths}
Total Levels: ${project.totalLevels}
Property Type: ${project.propertyType}
Amenities: ${project.amenities.join(", ") || "Not specified"}
Architect: ${project.architectDesigner || "Not specified"}
Interior Designer: ${project.interiorDesigner || "Not specified"}

${project.developerTrackRecord ? `
=== DEVELOPER TRACK RECORD ===
Completed Projects: ${project.developerTrackRecord.completedProjects?.map((p) => `${p.name} (${p.location || "Dubai"}, ${p.value || "N/A"})`).join("; ") || "Not specified"}
Current Projects: ${project.developerTrackRecord.currentProjects?.map((p) => `${p.name}`).join("; ") || "Not specified"}
Total Development Value: ${project.developerTrackRecord.totalDevelopmentValue || "Not specified"}
` : ""}

=== SELECTED UNIT ===
Unit: ${unit.unitNumber}
Level: ${unit.level}
Type: ${unit.type}
Size: ${unit.sizeSqft.toLocaleString()} sqft
Price/sqft: AED ${unit.pricePerSqft.toLocaleString()}
Total Price: AED ${unit.totalPrice.toLocaleString()}
Views: ${unit.views || "Not specified"}
Parking: ${unit.parking || "Standard allocation"}

=== PAYMENT PLAN ===
${paymentPlan.milestones.map((m) => `- ${m.description}: ${m.percentage}%${m.timing ? ` (${m.timing})` : ""}`).join("\n")}
DLD Fee: ${paymentPlan.dldFeePercent}%
Post-Handover: ${paymentPlan.postHandoverPercent}%
During Construction: ${paymentPlan.constructionPercent}%

=== INVENTORY STATUS ===
Total Units Available: ${availableUnits.length}
Units Sold: ${soldUnits.length}
Absorption Rate: ${soldUnits.length > 0 ? Math.round((soldUnits.length / (soldUnits.length + availableUnits.length)) * 100) : 0}%

=== AREA MARKET DATA ===
Area: ${project.location.area}
Grade: ${areaData.grade}
Avg PSF (Completed): AED ${areaData.avgPsfCompleted.toLocaleString()}
Avg PSF (Off-plan): AED ${areaData.avgPsfOffplan.toLocaleString()}
5-Year Appreciation: ${areaData.appreciation5yr}%
Rental Yield: ${areaData.rentalYield}%
Profile: ${areaData.profile}

=== ANALYSIS REQUIRED ===
1. Score the investment on all 4 factors (0-25 each)
2. Calculate payment schedule with monthly cash flows over the ${estMonths}-month construction period
3. Estimate completion value and ROI (no rental income until handover; account for payment milestone outflows during construction)
4. Calculate post-completion rental projections:
   - Estimated annual rent based on area yield data
   - Net rent after typical expenses (service charges ~AED 15-25/sqft, management 5%, maintenance 1%, insurance 0.1%)
   - Gross and net rental yields
5. Financial return bridge:
   - DLD fee (4%), broker fee (2%), total project cost
   - Equity invested vs total cost
   - Projected resale price at 5 years post-completion
   - Net profit and ROI on equity
6. Future value outlook:
   - Annual growth rates: base, conservative, upside
   - Projected values at 1Y, 3Y, 5Y post-completion
   - Key growth drivers and sensitivities
   - Neighborhood trend narrative
7. Strategy: recommended hold period, exit strategy, key focus points
8. Identify 5+ risks with severity (low/medium/high) and mitigation strategies
9. Compare with 3-5 similar projects (both off-plan and completed) with price/sqft and notes
10. Provide comprehensive 2-3 paragraph investment thesis
11. Clear recommendation (PROCEED/CONDITIONAL/PASS) with reasoning and negotiation points

Include in your JSON response:
- memoContent.financialProjections: include returnBridge object with {purchasePrice, dldFee, brokerFee, totalProjectCost, mortgageAmount, equityInvested, resalePrice, netProfit, roiOnEquityPct, holdPeriod, annualInterestRatePct}
- memoContent.growth: {narrative, neighborhoodTrend, annualGrowthBase, annualGrowthConservative, annualGrowthUpside, projectedValue1Y, projectedValue3Y, projectedValue5Y, drivers[], sensitivities[]}
- memoContent.strategy: {plan, holdPeriod, exit, focusPoints[]}

Respond with complete JSON matching the OffPlanEvaluationResult structure.`
}

function buildEvaluationResult(
  aiResult: any,
  project: OffPlanProject,
  unit: OffPlanUnit,
  paymentPlan: OffPlanPaymentPlan,
  areaData: ReturnType<typeof getAreaData>,
  priceVsMarket: number,
  potentialAppreciation: number
): OffPlanEvaluationResult {
  // Extract scores from AI
  const factors = {
    developerCredibility: Math.min(25, Math.max(0, aiResult.factors?.developerCredibility || 15)),
    locationPremium: Math.min(25, Math.max(0, aiResult.factors?.locationPremium || 18)),
    paymentPlanAttractiveness: Math.min(25, Math.max(0, aiResult.factors?.paymentPlanAttractiveness || 16)),
    appreciationPotential: Math.min(25, Math.max(0, aiResult.factors?.appreciationPotential || 17)),
  }

  const overallScore = factors.developerCredibility + factors.locationPremium + 
    factors.paymentPlanAttractiveness + factors.appreciationPotential

  // Determine recommendation based on score
  let recommendation: "strong_buy" | "buy" | "hold" | "pass"
  if (overallScore >= 80) recommendation = "strong_buy"
  else if (overallScore >= 65) recommendation = "buy"
  else if (overallScore >= 50) recommendation = "hold"
  else recommendation = "pass"

  // Build cash flow schedule – use the actual project completion date
  const cashFlowSchedule = buildCashFlowSchedule(unit.totalPrice, paymentPlan, project.completionDate)

  // Build developer assessment
  const developerAssessment: DeveloperAssessment = {
    score: factors.developerCredibility * 4, // Scale to 100
    grade: factors.developerCredibility >= 22 ? "A" : factors.developerCredibility >= 18 ? "B" : factors.developerCredibility >= 14 ? "C" : "D",
    strengths: aiResult.memoContent?.developerAssessment?.strengths || ["Established presence in Dubai market"],
    concerns: aiResult.memoContent?.developerAssessment?.concerns || [],
    trackRecordSummary: aiResult.memoContent?.developerAssessment?.trackRecordSummary || 
      `${project.developer} with ${project.developerTrackRecord?.completedProjects?.length || "multiple"} completed projects`,
    financialStability: aiResult.memoContent?.developerAssessment?.financialStability || "moderate",
  }

  // Build financial projections
  const estimatedCompletionValue = unit.totalPrice * (1 + potentialAppreciation / 100)
  const estimatedAnnualRent = estimatedCompletionValue * (areaData.rentalYield / 100)

  const financialProjections: OffPlanFinancialProjections = {
    purchasePrice: unit.totalPrice,
    estimatedCompletionValue: Math.round(estimatedCompletionValue),
    expectedAppreciation: Math.round(potentialAppreciation * 10) / 10,
    expectedAppreciationAed: Math.round(estimatedCompletionValue - unit.totalPrice),
    projectedRentalYieldGross: areaData.rentalYield,
    projectedRentalYieldNet: Math.round((areaData.rentalYield - 1.5) * 10) / 10,
    estimatedAnnualRent: Math.round(estimatedAnnualRent),
    ...(aiResult.memoContent?.financialProjections || {}),
  }

  // Build comparables
  const comparables: OffPlanComparable[] = aiResult.memoContent?.marketComparables || [
    {
      project: "Similar Project A",
      developer: "Major Developer",
      area: project.location.area,
      pricePerSqft: Math.round(areaData.avgPsfOffplan * 0.95),
      completionStatus: "under_construction",
      completionDate: project.completionDate,
      note: "Comparable off-plan project in same area",
    },
    {
      project: "Completed Reference B",
      developer: "Established Developer",
      area: project.location.area,
      pricePerSqft: areaData.avgPsfCompleted,
      completionStatus: "completed",
      currentPricePsf: areaData.avgPsfCompleted,
      note: "Recently completed benchmark",
    },
  ]

  // Build risks
  const risks: OffPlanRisk[] = aiResult.memoContent?.riskAssessment || [
    {
      category: "Construction Delay",
      level: "medium",
      description: "Potential for handover delays common in off-plan",
      mitigation: "Developer has track record; include delay clause in SPA",
    },
    {
      category: "Market Risk",
      level: "medium",
      description: "Property market fluctuations during construction period",
      mitigation: "Strong fundamentals in area; long-term hold strategy",
    },
    {
      category: "Developer Risk",
      level: developerAssessment.score >= 70 ? "low" : "medium",
      description: "Developer financial stability and execution capability",
      mitigation: "Research developer's previous project delivery",
    },
  ]

  // Build full memo content
  const memoContent: OffPlanMemoContent = {
    projectSummary: aiResult.memoContent?.projectSummary || 
      `${project.projectName} is a ${project.totalLevels}-level ${project.propertyType} development by ${project.developer} in ${project.location.area}, expected to complete ${project.completionDate}.`,
    projectHighlights: aiResult.memoContent?.projectHighlights || project.amenities.slice(0, 5),
    
    developerAssessment,
    
    locationAnalysis: {
      grade: areaData.grade,
      areaProfile: areaData.profile,
      highlights: aiResult.memoContent?.locationAnalysis?.highlights || [
        `${areaData.grade} grade location`,
        `${areaData.appreciation5yr}% 5-year appreciation trend`,
        `${areaData.rentalYield}% average rental yield`,
      ],
      proximity: aiResult.memoContent?.locationAnalysis?.proximity || {
        "Area": project.location.area,
        "Sub-area": project.location.subArea || "N/A",
        "Landmark": project.location.landmark || "N/A",
      },
      futureInfrastructure: aiResult.memoContent?.locationAnalysis?.futureInfrastructure,
    },
    
    unitAnalysis: {
      unitNumber: unit.unitNumber,
      type: unit.type,
      level: unit.level,
      sizeSqft: unit.sizeSqft,
      totalPrice: unit.totalPrice,
      pricePerSqft: unit.pricePerSqft,
      views: unit.views,
      parking: unit.parking,
      valueAssessment: priceVsMarket <= 0.95 ? "Below market - good value" : 
        priceVsMarket <= 1.05 ? "At market" : "Above market - premium positioning",
      priceVsProjectAvg: aiResult.memoContent?.unitAnalysis?.priceVsProjectAvg,
    },
    
    paymentPlanAnalysis: {
      summary: `${paymentPlan.constructionPercent}% during construction, ${paymentPlan.postHandoverPercent}% on completion. DLD fee ${paymentPlan.dldFeePercent}% due on SPA.`,
      cashFlowSchedule,
      totalDuringConstruction: Math.round(unit.totalPrice * (paymentPlan.constructionPercent / 100)),
      totalOnCompletion: Math.round(unit.totalPrice * (paymentPlan.postHandoverPercent / 100)),
      postHandoverMonths: 0,
      insights: aiResult.memoContent?.paymentPlanAnalysis?.insights || [
        paymentPlan.postHandoverPercent >= 40 ? "Favorable post-handover portion" : "Standard payment structure",
        `${paymentPlan.milestones.length} milestone payments`,
      ],
      attractivenessScore: factors.paymentPlanAttractiveness * 4,
    },
    
    financialProjections,
    marketComparables: comparables,
    riskAssessment: risks,
    overallRiskLevel: risks.filter((r) => r.level === "high").length > 1 ? "high" :
      risks.filter((r) => r.level === "medium").length > 2 ? "medium" : "low",
    
    investmentThesis: aiResult.memoContent?.investmentThesis ||
      `${unit.type} unit in ${project.projectName} offers ${potentialAppreciation > 20 ? "strong" : "moderate"} appreciation potential with ${paymentPlan.postHandoverPercent >= 40 ? "attractive" : "standard"} payment terms. Located in ${areaData.grade} grade ${project.location.area}, the investment targets ${areaData.rentalYield}% yield post-completion.`,
    
    keyStrengths: aiResult.memoContent?.keyStrengths || [
      `${areaData.grade} grade location`,
      `${potentialAppreciation.toFixed(0)}% potential appreciation to completion`,
      `${project.developer} developer track record`,
    ],
    
    keyConsiderations: aiResult.memoContent?.keyConsiderations || [
      "Off-plan execution risk",
      "Capital tied up during construction",
      "Market conditions at handover uncertain",
    ],
    
    recommendation: {
      decision: overallScore >= 65 ? "PROCEED" : overallScore >= 50 ? "CONDITIONAL" : "PASS",
      reasoning: aiResult.memoContent?.recommendation?.reasoning ||
        `Score: ${overallScore}/100. ${recommendation === "strong_buy" ? "Excellent opportunity" : recommendation === "buy" ? "Good investment prospect" : recommendation === "hold" ? "Consider with caution" : "Does not meet investment criteria"}.`,
      conditions: aiResult.memoContent?.recommendation?.conditions,
      suggestedNegotiationPoints: aiResult.memoContent?.recommendation?.suggestedNegotiationPoints,
    },
    
    generatedBy: "off-plan-analysis-ai",
    generatedAt: new Date().toISOString(),
  }

  return {
    overallScore,
    factors,
    headline: aiResult.headline || `${recommendation === "strong_buy" ? "Strong" : recommendation === "buy" ? "Attractive" : recommendation === "hold" ? "Fair" : "Weak"} off-plan opportunity in ${project.location.area}`,
    recommendation,
    memoContent,
  }
}

/**
 * Parse a completion/handover date string (e.g. "Q4 2026", "March 2027",
 * "2027", "Dec 2026") and return the estimated number of months from now.
 * Falls back to `fallbackMonths` when the string cannot be parsed.
 */
function monthsToCompletion(completionDate: string | undefined | null, fallbackMonths = 24): number {
  if (!completionDate) return fallbackMonths

  const now = new Date()
  let target: Date | null = null

  // Try "Q1 2026" – "Q4 2027"
  const qMatch = completionDate.match(/Q(\d)\s*(\d{4})/)
  if (qMatch) {
    const quarter = parseInt(qMatch[1])
    const year = parseInt(qMatch[2])
    // Q1 → Jan, Q2 → Apr, Q3 → Jul, Q4 → Oct (end of quarter)
    const monthStart = (quarter - 1) * 3
    target = new Date(year, monthStart + 2, 28) // end of quarter month
  }

  // Try "March 2027", "Dec 2026"
  if (!target) {
    const monthNames = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"]
    const mMatch = completionDate.match(/([A-Za-z]+)\s*(\d{4})/)
    if (mMatch) {
      const idx = monthNames.findIndex((m) => mMatch[1].toLowerCase().startsWith(m))
      if (idx !== -1) {
        target = new Date(parseInt(mMatch[2]), idx, 28)
      }
    }
  }

  // Try bare year "2027"
  if (!target) {
    const yMatch = completionDate.match(/(\d{4})/)
    if (yMatch) {
      // Assume mid-year
      target = new Date(parseInt(yMatch[1]), 5, 15)
    }
  }

  if (!target) return fallbackMonths

  const diffMs = target.getTime() - now.getTime()
  const months = Math.round(diffMs / (1000 * 60 * 60 * 24 * 30.44))
  return Math.max(1, months) // at least 1 month
}

function buildCashFlowSchedule(totalPrice: number, paymentPlan: OffPlanPaymentPlan, completionDate?: string): PaymentCashFlow[] {
  const schedule: PaymentCashFlow[] = []
  let cumulative = 0
  let month = 0
  const completionMonths = monthsToCompletion(completionDate)

  for (const milestone of paymentPlan.milestones) {
    const payment = Math.round(totalPrice * (milestone.percentage / 100))
    cumulative += payment
    
    schedule.push({
      month,
      milestone: milestone.description,
      payment,
      cumulative,
      percentPaid: Math.round((cumulative / totalPrice) * 100),
    })

    // Estimate months between milestones
    if (milestone.timing?.includes("months")) {
      const monthsMatch = milestone.timing.match(/(\d+)\s*months/)
      month = monthsMatch ? parseInt(monthsMatch[1]) : month + 3
    } else if (milestone.timing?.toLowerCase().includes("completion") || milestone.timing?.toLowerCase().includes("handover")) {
      month = completionMonths
    } else {
      month += 3 // Default quarterly
    }
  }

  return schedule
}

/* ------------------------------------------------------------------ */
/*  Enhanced PDF data builders (matching Built Properties depth)       */
/* ------------------------------------------------------------------ */

interface EnhancedOffPlanPdfData {
  cashFlowTable: CashFlowTable
  operatingExpenses: OperatingExpenses
  scenarios: ScenarioRow[]
  comparables: ComparableTransaction[]
  growth: {
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
  returnBridge: {
    purchasePrice: number
    dldRatePct: number
    dldFee: number
    brokerFeePct: number
    brokerFee: number
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
  strategy: {
    plan: string
    holdPeriod: number
    exit: string
    focusPoints: string[]
  }
}

/**
 * Build year-by-year cash flow table for POST-completion period.
 * For off-plan: rental income starts at Year 1 (after handover).
 */
function buildPostCompletionCashFlow(params: {
  completionValue: number
  annualRent: number
  annualExpenses: number
  appreciationPct: number
  holdPeriod: number
  equityInvested: number
  mortgageAmount: number
  mortgageRate: number
}): CashFlowTable {
  const {
    completionValue, annualRent, annualExpenses,
    appreciationPct, holdPeriod, equityInvested,
    mortgageAmount, mortgageRate,
  } = params

  // Monthly mortgage payment (P&I, 25-year term)
  const mortgageTerm = 25
  const monthlyRate = mortgageRate / 100 / 12
  const totalPayments = mortgageTerm * 12
  const monthlyPayment =
    mortgageAmount > 0 && monthlyRate > 0
      ? mortgageAmount *
        (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) /
        (Math.pow(1 + monthlyRate, totalPayments) - 1)
      : 0
  const annualMortgagePayment = Math.round(monthlyPayment * 12)

  const rows: CashFlowRow[] = []
  let cumulativeReturn = 0

  for (let year = 1; year <= holdPeriod; year++) {
    const grossRent = Math.round(annualRent * Math.pow(1.03, year - 1)) // 3% rental growth
    const expenses = Math.round(annualExpenses * Math.pow(1.02, year - 1)) // 2% expense inflation
    const netCashFlow = grossRent - expenses - annualMortgagePayment
    cumulativeReturn += netCashFlow
    const propertyValue = Math.round(completionValue * Math.pow(1 + appreciationPct / 100, year))

    rows.push({ year, grossRent, expenses, mortgagePayment: annualMortgagePayment, netCashFlow, propertyValue, cumulativeReturn })
  }

  // Exit proceeds
  const finalValue = rows[rows.length - 1]?.propertyValue ?? completionValue
  const remainingPayments = Math.max(0, totalPayments - holdPeriod * 12)
  const outstandingLoan =
    remainingPayments > 0 && monthlyRate > 0
      ? mortgageAmount *
        (Math.pow(1 + monthlyRate, totalPayments) - Math.pow(1 + monthlyRate, holdPeriod * 12)) /
        (Math.pow(1 + monthlyRate, totalPayments) - 1)
      : 0
  const exitProceeds = Math.round(finalValue - outstandingLoan)
  const totalProfit = Math.round(exitProceeds + cumulativeReturn - equityInvested)

  return { rows, exitProceeds, totalProfit, holdPeriod }
}

/**
 * Build operating expenses breakdown (post-completion).
 */
function buildOperatingExpenses(params: {
  completionValue: number
  annualRent: number
  sizeSqft: number
}): OperatingExpenses {
  const { completionValue, annualRent, sizeSqft } = params

  const scPerSqft = 20 // AED/sqft (off-plan typical, newer buildings slightly higher)
  const serviceCharge = Math.round(scPerSqft * sizeSqft)
  const managementFee = Math.round(annualRent * 0.05) // 5% property management
  const maintenanceReserve = Math.round(completionValue * 0.01) // 1% of value
  const insurance = Math.round(completionValue * 0.001) // 0.1%

  const totalAnnual = serviceCharge + managementFee + maintenanceReserve + insurance
  const netRent = annualRent - totalAnnual

  return {
    serviceCharge,
    managementFee,
    maintenanceReserve,
    insurance,
    totalAnnual,
    grossRent: annualRent,
    netRent,
    serviceChargePerSqft: scPerSqft,
    notes: "Off-plan estimate: service charge ~AED 20/sqft for newer developments",
  }
}

/**
 * Run 3 scenarios — upside / base / downside.
 */
function buildScenarios(params: {
  completionValue: number
  annualRent: number
  appreciationPct: number
  holdPeriod: number
  equityInvested: number
  mortgageAmount: number
  mortgageRate: number
  totalExpenses: number
}): ScenarioRow[] {
  const {
    completionValue, annualRent, appreciationPct, holdPeriod,
    equityInvested, mortgageAmount, mortgageRate, totalExpenses,
  } = params

  const annualInterest = Math.round(mortgageAmount * (mortgageRate / 100))

  function runScenario(
    label: string,
    rentMultiplier: number,
    occupancy: number,
    growthDelta: number,
  ): ScenarioRow {
    const adjRent = Math.round(annualRent * rentMultiplier * (occupancy / 100))
    const adjGrowth = appreciationPct + growthDelta
    const exitPrice = Math.round(completionValue * Math.pow(1 + adjGrowth / 100, holdPeriod))

    const totalRentalIncome = adjRent * holdPeriod
    const totalExpensesCost = totalExpenses * holdPeriod
    const totalInterestCost = annualInterest * holdPeriod
    const netSale = exitPrice - mortgageAmount
    const netProfit = Math.round(
      netSale + totalRentalIncome - totalExpensesCost - totalInterestCost - equityInvested,
    )

    const totalCashIn = netSale + totalRentalIncome - totalExpensesCost - totalInterestCost
    const equityMultiple = equityInvested > 0 ? totalCashIn / equityInvested : 1
    const fiveYearIrr = holdPeriod > 0
      ? Math.round((Math.pow(Math.max(equityMultiple, 0), 1 / holdPeriod) - 1) * 1000) / 10
      : 0

    return { label, annualRent: adjRent, occupancy, exitPrice, fiveYearIrr, netProfit }
  }

  return [
    runScenario("Upside", 1.10, 95, 2),
    runScenario("Base", 1.00, 90, 0),
    runScenario("Downside", 0.90, 80, -2),
  ]
}

/**
 * Fetch DLD-based comparables for the off-plan property area.
 */
async function fetchDLDComparables(params: {
  area: string
  propertyType: string
  sizeSqft: number
}): Promise<ComparableTransaction[]> {
  try {
    const supabase = getSupabaseAdminClient()
    const dldPropertyType = params.propertyType?.toLowerCase().includes("villa")
      ? "Villa"
      : params.propertyType?.toLowerCase().includes("townhouse")
        ? "Villa"
        : "Unit"

    const sizeSqm = params.sizeSqft ? params.sizeSqft * 0.092903 : null

    // Resolve area name
    let resolvedArea = params.area
    const { data: directCheck } = await supabase
      .from("dld_area_stats")
      .select("area_name_en")
      .eq("area_name_en", params.area)
      .limit(1)

    if (!directCheck || directCheck.length === 0) {
      try {
        const { data: resolved } = await supabase
          .rpc("resolve_area_name" as any, { p_community_name: params.area })
          .maybeSingle()
        const r = resolved as Record<string, unknown> | null
        if (r?.dld_area_name) resolvedArea = String(r.dld_area_name)
      } catch {
        // ignore
      }
    }

    // Query tiered comparables
    const { data: tiers } = await supabase.rpc("find_best_comparables", {
      p_area_name: params.area,
      p_property_type: dldPropertyType,
      p_bedrooms: "0",
      p_size_sqm: sizeSqm ?? 0,
      p_building_name: undefined,
    })

    const comps: ComparableTransaction[] = []

    if (tiers && tiers.length > 0) {
      for (const tier of tiers) {
        comps.push({
          name: `${String(tier.match_description || resolvedArea)} (Tier ${tier.match_tier})`,
          distance: tier.match_tier === 1 ? "Same building" : tier.match_tier === 2 ? "Same area" : "Nearby",
          price: Number(tier.median_price),
          pricePerSqft: Math.round(Number(tier.median_price_per_sqm) * 0.092903),
          date: "Recent",
          source: "DLD",
          type: "sale",
          note: `${tier.comparable_count} transactions, ${Math.round(Number(tier.confidence_score))}% confidence`,
        })
      }
    }

    // Also fetch latest individual transactions
    try {
      const { data: txns } = await supabase
        .from("dld_transactions")
        .select("instance_date, actual_worth, area_name_en, building_name_en, procedure_area, rooms_en")
        .eq("area_name_en", resolvedArea)
        .eq("property_type_en", dldPropertyType)
        .eq("trans_group_en", "Sales")
        .order("instance_date", { ascending: false })
        .limit(6)

      if (txns && txns.length > 0) {
        for (const txn of txns) {
          const areaSqm = Number(txn.procedure_area)
          const areaSqft = areaSqm > 0 ? Math.round(areaSqm / 0.092903) : 0
          const price = Number(txn.actual_worth)
          const psf = areaSqft > 0 ? Math.round(price / areaSqft) : 0
          comps.push({
            name: txn.building_name_en || txn.area_name_en || resolvedArea,
            distance: "Same area",
            price,
            pricePerSqft: psf,
            size: areaSqft > 0 ? `${areaSqft.toLocaleString()} sqft` : undefined,
            date: txn.instance_date || "Recent",
            source: "DLD",
            type: "sale",
            note: txn.rooms_en ? String(txn.rooms_en) : undefined,
          })
        }
      }
    } catch {
      // individual transactions not available
    }

    return comps
  } catch (err) {
    console.warn("[evaluate-offplan] DLD comparables fetch failed:", err)
    return []
  }
}

/**
 * Build all enhanced PDF data for comprehensive off-plan IC memo.
 */
async function buildEnhancedPdfData(
  project: OffPlanProject,
  unit: OffPlanUnit,
  paymentPlan: OffPlanPaymentPlan,
  areaData: ReturnType<typeof getAreaData>,
  evaluation: OffPlanEvaluationResult,
  aiResult: any,
): Promise<EnhancedOffPlanPdfData> {
  const purchasePrice = unit.totalPrice
  const completionMonths = monthsToCompletion(project.completionDate)
  const completionYears = completionMonths / 12

  // Appreciation during construction
  const constructionAppreciation = areaData.appreciation5yr / 5 * completionYears
  const completionValue = Math.round(purchasePrice * (1 + constructionAppreciation / 100))

  // Post-completion rental income
  const annualRent = Math.round(completionValue * (areaData.rentalYield / 100))
  const appreciationPct = areaData.appreciation5yr / 5 // annual

  // Return bridge
  const dldRatePct = 4
  const brokerFeePct = 2
  const mortgageLtvPct = 0 // Off-plan typically no mortgage during construction
  const annualInterestRatePct = 0 // No mortgage for off-plan
  const dldFee = Math.round(purchasePrice * (dldRatePct / 100))
  const brokerFee = Math.round(purchasePrice * (brokerFeePct / 100))
  const totalProjectCost = purchasePrice + dldFee + brokerFee
  const mortgageAmount = 0 // Off-plan: full equity during construction
  const equityInvested = totalProjectCost
  const holdPeriod = 5 // 5 years post-completion

  // Operating expenses (post-completion)
  const opex = buildOperatingExpenses({
    completionValue,
    annualRent,
    sizeSqft: unit.sizeSqft,
  })

  // Post-completion cash flow table
  const cashFlowTable = buildPostCompletionCashFlow({
    completionValue,
    annualRent,
    annualExpenses: opex.totalAnnual,
    appreciationPct,
    holdPeriod,
    equityInvested,
    mortgageAmount,
    mortgageRate: annualInterestRatePct,
  })

  // Scenarios
  const scenarios = buildScenarios({
    completionValue,
    annualRent,
    appreciationPct,
    holdPeriod,
    equityInvested,
    mortgageAmount,
    mortgageRate: annualInterestRatePct,
    totalExpenses: opex.totalAnnual,
  })

  // Growth projections
  const annualGrowthBase = Math.round(appreciationPct * 10) / 10
  const annualGrowthConservative = Math.max(0.5, Math.round((annualGrowthBase - 2) * 10) / 10)
  const annualGrowthUpside = Math.round((annualGrowthBase + 2.5) * 10) / 10

  const growth = aiResult.memoContent?.growth || {
    narrative: `${project.location.area} shows strong fundamentals with ${areaData.appreciation5yr}% historical 5-year appreciation. Post-completion, the property is projected to reach AED ${Math.round(completionValue * Math.pow(1 + annualGrowthBase / 100, 5)).toLocaleString()} within 5 years of handover, supported by ${areaData.profile.toLowerCase()}.`,
    neighborhoodTrend: `${project.location.area} is in an expansion phase with strong off-plan demand and positive transaction momentum.`,
    annualGrowthBase,
    annualGrowthConservative,
    annualGrowthUpside,
    projectedValue1Y: Math.round(completionValue * (1 + annualGrowthBase / 100)),
    projectedValue3Y: Math.round(completionValue * Math.pow(1 + annualGrowthBase / 100, 3)),
    projectedValue5Y: Math.round(completionValue * Math.pow(1 + annualGrowthBase / 100, 5)),
    drivers: [
      `${areaData.grade} grade location with ${areaData.rentalYield}% rental yield`,
      `${project.developer} developer reputation and project quality`,
      `${areaData.profile}`,
    ],
    sensitivities: [
      "Construction delays may defer rental income start date",
      "Market supply pipeline may affect post-completion pricing",
      "Interest rate changes may impact end-user demand at handover",
    ],
  }

  // Resale price at 5Y post-completion
  const resalePrice = growth.projectedValue5Y || Math.round(completionValue * Math.pow(1 + annualGrowthBase / 100, holdPeriod))
  const netSaleProceedsAfterMortgage = resalePrice - mortgageAmount
  const totalRentalProfit = cashFlowTable.rows.reduce((sum, r) => sum + r.netCashFlow, 0)
  const netProfitAfterInterest = Math.round(netSaleProceedsAfterMortgage + totalRentalProfit - equityInvested)
  const roiOnEquityPct = equityInvested > 0 ? Math.round((netProfitAfterInterest / equityInvested) * 1000) / 10 : 0

  const returnBridge = {
    purchasePrice,
    dldRatePct,
    dldFee,
    brokerFeePct,
    brokerFee,
    totalProjectCost,
    mortgageLtvPct,
    mortgageAmount,
    equityInvested,
    annualInterestRatePct,
    annualInterest: 0,
    resalePrice,
    netSaleProceedsAfterMortgage,
    netProfitAfterInterest,
    roiOnEquityPct,
    assumptions: `Off-plan: full equity investment (no mortgage during construction). ${holdPeriod}-year post-completion hold. DLD ${dldRatePct}%, broker ${brokerFeePct}%.`,
  }

  // Strategy
  const strategy = aiResult.memoContent?.strategy || {
    plan: `Acquire at off-plan pricing (AED ${unit.pricePerSqft.toLocaleString()}/sqft) with ${paymentPlan.constructionPercent}% during construction. Hold post-completion for rental income and capital appreciation.`,
    holdPeriod: holdPeriod + Math.ceil(completionYears),
    exit: `Target exit at ${holdPeriod}Y post-completion via resale at projected AED ${resalePrice.toLocaleString()}, yielding ${roiOnEquityPct}% ROI on equity.`,
    focusPoints: [
      "Monitor construction progress and developer milestones",
      "Secure tenant pre-handover for immediate rental income",
      "Track area comparable transactions for pricing validation",
      "Consider refinancing post-completion if favorable rates available",
    ],
  }

  // DLD comparables
  const dldComps = await fetchDLDComparables({
    area: project.location.area,
    propertyType: project.propertyType,
    sizeSqft: unit.sizeSqft,
  })

  // Merge AI + DLD comparables
  const aiComps: ComparableTransaction[] = (evaluation.memoContent.marketComparables || []).map((c: OffPlanComparable) => ({
    name: c.project,
    distance: "Same area",
    price: Math.round((c.pricePerSqft || areaData.avgPsfOffplan) * unit.sizeSqft),
    pricePerSqft: c.pricePerSqft || areaData.avgPsfOffplan,
    date: c.completionDate || "TBD",
    source: "AI" as const,
    type: "sale" as const,
    note: c.note || `${c.completionStatus || "off-plan"} - ${c.developer || "Developer"}`,
  }))

  const seen = new Set<string>()
  const merged: ComparableTransaction[] = []
  for (const comp of [...dldComps, ...aiComps]) {
    const key = `${comp.name}-${comp.price}`
    if (!seen.has(key)) {
      seen.add(key)
      merged.push(comp)
    }
  }

  return {
    cashFlowTable,
    operatingExpenses: opex,
    scenarios,
    comparables: merged.slice(0, 10),
    growth,
    returnBridge,
    strategy,
  }
}
