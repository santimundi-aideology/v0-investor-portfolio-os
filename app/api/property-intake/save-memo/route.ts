import { NextResponse } from "next/server"

import { AuditEvents, createAuditEventWriter } from "@/lib/audit"
import { createMemo } from "@/lib/db/memo-ops"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError } from "@/lib/security/rbac"

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
    const ctx = await requireAuthContext(req)

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

    // The AI evaluation may return memo-specific content under "memoContent" or
    // the full rich analysis under "analysis". Handle both gracefully.
    const mc = (evaluation as Record<string, unknown>).memoContent as Record<string, unknown> | undefined
    const analysis = (evaluation as Record<string, unknown>).analysis as Record<string, unknown> | undefined
    const pricing = analysis?.pricing as Record<string, unknown> | undefined
    const fa = mc?.financialAnalysis as Record<string, unknown> | undefined

    // Build memo content from evaluation
    const memoContent = {
      // Executive summary
      execSummary: mc?.execSummary ?? analysis?.summary ?? evaluation.headline,

      // Source tracking (includes all extracted property fields for PDF generation)
      source: {
        portal: property.source,
        listingId: property.listingId,
        listingUrl: property.listingUrl,
        coordinates:
          (property as unknown as { coordinates?: { lat?: number; lng?: number } | null }).coordinates ?? null,
        extractedAt: new Date().toISOString(),
        // Extended fields persisted for downstream use (PDF export, memo detail)
        completionStatus: (property as Record<string, unknown>).completionStatus ?? null,
        developer: (property as Record<string, unknown>).developer ?? null,
        handoverDate: (property as Record<string, unknown>).handoverDate ?? null,
        buildingName: (property as Record<string, unknown>).buildingName ?? null,
        buildingFloors: (property as Record<string, unknown>).buildingFloors ?? null,
        totalParkingSpaces: (property as Record<string, unknown>).totalParkingSpaces ?? null,
        parking: (property as Record<string, unknown>).parking ?? null,
        furnished: (property as Record<string, unknown>).furnished ?? false,
        serviceCharge: (property as Record<string, unknown>).serviceCharge ?? null,
        referenceNumber: (property as Record<string, unknown>).referenceNumber ?? null,
        permitNumber: (property as Record<string, unknown>).permitNumber ?? null,
        verified: (property as Record<string, unknown>).verified ?? false,
        plotSize: (property as Record<string, unknown>).plotSize ?? null,
        paymentPlan: (property as Record<string, unknown>).paymentPlan ?? null,
        purpose: (property as Record<string, unknown>).purpose ?? null,
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
        images: property.images.slice(0, 10),
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

      // Financial analysis - prefer memoContent.financialAnalysis, fall back to analysis.pricing
      numbers: {
        askingPrice: fa?.askingPrice ?? pricing?.askingPrice ?? property.price,
        pricePerSqft: fa?.pricePerSqft ?? pricing?.pricePerSqft ?? property.pricePerSqft,
        estimatedMonthlyRent: fa?.estimatedRent ?? (pricing?.rentCurrent ? Number(pricing.rentCurrent) / 12 : null),
        grossYield: fa?.grossYield ?? null,
        netYield: fa?.netYield ?? null,
        priceVsMarket: fa?.priceVsMarket ?? null,
      },

      // Analysis sections - prefer memoContent fields, fall back to analysis fields
      propertyOverview: mc?.propertyOverview ?? (analysis?.property as Record<string, unknown>)?.description ?? null,
      marketAnalysis: mc?.marketAnalysis ?? (analysis?.market as Record<string, unknown>)?.overview ?? null,

      // Risks and opportunities
      risks: mc?.risks ?? (analysis?.risks as unknown[])?.map((r: unknown) =>
        typeof r === "string" ? r : (r as Record<string, string>)?.risk
      ) ?? [],
      opportunities: mc?.opportunities ?? [],

      // Assumptions and evidence
      assumptions: mc?.assumptions ?? [],

      // Recommendation
      recommendation: mc?.recommendation ?? analysis?.investmentThesis ?? evaluation.recommendation,

      // Notes from realtor
      realtorNotes: notes || null,

      // Full analysis (preserve for memo detail view)
      analysis: analysis ?? null,

      // Metadata
      generatedBy: "property-intake-ai",
      generatedAt: new Date().toISOString(),
    }

    // listing_id must be a valid UUID referencing listings.id — portal extraction returns
    // external IDs (e.g. Bayut "12345") that are not UUIDs; only pass when valid
    const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const listingId = property.listingId && uuidLike.test(property.listingId)
      ? property.listingId
      : undefined

    const memo = await createMemo({
      investorId: investorId || null,
      listingId,
      underwritingId: undefined,
      content: memoContent,
      createdBy: ctx.userId,
      tenantId: ctx.tenantId ?? undefined,
    })

    // Audit logging
    const write = createAuditEventWriter()
    await write(
      AuditEvents.memoCreated({
        tenantId: memo.tenantId,
        actorId: ctx.userId,
        role: ctx.role,
        memoId: memo.id,
      })
    )

    await write(
      AuditEvents.aiGenerationRequested({
        tenantId: memo.tenantId,
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
