import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
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

export const runtime = "nodejs"
export const maxDuration = 120

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
})

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini"

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

REQUIRED ANALYSIS:
1. Generate payment plan cash flow schedule (monthly for construction period)
2. Calculate estimated completion value based on area trends
3. Project rental yield post-completion
4. Identify top 3-5 risks with mitigation strategies
5. Compare with 3 similar off-plan/completed projects
6. Provide investment thesis and clear recommendation

OUTPUT: Return valid JSON with structure matching OffPlanEvaluationResult type.
Be specific, use actual numbers, and reference the provided data.`

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

    const response = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: EVALUATION_SYSTEM_PROMPT },
        { role: "user", content: contextPrompt },
      ],
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error("No response from OpenAI")
    }

    const aiResult = JSON.parse(content)

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

    return NextResponse.json(evaluation)
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

  return `
EVALUATE THIS OFF-PLAN INVESTMENT OPPORTUNITY:

=== PROJECT INFO ===
Project: ${project.projectName}
Developer: ${project.developer}
Location: ${project.location.area}${project.location.subArea ? `, ${project.location.subArea}` : ""}
Completion: ${project.completionDate}
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
2. Calculate payment schedule with monthly cash flows
3. Estimate completion value and ROI
4. Identify and analyze key risks
5. Compare with similar projects
6. Provide investment thesis and recommendation

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

  // Build cash flow schedule
  const cashFlowSchedule = buildCashFlowSchedule(unit.totalPrice, paymentPlan)

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

function buildCashFlowSchedule(totalPrice: number, paymentPlan: OffPlanPaymentPlan): PaymentCashFlow[] {
  const schedule: PaymentCashFlow[] = []
  let cumulative = 0
  let month = 0

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
    } else if (milestone.timing?.toLowerCase().includes("completion")) {
      month = 24 // Assume 24 months to completion
    } else {
      month += 3 // Default quarterly
    }
  }

  return schedule
}
