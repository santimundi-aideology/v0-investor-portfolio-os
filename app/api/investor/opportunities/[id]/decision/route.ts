import { NextResponse } from "next/server"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError } from "@/lib/security/rbac"
import {
  getOpportunityById,
  updateOpportunityDecision,
  type OpportunityStatus,
  type InvestorDecision,
} from "@/lib/db/opportunities"
import { getInvestorById } from "@/lib/db/investors"
import { assertInvestorAccess } from "@/lib/security/rbac"

const LEGACY_DECISIONS: InvestorDecision[] = [
  "pending",
  "interested",
  "very_interested",
  "not_interested",
]
const VALID_ACTIONS = ["interested", "not_now", "pass"] as const
type DecisionAction = (typeof VALID_ACTIONS)[number]

const TERMINAL_STATUSES: OpportunityStatus[] = ["acquired", "expired"]

function resolveStatusForDecision(
  currentStatus: OpportunityStatus,
  decision: InvestorDecision
): { ok: true; nextStatus?: OpportunityStatus } | { ok: false; error: string } {
  if (TERMINAL_STATUSES.includes(currentStatus)) {
    return {
      ok: false,
      error: `Cannot update decision for opportunity in ${currentStatus} status`,
    }
  }

  if (currentStatus === "rejected" && decision !== "not_interested") {
    return {
      ok: false,
      error:
        "Cannot set decision to interested/pending after rejection. Ask your advisor to re-share the opportunity.",
    }
  }

  if (decision === "not_interested") {
    return { ok: true, nextStatus: "rejected" }
  }

  if ((decision === "interested" || decision === "very_interested") && currentStatus === "recommended") {
    return { ok: true, nextStatus: "shortlisted" }
  }

  return { ok: true }
}

function mapIncomingDecision(input: string): InvestorDecision | null {
  if ((VALID_ACTIONS as readonly string[]).includes(input)) {
    const action = input as DecisionAction
    if (action === "pass") return "not_interested"
    if (action === "not_now") return "pending"
    return "interested"
  }
  if ((LEGACY_DECISIONS as readonly string[]).includes(input)) {
    if (input === "very_interested") return "interested"
    return input as InvestorDecision
  }
  return null
}

/**
 * PATCH /api/investor/opportunities/[id]/decision
 * Update investor decision on an opportunity.
 * Body: { decision: InvestorDecision, note?: string }
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuthContext(req)
    const { id } = await params

    // Verify the opportunity exists and caller has access to its investor scope
    const opportunity = await getOpportunityById(id)
    if (!opportunity) {
      return NextResponse.json(
        { error: "Opportunity not found" },
        { status: 404 }
      )
    }

    const investor = await getInvestorById(opportunity.investorId)
    if (!investor) {
      return NextResponse.json({ error: "Investor not found" }, { status: 404 })
    }
    assertInvestorAccess(investor, ctx)

    const body = await req.json()
    const { decision, note } = body as {
      decision?: string
      note?: string
    }

    const mappedDecision = decision ? mapIncomingDecision(decision) : null
    if (!mappedDecision) {
      return NextResponse.json(
        {
          error: `Invalid decision. Must be one of: ${VALID_ACTIONS.join(", ")}`,
        },
        { status: 400 }
      )
    }

    const transition = resolveStatusForDecision(
      opportunity.status,
      mappedDecision
    )
    if (!transition.ok) {
      return NextResponse.json({ error: transition.error }, { status: 400 })
    }

    const updated = await updateOpportunityDecision(
      id,
      mappedDecision,
      { note, status: transition.nextStatus }
    )

    if (!updated) {
      return NextResponse.json(
        { error: "Failed to update decision" },
        { status: 500 }
      )
    }

    return NextResponse.json({ opportunity: updated })
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[investor/opportunities/decision] Error:", err)
    return NextResponse.json(
      { error: "Failed to update decision" },
      { status: 500 }
    )
  }
}
