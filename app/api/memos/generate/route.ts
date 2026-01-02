import { createHash } from "crypto"
import { NextResponse } from "next/server"

import { AuditEvents, createAuditEventWriter } from "@/lib/audit"
import { getInvestor, getUnderwriting, store, createMemo } from "@/lib/data/store"
import { computeConfidence, evidenceWarnings } from "@/lib/domain/underwriting"
import { AccessError, assertInvestorAccess, buildRequestContext } from "@/lib/security/rbac"

export async function POST(req: Request) {
  try {
    const ctx = buildRequestContext(req)
    if (ctx.role !== "agent" && ctx.role !== "super_admin") throw new AccessError("Only agents can generate memos")

    const body = await req.json()
    const { investorId, listingId, underwritingId } = body
    if (!investorId || !listingId || !underwritingId) throw new AccessError("investorId, listingId, underwritingId are required")

    const investor = getInvestor(investorId)
    if (!investor) throw new AccessError("Investor not found")
    assertInvestorAccess(investor, ctx)

    const uw = getUnderwriting(underwritingId)
    if (!uw) throw new AccessError("Underwriting not found")
    if (uw.listingId !== listingId) throw new AccessError("Underwriting must be linked to listing")

    const comps = store.underwritingComps.filter((c) => c.underwritingId === uw.id)
    const trust = store.trust.find((t) => t.listingId === listingId)
    const warnings = evidenceWarnings(comps)
    const confidence = computeConfidence(comps.map((c) => ({ observedDate: c.observedDate })), uw.inputs)

    const content = buildMemoContent({
      uw,
      comps,
      trustStatus: trust?.status ?? "unknown",
      trustReason: trust?.reason,
      warnings,
      confidence,
    })

    const inputHash = createHash("sha256")
      .update(JSON.stringify({ investorId, listingId, underwritingId }))
      .digest("hex")

    const write = createAuditEventWriter()
    await write(
      AuditEvents.aiGenerationRequested({
        tenantId: store.tenantId,
        actorId: ctx.userId,
        role: ctx.role,
        feature: "memo.generate",
        inputHash,
      }),
    )

    const memo = createMemo({
      investorId,
      listingId,
      underwritingId,
      content,
      createdBy: ctx.userId,
    })

    await write(
      AuditEvents.memoCreated({
        tenantId: store.tenantId,
        actorId: ctx.userId,
        role: ctx.role,
        memoId: memo.id,
      }),
    )
    await write(
      AuditEvents.aiOutputAccepted({
        tenantId: store.tenantId,
        actorId: ctx.userId,
        role: ctx.role,
        feature: "memo.generate",
        memoId: memo.id,
      }),
    )

    return NextResponse.json(memo, { status: 201 })
  } catch (err) {
    return handleError(err)
  }
}

function buildMemoContent({
  uw,
  comps,
  trustStatus,
  trustReason,
  warnings,
  confidence,
}: {
  uw: Record<string, unknown>
  comps: Record<string, unknown>[]
  trustStatus: string
  trustReason?: string
  warnings: string[]
  confidence: string
}) {
  const inputs = (uw["inputs"] ?? {}) as Record<string, unknown>
  const assumptions = [
    typeof inputs["price"] === "number" ? `Purchase price: ${inputs["price"]}` : "Purchase price: Unknown",
    typeof inputs["rent"] === "number" ? `Rent: ${inputs["rent"]}` : "Rent: Unknown",
    typeof inputs["fees"] === "number" ? `Fees: ${inputs["fees"]}` : "Fees: Unknown",
    typeof inputs["vacancy"] === "number" ? `Vacancy (months): ${inputs["vacancy"]}` : "Vacancy: Unknown",
    typeof inputs["exit"] === "number" ? `Exit price: ${inputs["exit"]}` : "Exit: Unknown",
  ]

  const risks = []
  if (warnings.length) risks.push(...warnings)
  if (trustStatus === "flagged") risks.push("Trust: Flagged listing")
  if (trustStatus === "unknown") risks.push("Trust: Unknown verification status")

  return {
    execSummary: "Draft IC memo generated from underwriting.",
    mandateFit: "Mandate details not captured. Clarify budget, areas, and risk tolerance.",
    numbers: (uw["scenarios"] ?? {}) as Record<string, unknown>,
    evidence: { comps },
    assumptions,
    risks: risks.length ? risks : ["No explicit risks captured."],
    recommendation: "Review and confirm assumptions; collect missing evidence before sharing.",
    trust: { status: trustStatus, reason: trustReason },
    confidence: { level: confidence, explanation: `Confidence derived from ${comps.length} comps.` },
  }
}

function handleError(err: unknown) {
  if (err instanceof AccessError) {
    return NextResponse.json({ error: err.message }, { status: err.status })
  }
  return NextResponse.json({ error: "Internal error" }, { status: 500 })
}

