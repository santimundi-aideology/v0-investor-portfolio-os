import { NextResponse } from "next/server"
import OpenAI from "openai"

import { aiAgents, type AIAgentId } from "@/lib/ai/agents"
import { buildAIContext, buildPageContext } from "@/lib/ai/context"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { answerQualifiedInventory } from "@/lib/ai/realtor-actions"

type ChatMessage = { role: "system" | "user" | "assistant"; content: string }

/**
 * Backwards-compatible body:
 * - Old mock payload: { agentId?, mode?, context?, messages? }
 * - New chat payload: { agentId, messages, pagePath?, scopedInvestorId?, propertyId?, tenantId? }
 */
type ChatBody = {
  agentId?: AIAgentId | string
  mode?: "rewrite" | "concise" | "bullet" | "expand" | "polish"
  context?: Record<string, unknown>
  messages?: { role: string; content: string }[]
  pagePath?: string
  scopedInvestorId?: string
  propertyId?: string
  tenantId?: string
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
    const body = (await req.json().catch(() => null)) as ChatBody | null
    if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })

    const agentId = (body.agentId as AIAgentId) || "real_estate_advisor"
    const agent = aiAgents[agentId]
    if (!agent) return NextResponse.json({ error: "Unknown agentId" }, { status: 400 })

    const { tenantId, investorId } = await resolveTenantAndInvestorIds({
      tenantId: body.tenantId,
      investorId: body.scopedInvestorId,
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
      includeMarket: true,
      propertyId: body.propertyId,
    })

    const modeInstruction = buildModeInstruction(body.mode)
    const systemPrompt = `${agent.personaPrompt}

PAGE CONTEXT:
${pageContext}

${aiContext.contextText}

${modeInstruction ? `MODE INSTRUCTION:\n${modeInstruction}\n` : ""}`.trim()

    // Normalize messages to ChatMessage[] (only user/assistant/system)
    const rawMessages = body.messages ?? []
    const messages: ChatMessage[] = rawMessages
      .filter((m) => m && typeof m.content === "string")
      .map((m) => ({
        role: (m.role === "assistant" || m.role === "system" ? m.role : "user") as ChatMessage["role"],
        content: String(m.content),
      }))

    const content = await buildAIResponse(messages, systemPrompt)

    return NextResponse.json({
      agentId,
      message: {
        role: "assistant",
        content,
      },
    })
  } catch (error) {
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

