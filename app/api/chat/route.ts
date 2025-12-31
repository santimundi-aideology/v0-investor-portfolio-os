import { NextResponse } from "next/server"
import OpenAI from "openai"

import { aiAgents, type AIAgentId } from "@/lib/ai/agents"
import { buildAIContext, buildPageContext } from "@/lib/ai/context"
import { getSupabaseAdminClient } from "@/lib/db/client"

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

type ChatMessage = { role: "system" | "user" | "assistant"; content: string }

type ChatRequest = {
  agentId: AIAgentId
  messages: ChatMessage[]
  pagePath?: string
  scopedInvestorId?: string
  propertyId?: string
  tenantId?: string
}

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
    // Prefer demo investor if seeded
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
    // Otherwise pick first investor in tenant
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

/**
 * Build AI response using OpenAI with real Supabase data as context
 */
async function buildAIResponse(
  messages: ChatMessage[],
  systemPrompt: string,
): Promise<string> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured")
    }

    // Convert messages to OpenAI format
    const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
    ]

    // Call OpenAI with streaming disabled for simpler implementation
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Fast and cost-effective
      messages: openaiMessages,
      temperature: 0.7,
      max_tokens: 1000,
    })

    const response = completion.choices[0]?.message?.content || "I apologize, but I couldn't generate a response."
    return response
  } catch (error) {
    console.error("[chat] OpenAI error:", error)
    throw error
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ChatRequest
    const agent = aiAgents[body.agentId]
    
    if (!agent) {
      return NextResponse.json({ error: "Unknown agentId" }, { status: 400 })
    }

    const { tenantId, investorId } = await resolveTenantAndInvestorIds({
      tenantId: body.tenantId,
      investorId: body.scopedInvestorId,
    })
    
    // Build AI context from Supabase
    const aiContext = await buildAIContext({
      investorId,
      tenantId,
      includePortfolio: true,
      includeListings: body.pagePath === "/real-estate",
      includeMarket: true,
      propertyId: body.propertyId,
    })

    // Build page-specific context
    const pageContext = buildPageContext(body.pagePath)

    // Construct system prompt with real data
    let systemPrompt = agent.personaPrompt
    if (body.agentId === "real_estate_advisor") {
      systemPrompt = `${agent.personaPrompt}

PAGE CONTEXT:
${pageContext}

${aiContext.contextText}`
    }

    // Generate AI response using OpenAI with real Supabase context
    const content = await buildAIResponse(body.messages, systemPrompt)

    return NextResponse.json({
      agentId: body.agentId,
      systemPrompt,
      message: { role: "assistant", content },
    })
  } catch (error) {
    console.error("[chat] Error processing request:", error)
    const message = error instanceof Error ? error.message : String(error)
    const debug =
      process.env.NODE_ENV !== "production"
        ? {
            name: error instanceof Error ? error.name : "UnknownError",
            message,
            // Some SDK errors carry these fields (safe to ignore when absent)
            ...(typeof error === "object" && error !== null
              ? {
                  // @ts-expect-error best-effort debug serialization
                  status: (error as any).status,
                  // @ts-expect-error best-effort debug serialization
                  code: (error as any).code,
                  // @ts-expect-error best-effort debug serialization
                  type: (error as any).type,
                }
              : null),
          }
        : null
    return NextResponse.json(
      {
        error: "Failed to process chat request",
        ...(process.env.NODE_ENV !== "production" ? { detail: message, debug } : null),
      },
      { status: 500 }
    )
  }
}
