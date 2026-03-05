import { NextRequest, NextResponse } from "next/server"
import { createMemo } from "@/lib/db/memo-ops"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError } from "@/lib/security/rbac"
import { createAuditEventWriter } from "@/lib/audit"
import type {
  OffPlanProject,
  OffPlanUnit,
  OffPlanPaymentPlan,
  OffPlanEvaluationResult,
} from "@/lib/types"

export const runtime = "nodejs"

interface SaveOffPlanMemoRequest {
  project: OffPlanProject
  selectedUnit: OffPlanUnit
  paymentPlan: OffPlanPaymentPlan
  evaluation: OffPlanEvaluationResult
  investorId?: string
  notes?: string
}

/**
 * POST /api/property-intake/save-offplan-memo
 * 
 * Saves an off-plan IC memo to the database.
 * 
 * Request: { project, selectedUnit, paymentPlan, evaluation, investorId?, notes? }
 * Response: { memo: { id, ... } }
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuthContext(req)
    
    // Only agents and admins can create memos
    if (ctx.role === "investor") {
      return NextResponse.json(
        { error: "Investors cannot create IC memos directly." },
        { status: 403 }
      )
    }

    const body: SaveOffPlanMemoRequest = await req.json()
    const { project, selectedUnit, paymentPlan, evaluation, investorId, notes } = body

    if (!project || !selectedUnit || !paymentPlan || !evaluation) {
      return NextResponse.json(
        { error: "Missing required data: project, selectedUnit, paymentPlan, and evaluation are required." },
        { status: 400 }
      )
    }

    // Build memo content with full off-plan analysis
    const evalAny = evaluation as Record<string, unknown>
    const memoContent = {
      type: "offplan" as const,
      
      // Source info
      source: {
        type: "offplan-brochure",
        project: project.projectName,
        developer: project.developer,
        completionStatus: "off_plan",
        extractedAt: new Date().toISOString(),
      },
      
      // Property-like fields for the shared detail view & PDF
      property: {
        title: `${selectedUnit.type} - ${project.projectName} (Unit ${selectedUnit.unitNumber})`,
        type: project.propertyType,
        area: project.location.area,
        subArea: project.location.subArea || null,
        size: selectedUnit.sizeSqft,
        bedrooms: selectedUnit.type?.match(/(\d)\s*BR/i)?.[1] ? Number(selectedUnit.type.match(/(\d)\s*BR/i)![1]) : 0,
        bathrooms: 0,
        images: (project as Record<string, unknown>).images ?? [],
      },

      // Project overview
      project: {
        name: project.projectName,
        developer: project.developer,
        location: project.location,
        completionDate: project.completionDate,
        totalLevels: project.totalLevels,
        propertyType: project.propertyType,
        amenities: project.amenities,
        architectDesigner: project.architectDesigner,
        interiorDesigner: project.interiorDesigner,
        developerTrackRecord: project.developerTrackRecord,
        contactInfo: project.contactInfo,
      },
      
      // Selected unit details
      unit: {
        unitNumber: selectedUnit.unitNumber,
        level: selectedUnit.level,
        type: selectedUnit.type,
        sizeSqft: selectedUnit.sizeSqft,
        pricePerSqft: selectedUnit.pricePerSqft,
        totalPrice: selectedUnit.totalPrice,
        views: selectedUnit.views,
        parking: selectedUnit.parking,
      },
      
      // Payment plan
      paymentPlan: {
        milestones: paymentPlan.milestones,
        dldFeePercent: paymentPlan.dldFeePercent,
        postHandoverPercent: paymentPlan.postHandoverPercent,
        constructionPercent: paymentPlan.constructionPercent,
      },
      
      // Evaluation results (use `score` to match built property format)
      evaluation: {
        score: evaluation.overallScore,
        overallScore: evaluation.overallScore,
        factors: evaluation.factors,
        headline: evaluation.headline,
        recommendation: evaluation.recommendation,
        keyStrengths: evaluation.memoContent?.keyStrengths ?? [],
        considerations: evaluation.memoContent?.keyConsiderations ?? [],
      },
      
      // Full memo content from AI
      analysis: evaluation.memoContent,

      // Enhanced PDF data (cash flow, scenarios, comparables, return bridge, etc.)
      enhancedPdfData: evalAny.enhancedPdfData ?? null,

      // Underwriting guards
      underwriting: evalAny.underwriting ?? null,
      
      // Additional notes
      realtorNotes: notes || null,
      
      // Metadata
      generatedBy: "offplan-intake-ai",
      generatedAt: new Date().toISOString(),
    }

    // Create the memo — if no investor assigned, leave it unassigned
    const memo = await createMemo({
      investorId: investorId || null,
      content: memoContent,
      createdBy: ctx.userId || "system",
      tenantId: ctx.tenantId ?? undefined,
    })

    // Create audit events
    const writeAudit = createAuditEventWriter()
    
    await writeAudit({
      tenantId: ctx.tenantId,
      actorId: ctx.userId || "system",
      actorRole: ctx.role,
      eventType: "memo.created",
      objectType: "memo",
      objectId: memo.id,
      metadata: {
        memoType: "offplan",
        project: project.projectName,
        unit: selectedUnit.unitNumber,
        score: evaluation.overallScore,
      },
    })

    await writeAudit({
      tenantId: ctx.tenantId,
      actorId: ctx.userId || "system",
      actorRole: ctx.role,
      eventType: "ai.generation.completed",
      objectType: "memo",
      objectId: memo.id,
      metadata: {
        feature: "offplan-memo-generation",
        model: "gpt-4o-mini + claude-sonnet",
        outcome: "success",
      },
    })

    const memoTitle = `${selectedUnit.type} - ${project.projectName} (Unit ${selectedUnit.unitNumber})`

    return NextResponse.json({
      memo: {
        id: memo.id,
        title: memoTitle,
        status: "draft",
        investorId: investorId || null,
        createdAt: memo.createdAt,
      },
      message: "Off-plan IC memo saved successfully",
    })
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("Save off-plan memo error:", error)
    return NextResponse.json(
      { error: "Failed to save off-plan memo. Please try again." },
      { status: 500 }
    )
  }
}
