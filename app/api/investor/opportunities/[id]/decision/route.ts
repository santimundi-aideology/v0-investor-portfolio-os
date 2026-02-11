import { NextResponse } from "next/server"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError } from "@/lib/security/rbac"
import {
  getOpportunityById,
  updateOpportunityDecision,
  type InvestorDecision,
} from "@/lib/db/opportunities"
import { getInvestorById } from "@/lib/db/investors"
import { assertInvestorAccess } from "@/lib/security/rbac"

const VALID_DECISIONS: InvestorDecision[] = [
  "pending",
  "interested",
  "very_interested",
  "not_interested",
]

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

    if (!decision || !VALID_DECISIONS.includes(decision as InvestorDecision)) {
      return NextResponse.json(
        {
          error: `Invalid decision. Must be one of: ${VALID_DECISIONS.join(", ")}`,
        },
        { status: 400 }
      )
    }

    const updated = await updateOpportunityDecision(
      id,
      decision as InvestorDecision,
      note
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
