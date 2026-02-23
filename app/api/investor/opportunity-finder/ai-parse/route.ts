import { NextResponse } from "next/server"
import OpenAI from "openai"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError } from "@/lib/security/rbac"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export type AIParseResponse = {
  area?: string
  purpose?: "for-sale" | "for-rent"
  bedrooms?: number
  bathrooms?: number
  priceMin?: number
  priceMax?: number
  areaMin?: number
  areaMax?: number
  propertyType?: string
  sort?: "date_desc" | "price_asc" | "price_desc"
}

const SYSTEM_PROMPT = `You extract property search filters from natural language. Return ONLY valid JSON, no markdown.

Valid fields (all optional):
- area: string (Dubai area e.g. "Dubai Marina", "Downtown Dubai", "Palm Jumeirah", "JBR", "Business Bay", "Arabian Ranches", "Dubai Hills", "Jumeirah")
- purpose: "for-sale" | "for-rent"
- bedrooms: number 1-6
- bathrooms: number 1-6
- priceMin: number in AED
- priceMax: number in AED
- areaMin: number (sqm)
- areaMax: number (sqm)
- propertyType: "Apartment" | "Villa" | "Townhouse" | "Penthouse" | "Studio"
- sort: "date_desc" | "price_asc" | "price_desc"

Examples:
- "2 bed in Dubai Marina under 2M" -> {"area":"Dubai Marina","bedrooms":2,"priceMax":2000000}
- "villa for rent in Palm Jumeirah" -> {"area":"Palm Jumeirah","purpose":"for-rent","propertyType":"Villa"}
- "apartment 1-3M AED downtown" -> {"area":"Downtown Dubai","propertyType":"Apartment","priceMin":1000000,"priceMax":3000000}
- "cheapest first" -> {"sort":"price_asc"}

Return only the JSON object, no explanation.`

/**
 * POST /api/investor/opportunity-finder/ai-parse
 * Parses natural language into structured search filters
 */
export async function POST(req: Request) {
  try {
    await requireAuthContext(req)

    const body = await req.json().catch(() => ({}))
    const query = typeof body.query === "string" ? body.query.trim() : ""

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "AI parsing not configured" },
        { status: 503 }
      )
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: query },
      ],
      temperature: 0.2,
    })

    const raw = completion.choices[0]?.message?.content?.trim() ?? "{}"
    let parsed: AIParseResponse = {}
    try {
      const cleaned = raw.replace(/^```(?:json)?\s*|\s*```$/g, "").trim()
      parsed = JSON.parse(cleaned) as AIParseResponse
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 })
    }

    return NextResponse.json({ filters: parsed })
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[opportunity-finder/ai-parse] Error:", err)
    return NextResponse.json(
      { error: "Failed to parse search" },
      { status: 500 }
    )
  }
}
