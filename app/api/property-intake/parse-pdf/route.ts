import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

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
 * POST /api/property-intake/parse-pdf
 * 
 * Accepts multipart/form-data with PDF files and uses Claude Opus 4.5 to
 * directly analyze and extract structured data from the PDFs.
 * 
 * Request: FormData with files under key "files" or "file"
 * Response: OffPlanExtractionResult with project, units, paymentPlan, stats
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    
    // Get all files from the form data
    const files: File[] = []
    
    // Check for "files" (multiple) or "file" (single)
    const multipleFiles = formData.getAll("files")
    const singleFile = formData.get("file")
    
    if (multipleFiles.length > 0) {
      for (const f of multipleFiles) {
        if (f instanceof File) {
          files.push(f)
        }
      }
    } else if (singleFile instanceof File) {
      files.push(singleFile)
    }
    
    if (files.length === 0) {
      return NextResponse.json(
        { error: "No PDF files provided. Please upload at least one PDF file." },
        { status: 400 }
      )
    }
    
    // Validate files
    const maxFileSize = 20 * 1024 * 1024 // 20MB per file for Claude
    const maxFiles = 5
    
    if (files.length > maxFiles) {
      return NextResponse.json(
        { error: `Too many files. Maximum ${maxFiles} files allowed.` },
        { status: 400 }
      )
    }
    
    for (const file of files) {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        return NextResponse.json(
          { error: `Invalid file type: ${file.name}. Only PDF files are accepted.` },
          { status: 400 }
        )
      }
      
      if (file.size > maxFileSize) {
        return NextResponse.json(
          { error: `File too large: ${file.name}. Maximum size is 20MB per file.` },
          { status: 400 }
        )
      }
    }
    
    // Convert PDFs to base64 for Claude
    const pdfContents: Array<{
      type: "document"
      source: {
        type: "base64"
        media_type: "application/pdf"
        data: string
      }
    }> = []
    
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer()
      const base64 = Buffer.from(arrayBuffer).toString("base64")
      
      pdfContents.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: base64,
        },
      })
    }
    
    // Use Claude Opus 4.5 to analyze the PDFs directly
    const model = process.env.ANTHROPIC_MODEL || "claude-opus-4-20250514"
    
    console.log(`Analyzing ${files.length} PDF(s) with ${model} (streaming)...`)
    
    // Use streaming for long-running PDF analysis
    const stream = await anthropic.messages.stream({
      model,
      max_tokens: 16000,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            ...pdfContents,
            {
              type: "text",
              text: `Please analyze the attached PDF document(s) and extract all project details, unit information, and payment plan data. The documents are off-plan property brochures and/or availability sheets from Dubai developers.

Files provided: ${files.map(f => f.name).join(", ")}

Extract all data and return as JSON.`,
            },
          ],
        },
      ],
    })
    
    // Collect the full response from stream
    const response = await stream.finalMessage()
    
    // Extract text content from response
    const textContent = response.content.find((c) => c.type === "text")
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from Claude")
    }
    
    // Parse JSON from response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error("Claude response:", textContent.text)
      throw new Error("Could not extract JSON from Claude response")
    }
    
    const extracted = JSON.parse(jsonMatch[0])
    
    // Validate and clean the extracted data
    const project = validateProject(extracted.project || {})
    const units = validateUnits(extracted.units || [])
    const paymentPlan = validatePaymentPlan(extracted.paymentPlan || {})
    
    // Calculate statistics
    const availableUnits = units.filter((u) => u.status === "available")
    const soldUnits = units.filter((u) => u.status === "sold")
    const reservedUnits = units.filter((u) => u.status === "reserved")
    
    const stats = {
      totalUnits: units.length,
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
    }
    
    return NextResponse.json({
      project,
      units,
      paymentPlan,
      stats,
      extractedAt: new Date().toISOString(),
      confidence: extracted.confidence || "medium",
      fileCount: files.length,
      model,
    })
  } catch (error) {
    console.error("PDF analysis error:", error)
    
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Failed to parse AI response. Please try again." },
        { status: 500 }
      )
    }
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { error: `Failed to analyze PDF files: ${errorMessage}` },
      { status: 500 }
    )
  }
}

// Validation helpers
function validateProject(project: Record<string, unknown>) {
  return {
    projectName: (project.projectName as string) || "Unknown Project",
    developer: (project.developer as string) || "Unknown Developer",
    location: {
      area: (project.location as Record<string, string>)?.area || "Dubai",
      subArea: (project.location as Record<string, string>)?.subArea || undefined,
      landmark: (project.location as Record<string, string>)?.landmark || undefined,
    },
    completionDate: (project.completionDate as string) || "TBD",
    totalLevels: (project.totalLevels as number) || 0,
    totalUnits: (project.totalUnits as number) || 0,
    propertyType: (project.propertyType as string) || "commercial",
    amenities: (project.amenities as string[]) || [],
    description: (project.description as string) || "",
    contactInfo: project.contactInfo as Record<string, string> | undefined,
    developerTrackRecord: project.developerTrackRecord as Record<string, unknown> | undefined,
    architectDesigner: project.architectDesigner as string | undefined,
    interiorDesigner: project.interiorDesigner as string | undefined,
  }
}

function validateUnits(units: Array<Record<string, unknown>>) {
  if (!Array.isArray(units)) return []
  
  return units.map((unit) => ({
    unitNumber: (unit.unitNumber as string) || "Unknown",
    level: (unit.level as number) || 0,
    type: (unit.type as string) || "Unknown",
    sizeSqft: (unit.sizeSqft as number) || 0,
    pricePerSqft: (unit.pricePerSqft as number) || 0,
    totalPrice: (unit.totalPrice as number) || 0,
    views: unit.views as string | undefined,
    parking: unit.parking as number | undefined,
    status: ((unit.status as string) || "available") as "available" | "sold" | "reserved",
    commonAreaSqft: unit.commonAreaSqft as number | undefined,
    totalAreaSqft: unit.totalAreaSqft as number | undefined,
  }))
}

function validatePaymentPlan(plan: Record<string, unknown>) {
  const milestones = (plan.milestones as Array<Record<string, unknown>>) || []
  const constructionPercent = milestones
    .filter((m) => !(m.description as string)?.toLowerCase().includes("completion"))
    .reduce((sum, m) => sum + ((m.percentage as number) || 0), 0)
  const postHandoverPercent = milestones
    .filter((m) => 
      (m.description as string)?.toLowerCase().includes("completion") || 
      (m.description as string)?.toLowerCase().includes("handover")
    )
    .reduce((sum, m) => sum + ((m.percentage as number) || 0), 0)

  return {
    milestones: milestones.map((m, idx) => ({
      milestone: (m.milestone as number) || idx + 1,
      description: (m.description as string) || `Milestone ${idx + 1}`,
      percentage: (m.percentage as number) || 0,
      timing: m.timing as string | undefined,
    })),
    dldFeePercent: (plan.dldFeePercent as number) || 4,
    totalPercent: (plan.totalPercent as number) || 100,
    postHandoverPercent: postHandoverPercent || (plan.postHandoverPercent as number) || 0,
    constructionPercent: constructionPercent || (plan.constructionPercent as number) || 0,
  }
}
