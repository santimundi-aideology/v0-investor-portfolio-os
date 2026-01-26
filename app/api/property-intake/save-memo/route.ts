import { NextResponse } from "next/server"

import { AuditEvents, createAuditEventWriter } from "@/lib/audit"
import { createMemo, store } from "@/lib/data/store"
import { AccessError, buildRequestContext } from "@/lib/security/rbac"

/**
 * Save property evaluation as IC Memo
 * POST /api/property-intake/save-memo
 */

interface SaveMemoRequest {
  property: {
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
    listingUrl: string
    images: string[]
  }
  evaluation: {
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
    recommendation: string
    memoContent: {
      execSummary: string
      propertyOverview: string
      marketAnalysis: string
      financialAnalysis: {
        askingPrice: number
        pricePerSqft: number | null
        estimatedRent: number
        grossYield: number
        netYield: number
        priceVsMarket: string
      }
      risks: string[]
      opportunities: string[]
      assumptions: string[]
      recommendation: string
    }
  }
  investorId?: string
  notes?: string
}

export async function POST(req: Request) {
  try {
    const ctx = buildRequestContext(req)

    // Only agents and admins can create memos
    if (ctx.role === "investor") {
      throw new AccessError("Investors cannot create memos")
    }

    const body = (await req.json()) as SaveMemoRequest
    const { property, evaluation, investorId, notes } = body

    if (!property || !evaluation) {
      return NextResponse.json(
        { error: "Property and evaluation data are required" },
        { status: 400 }
      )
    }

    // Build memo content from evaluation
    const memoContent = {
      // Executive summary
      execSummary: evaluation.memoContent.execSummary,

      // Source tracking
      source: {
        portal: property.source,
        listingId: property.listingId,
        listingUrl: property.listingUrl,
        extractedAt: new Date().toISOString(),
      },

      // Property details
      property: {
        title: property.title,
        type: property.propertyType,
        area: property.area,
        subArea: property.subArea,
        size: property.size,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        images: property.images.slice(0, 5),
      },

      // AI Evaluation
      evaluation: {
        score: evaluation.overallScore,
        factors: evaluation.factors,
        headline: evaluation.headline,
        reasoning: evaluation.reasoning,
        keyStrengths: evaluation.keyStrengths,
        considerations: evaluation.considerations,
        recommendation: evaluation.recommendation,
      },

      // Financial analysis
      numbers: {
        askingPrice: evaluation.memoContent.financialAnalysis.askingPrice,
        pricePerSqft: evaluation.memoContent.financialAnalysis.pricePerSqft,
        estimatedMonthlyRent: evaluation.memoContent.financialAnalysis.estimatedRent,
        grossYield: evaluation.memoContent.financialAnalysis.grossYield,
        netYield: evaluation.memoContent.financialAnalysis.netYield,
        priceVsMarket: evaluation.memoContent.financialAnalysis.priceVsMarket,
      },

      // Analysis sections
      propertyOverview: evaluation.memoContent.propertyOverview,
      marketAnalysis: evaluation.memoContent.marketAnalysis,

      // Risks and opportunities
      risks: evaluation.memoContent.risks,
      opportunities: evaluation.memoContent.opportunities,

      // Assumptions and evidence
      assumptions: evaluation.memoContent.assumptions,

      // Recommendation
      recommendation: evaluation.memoContent.recommendation,

      // Notes from realtor
      realtorNotes: notes || null,

      // Metadata
      generatedBy: "property-intake-ai",
      generatedAt: new Date().toISOString(),
    }

    // Create the memo
    // Note: If no investorId provided, we create a "general" memo that can be assigned later
    const memo = createMemo({
      investorId: investorId || "unassigned",
      listingId: property.listingId || undefined,
      underwritingId: undefined,
      content: memoContent,
      createdBy: ctx.userId,
    })

    // Audit logging
    const write = createAuditEventWriter()
    await write(
      AuditEvents.memoCreated({
        tenantId: store.tenantId,
        actorId: ctx.userId,
        role: ctx.role,
        memoId: memo.id,
      })
    )

    await write(
      AuditEvents.aiGenerationRequested({
        tenantId: store.tenantId,
        actorId: ctx.userId,
        role: ctx.role,
        feature: "property-intake.evaluate",
        inputHash: `${property.source}:${property.listingId}`,
      })
    )

    return NextResponse.json({
      success: true,
      memo: {
        id: memo.id,
        title: `${property.title} - IC Memo`,
        status: memo.state,
        score: evaluation.overallScore,
        recommendation: evaluation.recommendation,
        createdAt: memo.createdAt,
      },
    })
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      )
    }
    console.error("Save memo error:", error)
    return NextResponse.json(
      { error: "Failed to save memo" },
      { status: 500 }
    )
  }
}
