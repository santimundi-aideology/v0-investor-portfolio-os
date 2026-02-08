import { NextResponse } from "next/server"
import OpenAI from "openai"

import { aiAgents, type AIAgentId } from "@/lib/ai/agents"
import { buildAIContext, buildPageContext, buildMarketContextAsync } from "@/lib/ai/context"
import { buildMarketContext, buildAreaMarketIntelligence } from "@/lib/ai/market-context"
import { buildMemoContext } from "@/lib/ai/memo-context"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { getMemoById } from "@/lib/db/memos"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError } from "@/lib/security/rbac"
import { answerQualifiedInventory } from "@/lib/ai/realtor-actions"
import { AGENT_TOOLS } from "@/lib/ai/tools/opportunity-tools"
import { executeOpportunityTool, type ToolExecutionContext } from "@/lib/ai/tools/opportunity-executor"
import type { Investor } from "@/lib/types"
import { recordUsage } from "@/lib/ai/monitoring/token-monitor"

type ChatMessage = { role: "system" | "user" | "assistant"; content: string }

/**
 * Backwards-compatible body:
 * - Old mock payload: { agentId?, mode?, context?, messages? }
 * - New chat payload: { agentId, messages, pagePath?, scopedInvestorId?, propertyId?, tenantId? }
 */
type MemoContextPayload = {
  execSummary?: string
  assumptions?: string[]
  scenarios?: Record<string, unknown>
  comps?: unknown[]
  trustStatus?: "verified" | "unknown" | "flagged"
  trustReason?: string
  version?: number
}

type ChatBody = {
  agentId?: AIAgentId | string
  mode?: "rewrite" | "concise" | "bullet" | "expand" | "polish"
  context?: Record<string, unknown>
  messages?: { role: string; content: string }[]
  pagePath?: string
  scopedInvestorId?: string
  propertyId?: string
  tenantId?: string
  memoId?: string
  memoContext?: MemoContextPayload
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function isUuid(value: string | undefined | null): value is string {
  if (!value) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

async function resolveTenantAndInvestorIds(input: {
  tenantId?: string
  investorId?: string
}): Promise<{ tenantId: string; investorId: string }> {
  const supabase = getSupabaseAdminClient()

  // Tenant
  let tenantId =
    (isUuid(input.tenantId) && input.tenantId) ||
    (isUuid(process.env.DEMO_TENANT_ID) && process.env.DEMO_TENANT_ID) ||
    null

  if (!tenantId) {
    const { data: demoTenant, error: demoTenantError } = await supabase
      .from("tenants")
      .select("id")
      .eq("name", "Demo Real Estate Agency")
      .maybeSingle()
    if (demoTenantError) throw demoTenantError
    if (demoTenant?.id) tenantId = demoTenant.id as string
  }

  if (!tenantId) {
    const { data: anyTenant, error: anyTenantError } = await supabase
      .from("tenants")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()
    if (anyTenantError) throw anyTenantError
    if (anyTenant?.id) tenantId = anyTenant.id as string
  }

  if (!tenantId) throw new Error("Unable to resolve tenantId (no tenants found).")

  // Investor
  let investorId =
    (isUuid(input.investorId) && input.investorId) ||
    (isUuid(process.env.DEMO_INVESTOR_ID) && process.env.DEMO_INVESTOR_ID) ||
    null

  if (!investorId) {
    const { data: demoInvestor, error: demoInvestorError } = await supabase
      .from("investors")
      .select("id")
      .eq("email", "mohammed@alrashid.ae")
      .eq("tenant_id", tenantId)
      .maybeSingle()
    if (demoInvestorError) throw demoInvestorError
    if (demoInvestor?.id) investorId = demoInvestor.id as string
  }

  if (!investorId) {
    const { data: anyInvestor, error: anyInvestorError } = await supabase
      .from("investors")
      .select("id")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()
    if (anyInvestorError) throw anyInvestorError
    if (anyInvestor?.id) investorId = anyInvestor.id as string
  }

  if (!investorId) throw new Error("Unable to resolve investorId (no investors found).")

  return { tenantId, investorId }
}

function buildModeInstruction(mode?: ChatBody["mode"]) {
  switch (mode) {
    case "concise":
      return "Rewrite the user message concisely (max ~4 lines)."
    case "bullet":
      return "Rewrite the user message as bullets."
    case "expand":
      return "Expand the user message with helpful context and next steps."
    case "polish":
      return "Polish the user message for clarity and professionalism."
    case "rewrite":
      return "Rewrite the user message."
    default:
      return ""
  }
}

/**
 * Build memo-specific context for the memo_assistant agent
 */
function buildMemoContextText(memoContext: MemoContextPayload | undefined): string {
  if (!memoContext) return ""

  const sections: string[] = []

  sections.push("MEMO CONTENT (for answering investor questions):")
  sections.push("")

  // Trust verification status
  sections.push("TRUST VERIFICATION:")
  const trustStatus = memoContext.trustStatus ?? "unknown"
  const trustLabel =
    trustStatus === "verified"
      ? "VERIFIED - Data has been independently verified"
      : trustStatus === "flagged"
        ? "FLAGGED - Data verification issues identified"
        : "UNKNOWN - Data not yet verified"
  sections.push(`- Status: ${trustLabel}`)
  if (memoContext.trustReason) {
    sections.push(`- Details: ${memoContext.trustReason}`)
  }
  sections.push("")

  // Version
  if (memoContext.version) {
    sections.push(`MEMO VERSION: ${memoContext.version}`)
    sections.push("")
  }

  // Executive summary
  sections.push("EXECUTIVE SUMMARY:")
  if (memoContext.execSummary) {
    sections.push(memoContext.execSummary)
  } else {
    sections.push("- No executive summary provided.")
  }
  sections.push("")

  // Assumptions
  sections.push("ASSUMPTIONS:")
  if (memoContext.assumptions && memoContext.assumptions.length > 0) {
    memoContext.assumptions.forEach((assumption, idx) => {
      sections.push(`${idx + 1}. ${assumption}`)
    })
  } else {
    sections.push("- No assumptions listed.")
  }
  sections.push("")

  // Scenarios
  sections.push("SCENARIOS & KEY NUMBERS:")
  if (memoContext.scenarios && Object.keys(memoContext.scenarios).length > 0) {
    sections.push(JSON.stringify(memoContext.scenarios, null, 2))
  } else {
    sections.push("- No scenarios provided.")
  }
  sections.push("")

  // Comparables
  sections.push("COMPARABLE EVIDENCE:")
  if (memoContext.comps && memoContext.comps.length > 0) {
    sections.push(JSON.stringify(memoContext.comps, null, 2))
  } else {
    sections.push("- No comparables provided.")
  }
  sections.push("")

  sections.push("INSTRUCTIONS:")
  sections.push("- Answer based ONLY on the memo content above.")
  sections.push("- If information is not in the memo, say 'This is not addressed in the current memo.'")
  sections.push("- When trust status is 'flagged' or 'unknown', remind investor to verify data.")
  sections.push("- Help investor understand risks and make an informed decision.")

  return sections.join("\n")
}

async function buildAIResponse(messages: ChatMessage[], systemPrompt: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured")

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini"
  const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ]

  const completion = await openai.chat.completions.create({
    model,
    messages: openaiMessages,
    temperature: 0.4,
    max_tokens: 900,
  })

  return completion.choices[0]?.message?.content?.trim() || "I couldn’t generate a response."
}

export async function POST(req: Request) {
  try {
    // Authenticate via session (cookies) with header-based fallback in dev
    const ctx = await requireAuthContext(req)

    const body = (await req.json().catch(() => null)) as ChatBody | null
    if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })

    const agentId = (body.agentId as AIAgentId) || "real_estate_advisor"
    const agent = aiAgents[agentId]
    if (!agent) return NextResponse.json({ error: "Unknown agentId" }, { status: 400 })

    const { tenantId, investorId } = await resolveTenantAndInvestorIds({
      tenantId: ctx.tenantId || body.tenantId,
      investorId: ctx.investorId || body.scopedInvestorId,
    })

    const lastUserText =
      (body.messages ?? []).slice().reverse().find((m) => (m?.role ?? "") === "user")?.content ??
      (body.messages ?? []).slice(-1)[0]?.content ??
      ""

    // Fast, deterministic actions for common copilot prompts (grounded in Supabase).
    if (/qualified inventory|need qualified inventory|need inventory/i.test(lastUserText)) {
      const content = await answerQualifiedInventory(tenantId)
      return NextResponse.json({
        agentId,
        message: { role: "assistant", content },
      })
    }

    const pageContext = buildPageContext(body.pagePath)
    const aiContext = await buildAIContext({
      investorId,
      tenantId,
      includePortfolio: true,
      includeListings: body.pagePath === "/real-estate",
      includeMarket: agentId !== "market_intelligence", // Skip generic market context for market_intelligence agent
      includeMandate: agentId === "portfolio_advisor", // Include detailed mandate analysis for portfolio_advisor
      propertyId: body.propertyId,
      // Cost control: prefer pre-aggregated summary tables when available
      useSummaryTables: true,
      maxContextChars: 16000, // ~4000 tokens
    })

    // Build specialized market context for market_intelligence agent
    let marketContextText = ""
    if (agentId === "market_intelligence") {
      // Get market signals context
      const marketContext = await buildMarketContext({
        investorId,
        tenantId,
        limit: 15,
      })
      marketContextText = marketContext.contextText
      
      // Also append real DLD market intelligence if investor has preferred areas
      if (marketContext.investorAreas.length > 0) {
        const primaryArea = marketContext.investorAreas[0]
        try {
          const areaIntelligence = await buildAreaMarketIntelligence(tenantId, primaryArea)
          marketContextText += "\n\n" + areaIntelligence
        } catch (err) {
          console.warn("[chat] Failed to fetch area intelligence:", err)
        }
      }
      
      // Add global DLD market overview
      try {
        const globalMarketContext = await buildMarketContextAsync({
          includeComparisons: true,
          includeTrends: true,
        })
        marketContextText += "\n\n" + globalMarketContext
      } catch (err) {
        console.warn("[chat] Failed to fetch global market context:", err)
      }
    }

    // Build memo context for memo_assistant agent
    let memoContextText = ""
    if (agentId === "memo_assistant") {
      if (body.memoContext) {
        // Use provided memo context from frontend
        memoContextText = buildMemoContextText(body.memoContext)
      } else if (body.memoId) {
        // Server-side memo fetch when memoId is provided
        try {
          const memo = await getMemoById(body.memoId)
          if (memo) {
            const memoContextResult = await buildMemoContext({
              memo,
              investorId,
              tenantId,
            })
            memoContextText = memoContextResult.contextText
          }
        } catch (err) {
          console.warn("[chat] Failed to fetch memo context:", err)
        }
      }
    }

    const modeInstruction = buildModeInstruction(body.mode)
    
    // Normalize messages to ChatMessage[] (only user/assistant/system)
    const rawMessages = body.messages ?? []
    const messages: ChatMessage[] = rawMessages
      .filter((m) => m && typeof m.content === "string")
      .map((m) => ({
        role: (m.role === "assistant" || m.role === "system" ? m.role : "user") as ChatMessage["role"],
        content: String(m.content),
      }))

    // ========================================
    // AGENTS WITH FUNCTION CALLING
    // ========================================
    const agentsWithTools = ["opportunity_finder", "portfolio_advisor", "market_intelligence"]
    if (agentsWithTools.includes(agentId)) {
      const agentTools = AGENT_TOOLS[agentId]
      // Get investor for tool execution context
      const supabase = getSupabaseAdminClient()
      const { data: investorData } = await supabase
        .from("investors")
        .select("*")
        .eq("id", investorId)
        .maybeSingle()
      
      const investor: Investor | undefined = investorData ? {
        id: investorData.id,
        name: investorData.name,
        company: investorData.company ?? "",
        email: investorData.email,
        phone: investorData.phone ?? "",
        status: investorData.status ?? "active",
        mandate: investorData.mandate,
        createdAt: investorData.created_at,
        lastContact: investorData.last_contact ?? investorData.created_at,
        totalDeals: investorData.total_deals ?? 0,
        tags: investorData.tags,
      } : undefined

      const toolContext: ToolExecutionContext = {
        investorId,
        investor,
        orgId: tenantId,
      }

      // Get DLD market context for opportunity finder
      let dldMarketContext = ""
      try {
        const mandate = investor?.mandate as Record<string, unknown> | undefined
        const preferredAreas = (mandate?.preferredAreas as string[]) || []
        dldMarketContext = await buildMarketContextAsync({
          areas: preferredAreas.length > 0 ? preferredAreas : undefined,
          includeComparisons: true,
          includeTrends: false, // Keep concise for opportunity finder
        })
      } catch (err) {
        console.warn("[chat] Failed to fetch DLD market context for opportunity finder:", err)
      }

      // Build system prompt based on agent type
      const toolInstructions = agentId === "opportunity_finder"
        ? "You have access to tools to search properties, get market data, and fetch news. Use the tools when the user asks to find properties, compare opportunities, or get market information."
        : agentId === "portfolio_advisor"
          ? "You have access to tools to analyze the portfolio, get holding details, and compare with investor mandate. Use the tools when the user asks about portfolio performance, holdings, or recommendations."
          : "You have access to tools to get market signals, compare areas, and fetch market data. Use the tools when the user asks about market trends, signals, or area comparisons."

      const agentSystemPrompt = `${agent.personaPrompt}

INVESTOR CONTEXT:
${investor?.mandate ? `Mandate: ${JSON.stringify(investor.mandate)}` : "No mandate defined"}
Investor: ${investor?.name ?? "Unknown"} (${investor?.company ?? "Unknown"})

${dldMarketContext ? `MARKET INTELLIGENCE:\n${dldMarketContext}\n` : ""}
${toolInstructions}
Keep responses concise and actionable.`

      // Make OpenAI call with function calling
      const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: "system", content: agentSystemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ]

      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: openaiMessages,
        tools: agentTools,
        tool_choice: "auto",
        temperature: 0.4,
        max_tokens: 1500,
      })

      const assistantMessage = response.choices[0].message

      // Record usage
      if (response.usage) {
        recordUsage("chat", response.usage.prompt_tokens, response.usage.completion_tokens)
      }

      // Handle tool calls if present
      if (assistantMessage.tool_calls?.length) {
        // Execute all tool calls
        const toolResults = await Promise.all(
          assistantMessage.tool_calls.map(async (toolCall) => {
            try {
              // Type assertion needed for OpenAI SDK compatibility
              const tc = toolCall as { id: string; function: { name: string; arguments: string } }
              const args = JSON.parse(tc.function.arguments)
              const result = await executeOpportunityTool(
                tc.function.name,
                args,
                toolContext
              )
              return {
                role: "tool" as const,
                tool_call_id: tc.id,
                content: JSON.stringify(result),
              }
            } catch (error) {
              const tc = toolCall as { id: string; function?: { name?: string } }
              console.error(`[chat] Tool execution failed for ${tc.function?.name ?? "unknown"}:`, error)
              return {
                role: "tool" as const,
                tool_call_id: tc.id,
                content: JSON.stringify({ error: "Tool execution failed" }),
              }
            }
          })
        )

        // Continue conversation with tool results
        const finalResponse = await openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          messages: [
            { role: "system", content: agentSystemPrompt },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            assistantMessage,
            ...toolResults,
          ],
          temperature: 0.4,
          max_tokens: 1500,
        })

        // Record usage for final response
        if (finalResponse.usage) {
          recordUsage("tools", finalResponse.usage.prompt_tokens, finalResponse.usage.completion_tokens)
        }

        return NextResponse.json({
          agentId,
          message: {
            role: "assistant",
            content: finalResponse.choices[0].message.content ?? "I couldn't generate a response.",
          },
        })
      }

      // No tool calls, return direct response
      return NextResponse.json({
        agentId,
        message: {
          role: "assistant",
          content: assistantMessage.content ?? "I couldn't generate a response.",
        },
      })
    }

    // ========================================
    // STANDARD AGENTS: Regular chat
    // ========================================
    const systemPrompt = `${agent.personaPrompt}

PAGE CONTEXT:
${pageContext}

${agentId === "memo_assistant" && memoContextText ? memoContextText : aiContext.contextText}

${marketContextText ? `MARKET SIGNALS DATA:\n${marketContextText}\n` : ""}
${modeInstruction ? `MODE INSTRUCTION:\n${modeInstruction}\n` : ""}`.trim()

    const content = await buildAIResponse(messages, systemPrompt)

    return NextResponse.json({
      agentId,
      message: {
        role: "assistant",
        content,
      },
    })
  } catch (error) {
    // Return proper status codes for auth/access errors
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    console.error("[chat] Error processing request:", error)
    const message = error instanceof Error ? error.message : String(error)
    const extra =
      error && typeof error === "object"
        ? {
            status: "status" in error ? (error as Record<string, unknown>).status : undefined,
            code: "code" in error ? (error as Record<string, unknown>).code : undefined,
            type: "type" in error ? (error as Record<string, unknown>).type : undefined,
          }
        : undefined
    const debug =
      process.env.NODE_ENV !== "production"
        ? {
            name: error instanceof Error ? error.name : "UnknownError",
            message,
            ...extra,
          }
        : undefined
    return NextResponse.json(
      {
        error: "Failed to process chat request",
        ...(process.env.NODE_ENV !== "production" ? { detail: message, debug } : null),
      },
      { status: 500 },
    )
  }
}

