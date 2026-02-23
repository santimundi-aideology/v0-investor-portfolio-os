/**
 * POST /api/investor/favourites/pros-cons-from-link
 * Generates AI pros and cons for a property link (e.g. Dubai/Emirates listing URL)
 * based on the investor's mandate and preferences.
 */

import { NextResponse } from "next/server"
import OpenAI from "openai"
import { requireAuthContext } from "@/lib/auth/server"
import { getInvestorById } from "@/lib/db/investors"
import { compressInvestorContext } from "@/lib/ai/compression/compress-context"
import type { Investor } from "@/lib/types"
import type { Mandate } from "@/lib/types"

const PROS_CONS_LINK_SYSTEM_PROMPT = `You are a real estate investment analyst for UAE/Dubai/Emirates properties. Given a property listing URL and the investor's mandate, output pros and cons in English only.

OUTPUT: JSON only, no markdown.
{
  "title": "Short property title if inferrable from URL or leave empty string",
  "pros": ["pro 1", "pro 2", "pro 3"],
  "cons": ["con 1", "con 2"]
}

Rules:
- 2-4 pros max, 2-4 cons max
- Each item: 1 short sentence
- If the URL contains area names (e.g. Marina, Downtown, Palm), location hints, or portal names (Property Finder, Bayut, Dubizzle), use them to tailor pros/cons
- Otherwise give general pros/cons for a UAE property investment vs this investor's mandate
- Use investor's preferred areas, yield target, budget, risk tolerance
- Be concise and actionable`

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthContext(req)
    const investorId = ctx.investorId

    if (!investorId) {
      return NextResponse.json({ error: "Investor context required" }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const url = typeof body?.url === "string" ? body.url.trim() : ""
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    const investorRecord = await getInvestorById(investorId)
    if (!investorRecord) {
      return NextResponse.json({ error: "Investor not found" }, { status: 404 })
    }

    const investor: Investor = {
      id: investorRecord.id,
      name: investorRecord.name,
      company: investorRecord.company ?? "",
      email: investorRecord.email ?? "",
      phone: investorRecord.phone ?? "",
      status: investorRecord.status ?? "active",
      mandate: (investorRecord.mandate as Mandate | undefined) ?? undefined,
      createdAt: investorRecord.createdAt,
      lastContact: investorRecord.lastContact ?? investorRecord.createdAt,
      totalDeals: investorRecord.totalDeals ?? 0,
      tags: [],
      segment: undefined,
    }

    const investorContext = compressInvestorContext(investor)

    const userPrompt = `INVESTOR: ${investorContext.summaryText}
Areas: ${investorContext.keyAreas.join(", ") || "flexible"} | Yield: ${investorContext.yieldTarget} | Budget: ${investorContext.budgetRange} | Risk: ${investorContext.riskLevel}

PROPERTY LINK: ${url}

Infer what you can from the URL (portal, area, listing type). Return JSON with optional title, and pros and cons for this investor.`

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      const pros = [
        "Listing can be reviewed against your mandate",
        "Common UAE portals offer broad market coverage",
      ]
      const cons = [
        "Verify yield and area in person or with your realtor",
        "Confirm pricing and availability with the source",
      ]
      return NextResponse.json({
        title: "",
        pros,
        cons,
        source: "fallback",
      })
    }

    const openai = new OpenAI({ apiKey })
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: PROS_CONS_LINK_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 400,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error("Empty AI response")
    }

    const parsed = JSON.parse(content) as { title?: string; pros?: string[]; cons?: string[] }
    const title = typeof parsed.title === "string" ? parsed.title : ""
    const pros = Array.isArray(parsed.pros) ? parsed.pros : []
    const cons = Array.isArray(parsed.cons) ? parsed.cons : []

    return NextResponse.json({
      title,
      pros,
      cons,
      source: "ai",
    })
  } catch (err) {
    console.error("[investor/favourites/pros-cons-from-link] Error:", err)
    return NextResponse.json(
      { error: "Failed to generate pros and cons" },
      { status: 500 }
    )
  }
}
