/**
 * GET /api/investor/opportunities/[id]/pros-cons
 * Returns AI-generated pros and cons for an opportunity
 * based on the investor's mandate and preferences.
 */

import { NextResponse } from "next/server"
import OpenAI from "openai"
import { requireAuthContext } from "@/lib/auth/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { getOpportunitiesByInvestor } from "@/lib/db/opportunities"
import { compressInvestorContext } from "@/lib/ai/compression/compress-context"
import { compressPropertyContext } from "@/lib/ai/compression/compress-context"
import type { Investor } from "@/lib/types"

const PROS_CONS_SYSTEM_PROMPT = `You are a real estate investment analyst. For a given property and investor mandate, output pros and cons in English only.

OUTPUT: JSON only, no markdown.
{
  "pros": ["pro 1", "pro 2", "pro 3"],
  "cons": ["con 1", "con 2"]
}

Rules:
- 2-4 pros max, 2-4 cons max
- Each item: 1 short sentence, specific to this property and mandate
- Pros: alignment with mandate, strengths, opportunities
- Cons: risks, gaps vs mandate, considerations
- Use investor's preferred areas, yield target, budget, risk tolerance
- Be concise and actionable`

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuthContext(req)
    const investorId = ctx.investorId

    if (!investorId) {
      return NextResponse.json({ error: "Investor context required" }, { status: 400 })
    }

    const { id: opportunityId } = await params

    const supabase = getSupabaseAdminClient()

    // Fetch opportunity and verify ownership
    const opportunities = await getOpportunitiesByInvestor(investorId, { includeAcquired: true })
    const opp = opportunities.find((o) => o.id === opportunityId)
    if (!opp) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 })
    }

    // Fetch investor
    const { data: investorRow, error: invErr } = await supabase
      .from("investors")
      .select("*")
      .eq("id", investorId)
      .maybeSingle()

    if (invErr || !investorRow) {
      return NextResponse.json({ error: "Investor not found" }, { status: 404 })
    }

    const investor: Investor = {
      id: investorRow.id,
      name: investorRow.name,
      company: investorRow.company ?? "",
      email: investorRow.email ?? "",
      phone: investorRow.phone ?? "",
      status: investorRow.status ?? "active",
      mandate: investorRow.mandate ?? undefined,
      createdAt: investorRow.created_at,
      lastContact: investorRow.last_contact ?? investorRow.created_at,
      totalDeals: investorRow.total_deals ?? 0,
      tags: investorRow.tags ?? [],
      segment: investorRow.segment,
    }

    // Fetch listing
    const { data: listing, error: listErr } = await supabase
      .from("listings")
      .select("*")
      .eq("id", opp.listingId)
      .maybeSingle()

    if (listErr || !listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 })
    }

    const price = listing.price ? Number(listing.price) : 0
    const expectedRent = listing.expected_rent ? Number(listing.expected_rent) : 0
    const roi = price > 0 && expectedRent > 0 ? (expectedRent / price) * 100 : undefined
    const property = {
      id: listing.id,
      title: listing.title ?? "",
      address: listing.address ?? "",
      area: listing.area ?? "",
      type: (listing.type ?? "residential") as "residential" | "commercial" | "mixed-use" | "land",
      status: (listing.status ?? "available") as "available" | "under-offer" | "sold" | "off-market",
      readinessStatus: "READY_FOR_MEMO" as const,
      price,
      size: listing.size ? Number(listing.size) : 0,
      bedrooms: listing.bedrooms,
      roi,
      createdAt: listing.created_at ?? new Date().toISOString(),
    }

    const investorContext = compressInvestorContext(investor)
    const propertyContext = compressPropertyContext(property)

    const userPrompt = `INVESTOR: ${investorContext.summaryText}
Areas: ${investorContext.keyAreas.join(", ") || "flexible"} | Yield: ${investorContext.yieldTarget} | Budget: ${investorContext.budgetRange} | Risk: ${investorContext.riskLevel}

PROPERTY: ${propertyContext.summaryText}
Price vs market: ${propertyContext.priceVsMarket} | Yield: ${propertyContext.yieldEstimate} | Area: ${propertyContext.area} | Type: ${propertyContext.type}

Match reasons (if any): ${opp.matchReasons?.join("; ") ?? "none"}
Match score: ${opp.matchScore ?? "N/A"}%

Return JSON with pros and cons based on this investor's preferences.`

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      // Fallback: derive pros from matchReasons, generic cons
      const pros = opp.matchReasons?.length ? opp.matchReasons : [
        "Within budget range",
        "Area may align with preferences",
      ]
      const cons = [
        "Verify alignment with yield target",
        "Consider market timing and due diligence",
      ]
      return NextResponse.json({ pros, cons, source: "fallback" })
    }

    const openai = new OpenAI({ apiKey })
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: PROS_CONS_SYSTEM_PROMPT },
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

    const parsed = JSON.parse(content) as { pros?: string[]; cons?: string[] }
    const pros = Array.isArray(parsed.pros) ? parsed.pros : []
    const cons = Array.isArray(parsed.cons) ? parsed.cons : []

    return NextResponse.json({
      pros,
      cons,
      source: "ai",
    })
  } catch (err) {
    console.error("[investor/opportunities/pros-cons] Error:", err)
    return NextResponse.json(
      { error: "Failed to generate pros and cons" },
      { status: 500 }
    )
  }
}
