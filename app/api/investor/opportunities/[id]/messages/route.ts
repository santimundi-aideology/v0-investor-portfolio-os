import { NextResponse } from "next/server"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError } from "@/lib/security/rbac"
import {
  getOpportunityById,
  getOpportunityMessages,
  createOpportunityMessage,
} from "@/lib/db/opportunities"
import { getInvestorById } from "@/lib/db/investors"
import { assertInvestorAccess } from "@/lib/security/rbac"

/**
 * GET /api/investor/opportunities/[id]/messages
 * Returns the conversation thread for an opportunity.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuthContext(req)
    const { id } = await params

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

    const messages = await getOpportunityMessages(id)

    return NextResponse.json({ messages })
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[opportunity/messages] Error:", err)
    return NextResponse.json(
      { error: "Failed to load messages" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/investor/opportunities/[id]/messages
 * Send a message in an opportunity thread.
 * Body: { body: string }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuthContext(req)
    const { id } = await params

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
    const { body: messageBody } = body as { body?: string }

    if (!messageBody?.trim()) {
      return NextResponse.json(
        { error: "Message body is required" },
        { status: 400 }
      )
    }

    const senderRole =
      ctx.role === "investor" ? "investor" : "agent"

    const message = await createOpportunityMessage({
      tenantId: opportunity.tenantId,
      opportunityId: id,
      senderId: ctx.userId,
      senderRole: senderRole as "investor" | "agent",
      body: messageBody.trim(),
    })

    if (!message) {
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      )
    }

    return NextResponse.json({ message }, { status: 201 })
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[opportunity/messages] Error:", err)
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    )
  }
}
