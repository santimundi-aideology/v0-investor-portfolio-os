import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { extractText } from "unpdf"

export const runtime = "nodejs"
export const maxDuration = 120

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
})
const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-20250514"

const EXTRACTION_SYSTEM_PROMPT = `You are a real estate data extraction specialist. Your task is to extract structured property data from a **single built / ready property** brochure or sales document from the Dubai market.

Extract the following information in JSON format:

{
  "source": "pdf_brochure",
  "listingId": null,
  "title": "Property title / headline",
  "price": 0,
  "pricePerSqft": 0,
  "size": 0,
  "bedrooms": 0,
  "bathrooms": 0,
  "propertyType": "apartment | villa | townhouse | penthouse | duplex | studio | office | retail | warehouse",
  "area": "Area name in Dubai",
  "subArea": "Sub-area or community name",
  "address": "Full address if available",
  "furnished": false,
  "parking": 0,
  "amenities": ["list of amenities"],
  "description": "Brief description",
  "images": [],
  "agentName": null,
  "agencyName": null,
  "listingUrl": "",
  "listedDate": null,
  "coordinates": null,
  "completionStatus": "ready",
  "developer": "Developer name if mentioned",
  "handoverDate": null,
  "serviceCharge": 0,
  "rentalPotential": 0,
  "referenceNumber": null,
  "purpose": "for-sale",
  "buildingName": "Building name if mentioned",
  "floorPlanImages": [],
  "plotSize": null,
  "confidence": "high | medium | low"
}

IMPORTANT RULES:
- All prices in AED. Convert if necessary (1 USD ≈ 3.67 AED).
- Convert sqm to sqft (multiply by 10.764).
- size should be in sqft.
- pricePerSqft = price / size.
- serviceCharge is annual in AED if mentioned.
- rentalPotential is annual expected rent in AED if mentioned.
- Set confidence: "high" if all key data is clear, "medium" if some data is inferred, "low" if significant data missing.
- For fields not found in the brochure, use null or 0 as appropriate.

Return ONLY valid JSON.`

/**
 * POST /api/property-intake/parse-built-pdf
 *
 * Accepts multipart/form-data with a PDF file, extracts text using unpdf,
 * then uses GPT-4o to extract a single built-property data object.
 *
 * Response: { property: ExtractedProperty-like object }
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    // Get the file
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json(
        { error: "No PDF file provided." },
        { status: 400 },
      )
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.name}. Only PDF files are accepted.` },
        { status: 400 },
      )
    }

    const maxFileSize = 20 * 1024 * 1024
    if (file.size > maxFileSize) {
      return NextResponse.json(
        { error: `File too large: ${file.name}. Maximum size is 20MB.` },
        { status: 400 },
      )
    }

    // Extract text from the PDF
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    let text: string
    try {
      const result = await extractText(uint8Array, { mergePages: true })
      text = result.text
      console.log(`[parse-built-pdf] Extracted ${result.totalPages} pages from ${file.name}`)
    } catch (pdfError) {
      console.error(`[parse-built-pdf] Error extracting text from ${file.name}:`, pdfError)
      return NextResponse.json(
        { error: `Failed to read PDF: ${file.name}. The file may be corrupted or password-protected.` },
        { status: 400 },
      )
    }

    // Truncate if too long
    const maxLength = 80000
    const truncatedText =
      text.length > maxLength
        ? text.slice(0, maxLength) + "\n\n[... text truncated ...]"
        : text

    console.log("[parse-built-pdf] Analyzing with Claude Opus...")

    // Use streaming to avoid SDK timeout for long-running Opus requests
    const stream = anthropic.messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: 8000,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Please extract property details from this built/ready property brochure or sales document:\n\nFile: ${file.name}\n\n--- EXTRACTED TEXT ---\n\n${truncatedText}\n\n--- END ---\n\nReturn a single JSON object with the property data.`,
        },
      ],
    })

    const response = await stream.finalMessage()

    const textBlock = response.content.find(block => block.type === "text")
    const textContent = textBlock && textBlock.type === "text" ? textBlock.text : null
    if (!textContent) {
      throw new Error("No response from Claude")
    }

    const extracted = JSON.parse(textContent)

    // Ensure required fields have sensible defaults
    const property = {
      source: "pdf_brochure",
      listingId: extracted.listingId ?? null,
      title: extracted.title || "Property from PDF",
      price: extracted.price || 0,
      pricePerSqft: extracted.pricePerSqft || (extracted.price && extracted.size ? Math.round(extracted.price / extracted.size) : null),
      size: extracted.size || null,
      bedrooms: extracted.bedrooms || 0,
      bathrooms: extracted.bathrooms || 0,
      propertyType: extracted.propertyType || "apartment",
      area: extracted.area || "Dubai",
      subArea: extracted.subArea || null,
      address: extracted.address || null,
      furnished: extracted.furnished || false,
      parking: extracted.parking ?? null,
      amenities: extracted.amenities || [],
      description: extracted.description || null,
      images: [],
      agentName: extracted.agentName || null,
      agencyName: extracted.agencyName || null,
      listingUrl: "",
      listedDate: null,
      coordinates: null,
      completionStatus: extracted.completionStatus || "ready",
      developer: extracted.developer || null,
      handoverDate: extracted.handoverDate || null,
      serviceCharge: extracted.serviceCharge || null,
      rentalPotential: extracted.rentalPotential || null,
      referenceNumber: extracted.referenceNumber || null,
      purpose: extracted.purpose || "for-sale",
      buildingName: extracted.buildingName || null,
      floorPlanImages: [],
      plotSize: extracted.plotSize || null,
      coverImageUrl: null,
    }

    return NextResponse.json({
      property,
      confidence: extracted.confidence || "medium",
      model: CLAUDE_MODEL,
    })
  } catch (error) {
    console.error("[parse-built-pdf] Error:", error)

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Failed to parse AI response. Please try again." },
        { status: 500 },
      )
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { error: `Failed to analyze PDF: ${errorMessage}` },
      { status: 500 },
    )
  }
}
