import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import type {
  OffPlanProject,
  OffPlanUnit,
  OffPlanPaymentPlan,
  OffPlanExtractionResult,
} from "@/lib/types"

export const runtime = "nodejs"
export const maxDuration = 120

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
})

const EXTRACTION_SYSTEM_PROMPT = `You are a real estate data extraction specialist. Your task is to extract structured data from off-plan property brochures and availability sheets from Dubai developers.

Extract the following information in JSON format:

1. PROJECT DETAILS:
   - projectName: The name of the development/tower
   - developer: The developer company name
   - location: { area, subArea (if mentioned), landmark (nearby landmarks) }
   - completionDate: Expected completion (e.g., "Q4 2026")
   - totalLevels: Number of floors/levels
   - totalUnits: Total number of units if mentioned
   - propertyType: "residential", "commercial", or "mixed"
   - amenities: Array of amenities (gym, pool, spa, etc.)
   - description: Brief project description
   - contactInfo: { phone, email, salesCenter, website } if available
   - developerTrackRecord: { completedProjects: [{name, location, value}], currentProjects, totalDevelopmentValue }
   - architectDesigner: Name of architect firm if mentioned
   - interiorDesigner: Name of interior design firm if mentioned

2. UNITS: Array of all units with:
   - unitNumber: Unit identifier (e.g., "5301", "402-DIFC")
   - level: Floor number (integer)
   - type: Unit type (e.g., "Full Floor", "Half Floor", "1BR", "2BR", "Studio")
   - sizeSqft: Size in square feet (convert from sqm if needed: sqm * 10.764)
   - pricePerSqft: Price per square foot in AED
   - totalPrice: Total price in AED
   - views: View description if mentioned (e.g., "Sheikh Zayed Road / Sea / DIFC")
   - parking: Number of parking spaces if mentioned
   - status: "available", "sold", or "reserved"
   - commonAreaSqft: Common area size if mentioned separately
   - totalAreaSqft: Total area including common if mentioned

3. PAYMENT PLAN:
   - milestones: Array of { milestone (number), description, percentage, timing }
   - dldFeePercent: DLD fee percentage (usually 4%)
   - totalPercent: Should equal 100
   - postHandoverPercent: Percentage due after handover (if any)
   - constructionPercent: Percentage during construction

IMPORTANT RULES:
- For units marked as "SOLD", set status to "sold" and do not include pricing (set to 0)
- For units marked as "RESERVED", set status to "reserved"
- Convert all prices to AED if in other currencies (1 USD ≈ 3.67 AED)
- Convert sqm to sqft (multiply by 10.764)
- If a field is not mentioned, use null or empty array as appropriate
- Extract ALL units from availability sheets, including sold ones
- Pay attention to payment plan milestones and their timing

OUTPUT FORMAT: Return ONLY valid JSON with this structure:
{
  "project": { ... },
  "units": [ ... ],
  "paymentPlan": { ... },
  "confidence": "high" | "medium" | "low"
}

Set confidence to:
- "high": All key data clearly extracted
- "medium": Some data inferred or partially available
- "low": Significant data missing or unclear`

/**
 * POST /api/property-intake/extract-offplan
 * 
 * Extracts structured off-plan project data from PDF text using Claude AI.
 * 
 * Request: { pdfText: string }
 * Response: OffPlanExtractionResult
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { pdfText } = body

    if (!pdfText || typeof pdfText !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid pdfText. Please provide the extracted PDF text." },
        { status: 400 }
      )
    }

    if (pdfText.length < 100) {
      return NextResponse.json(
        { error: "PDF text is too short. Please ensure the PDF was parsed correctly." },
        { status: 400 }
      )
    }

    // Truncate if too long (Claude has context limits)
    const maxLength = 100000
    const truncatedText = pdfText.length > maxLength 
      ? pdfText.slice(0, maxLength) + "\n\n[... text truncated for processing ...]"
      : pdfText

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Please extract all project, unit, and payment plan data from the following off-plan property brochure/availability sheet:\n\n${truncatedText}`,
        },
      ],
    })

    // Extract text content from response
    const textContent = response.content.find((c) => c.type === "text")
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from Claude")
    }

    // Parse JSON from response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("Could not extract JSON from Claude response")
    }

    const extracted = JSON.parse(jsonMatch[0]) as {
      project: OffPlanProject
      units: OffPlanUnit[]
      paymentPlan: OffPlanPaymentPlan
      confidence: "high" | "medium" | "low"
    }

    // Validate and clean the extracted data
    const result: OffPlanExtractionResult = {
      project: validateProject(extracted.project),
      units: validateUnits(extracted.units),
      paymentPlan: validatePaymentPlan(extracted.paymentPlan),
      extractedAt: new Date().toISOString(),
      confidence: extracted.confidence || "medium",
    }

    // Add statistics
    const availableUnits = result.units.filter((u) => u.status === "available")
    const soldUnits = result.units.filter((u) => u.status === "sold")
    const reservedUnits = result.units.filter((u) => u.status === "reserved")

    return NextResponse.json({
      ...result,
      stats: {
        totalUnits: result.units.length,
        availableUnits: availableUnits.length,
        soldUnits: soldUnits.length,
        reservedUnits: reservedUnits.length,
        priceRange: availableUnits.length > 0 ? {
          min: Math.min(...availableUnits.map((u) => u.totalPrice).filter((p) => p > 0)),
          max: Math.max(...availableUnits.map((u) => u.totalPrice)),
        } : null,
        sizeRange: availableUnits.length > 0 ? {
          min: Math.min(...availableUnits.map((u) => u.sizeSqft).filter((s) => s > 0)),
          max: Math.max(...availableUnits.map((u) => u.sizeSqft)),
        } : null,
        avgPricePerSqft: availableUnits.length > 0
          ? Math.round(
              availableUnits.reduce((sum, u) => sum + (u.pricePerSqft || 0), 0) / availableUnits.length
            )
          : null,
      },
    })
  } catch (error) {
    console.error("Off-plan extraction error:", error)
    
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Failed to parse AI response. Please try again." },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: "Failed to extract off-plan data. Please try again." },
      { status: 500 }
    )
  }
}

function validateProject(project: Partial<OffPlanProject>): OffPlanProject {
  return {
    projectName: project.projectName || "Unknown Project",
    developer: project.developer || "Unknown Developer",
    location: {
      area: project.location?.area || "Dubai",
      subArea: project.location?.subArea || undefined,
      landmark: project.location?.landmark || undefined,
    },
    completionDate: project.completionDate || "TBD",
    totalLevels: project.totalLevels || 0,
    totalUnits: project.totalUnits || 0,
    propertyType: project.propertyType || "commercial",
    amenities: project.amenities || [],
    description: project.description || "",
    contactInfo: project.contactInfo,
    developerTrackRecord: project.developerTrackRecord,
    architectDesigner: project.architectDesigner,
    interiorDesigner: project.interiorDesigner,
  }
}

function validateUnits(units: Partial<OffPlanUnit>[]): OffPlanUnit[] {
  if (!Array.isArray(units)) return []

  return units.map((unit) => ({
    unitNumber: unit.unitNumber || "Unknown",
    level: unit.level || 0,
    type: unit.type || "Unknown",
    sizeSqft: unit.sizeSqft || 0,
    pricePerSqft: unit.pricePerSqft || 0,
    totalPrice: unit.totalPrice || 0,
    views: unit.views,
    parking: unit.parking,
    status: unit.status || "available",
    commonAreaSqft: unit.commonAreaSqft,
    totalAreaSqft: unit.totalAreaSqft,
  }))
}

function validatePaymentPlan(plan: Partial<OffPlanPaymentPlan>): OffPlanPaymentPlan {
  const milestones = plan.milestones || []
  const constructionPercent = milestones
    .filter((m) => !m.description?.toLowerCase().includes("completion"))
    .reduce((sum, m) => sum + (m.percentage || 0), 0)
  const postHandoverPercent = milestones
    .filter((m) => m.description?.toLowerCase().includes("completion") || m.description?.toLowerCase().includes("handover"))
    .reduce((sum, m) => sum + (m.percentage || 0), 0)

  return {
    milestones: milestones.map((m, idx) => ({
      milestone: m.milestone || idx + 1,
      description: m.description || `Milestone ${idx + 1}`,
      percentage: m.percentage || 0,
      timing: m.timing,
    })),
    dldFeePercent: plan.dldFeePercent || 4,
    totalPercent: plan.totalPercent || 100,
    postHandoverPercent: postHandoverPercent || plan.postHandoverPercent || 0,
    constructionPercent: constructionPercent || plan.constructionPercent || 0,
  }
}
