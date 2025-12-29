import { NextResponse } from "next/server"

import { aiAgents, type AIAgentId } from "@/lib/ai/agents"
import { getPortfolioSummary, getHoldingProperty, calcYieldPct, getOpportunitiesForInvestor, mockMarketData } from "@/lib/real-estate"

type ChatMessage = { role: "system" | "user" | "assistant"; content: string }

type ChatRequest = {
  agentId: AIAgentId
  messages: ChatMessage[]
  pagePath?: string
  scopedInvestorId?: string
  propertyId?: string
}

function pageContextFor(path?: string) {
  if (!path) return ""
  const map: Record<string, string> = {
    "/properties": "User can see their property portfolio, rental income, property values, and market performance.",
    "/real-estate": "User is viewing real estate listings, market analysis, and investment opportunities.",
  }
  return map[path] ?? ""
}

function buildRealEstateContext(investorId: string) {
  const summary = getPortfolioSummary(investorId)
  const totalPortfolioValue = Math.round(summary.totalPortfolioValue)
  const averageYield = Number(summary.avgYieldPct.toFixed(2))
  const totalMonthlyRental = Math.round(summary.totalMonthlyRental)
  const occupancyRate = Number(summary.occupancyPct.toFixed(1))

  const properties = summary.holdings
    .map((h) => {
      const p = getHoldingProperty(h)
      return {
        address: p?.address ?? p?.title ?? h.propertyId,
        property_type: p?.type ?? "unknown",
        current_value: h.currentValue,
        yield: calcYieldPct(h),
        location: p?.area ?? "unknown",
      }
    })
    .filter(Boolean)

  const marketTrends = "Dubai prime assets show resilient demand; yields remain attractive vs global benchmarks."
  const comparableProperties = "Comparable cap rates: 8.5–10.5% depending on location and asset quality."
  const locationInsights = mockMarketData
    .slice(0, 3)
    .map((m) => `- ${m.location}: avg yield ${m.avgYieldPct}%, occupancy ${m.occupancyPct}%, YoY appreciation ${m.avgYoYAppreciationPct}%`)
    .join("\n")

  const realEstateContext = `USER'S REAL ESTATE PORTFOLIO:
- Total Properties: ${summary.propertyCount}
- Total Portfolio Value: ${totalPortfolioValue}
- Average Rental Yield: ${averageYield}%
- Total Monthly Rental Income: ${totalMonthlyRental}
- Occupancy Rate: ${occupancyRate}%

PROPERTY BREAKDOWN:
${properties
  .map(
    (p) => `- ${p.address}: ${p.property_type}, Location: ${p.location}, Value: ${Math.round(p.current_value)}, Yield: ${p.yield.toFixed(2)}%`,
  )
  .join("\n")}

MARKET CONTEXT:
- Market trends: ${marketTrends}
- Comparable properties: ${comparableProperties}
- Location insights:
${locationInsights}

INSTRUCTIONS:
- Analyze property performance and suggest optimizations
- Compare user's properties to market benchmarks
- Provide location-specific market insights
- Recommend properties based on user's goals and risk profile
- Calculate and explain ROI, yield, and appreciation potential
- Consider investment strategies (hold/sell/reinvest)`

  return { summary, realEstateContext }
}

function mockAdvisorResponse(userText: string, investorId: string) {
  const summary = getPortfolioSummary(investorId)
  const opportunities = getOpportunitiesForInvestor(investorId)

  const byYield = [...summary.holdings]
    .map((h) => ({ h, y: calcYieldPct(h) }))
    .sort((a, b) => b.y - a.y)
    .slice(0, 2)

  const lines: string[] = []
  lines.push("Here’s a portfolio readout based on your current holdings:")
  lines.push(
    `- Portfolio value: AED ${Math.round(summary.totalPortfolioValue).toLocaleString()} (appreciation ${summary.appreciationPct.toFixed(1)}%)`,
  )
  lines.push(`- Avg net yield: ${summary.avgYieldPct.toFixed(2)}% • Occupancy: ${summary.occupancyPct.toFixed(1)}%`)
  lines.push(`- Monthly rent (effective): AED ${Math.round(summary.totalMonthlyRental).toLocaleString()}`)

  const q = userText.toLowerCase()
  if (q.includes("yield") || q.includes("rent")) {
    lines.push("")
    lines.push("Top yield contributors:")
    for (const { h, y } of byYield) {
      const p = getHoldingProperty(h)
      lines.push(`- ${p?.title ?? h.propertyId} (${p?.area ?? "—"}): net yield ~${y.toFixed(2)}%`)
    }
  }

  if (q.includes("opportun") || q.includes("suggest") || q.includes("buy") || q.includes("invest")) {
    lines.push("")
    lines.push("Opportunities I’d prioritize next (aligned with your areas/mandate):")
    for (const opp of opportunities) {
      lines.push(`- ${opp.propertyId} (score ${opp.score}): ${opp.reasons.join(", ")}`)
    }
    lines.push("If you tell me your target ticket size + hold horizon, I’ll narrow to 1–2 best fits.")
  }

  if (q.includes("sell") || q.includes("exit")) {
    lines.push("")
    lines.push("Sell vs hold framework:")
    lines.push("- Sell if: price has outrun rent growth OR cap rate compresses below your hurdle.")
    lines.push("- Hold if: occupancy is stable and you can re-price rents on renewal within 6–12 months.")
    lines.push("Share which asset you mean (title/location) and I’ll give a specific recommendation.")
  }

  return lines.join("\n")
}

export async function POST(req: Request) {
  const body = (await req.json()) as ChatRequest
  const agent = aiAgents[body.agentId]
  if (!agent) return NextResponse.json({ error: "Unknown agentId" }, { status: 400 })

  const investorId = body.scopedInvestorId ?? "inv-1"
  const pageContext = pageContextFor(body.pagePath)

  let systemPrompt = agent.personaPrompt
  if (body.agentId === "real_estate_advisor") {
    const { realEstateContext } = buildRealEstateContext(investorId)
    systemPrompt = `${agent.personaPrompt}\n\nPAGE CONTEXT:\n${pageContext}\n\n${realEstateContext}`
  }

  const lastUser = [...body.messages].reverse().find((m) => m.role === "user")?.content ?? ""
  const content = mockAdvisorResponse(lastUser, investorId)

  return NextResponse.json({
    agentId: body.agentId,
    systemPrompt,
    message: { role: "assistant", content },
  })
}


