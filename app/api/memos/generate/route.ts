import { createHash } from "crypto"
import { NextResponse } from "next/server"

import { AuditEvents, createAuditEventWriter } from "@/lib/audit"
import { createMemo } from "@/lib/db/memo-ops"
import { getInvestorById } from "@/lib/db/investors"
import { getUnderwritingById } from "@/lib/db/underwritings"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { computeConfidence, evidenceWarnings } from "@/lib/domain/underwriting"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError, assertInvestorAccess } from "@/lib/security/rbac"

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthContext(req)
    if (ctx.role !== "agent" && ctx.role !== "super_admin") throw new AccessError("Only agents can generate memos")

    const body = await req.json()
    const { investorId, listingId, underwritingId } = body
    if (!investorId || !listingId || !underwritingId) throw new AccessError("investorId, listingId, underwritingId are required")

    const investor = await getInvestorById(investorId)
    if (!investor) throw new AccessError("Investor not found")
    assertInvestorAccess(investor, ctx)

    const uw = await getUnderwritingById(underwritingId)
    if (!uw) throw new AccessError("Underwriting not found")
    if (uw.listingId !== listingId) throw new AccessError("Underwriting must be linked to listing")

    const supabase = getSupabaseAdminClient()
    const { data: compsData } = await supabase
      .from("underwriting_comps")
      .select("*")
      .eq("underwriting_id", uw.id)
    const comps = compsData ?? []
    const { data: trustRow } = await supabase
      .from("trust")
      .select("*")
      .eq("listing_id", listingId)
      .maybeSingle()
    const trust = trustRow
    const warnings = evidenceWarnings(comps)
    const confidence = computeConfidence(comps.map((c: Record<string, unknown>) => ({ observedDate: c.observed_date as string })), uw.inputs as Record<string, unknown>)

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

    const tenantId = investor.tenantId
    const write = createAuditEventWriter()
    await write(
      AuditEvents.aiGenerationRequested({
        tenantId,
        actorId: ctx.userId,
        role: ctx.role,
        feature: "memo.generate",
        inputHash,
      }),
    )

    const memo = await createMemo({
      investorId,
      listingId,
      underwritingId,
      content,
      createdBy: ctx.userId,
    })

    await write(
      AuditEvents.memoCreated({
        tenantId,
        actorId: ctx.userId,
        role: ctx.role,
        memoId: memo.id,
      }),
    )
    await write(
      AuditEvents.aiOutputAccepted({
        tenantId,
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

