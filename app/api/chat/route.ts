import { NextResponse } from "next/server"
import OpenAI from "openai"

import { aiAgents, type AIAgentId } from "@/lib/ai/agents"
import { buildAIContext, buildPageContext } from "@/lib/ai/context"

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

    // Default to demo tenant if not provided
    const tenantId = body.tenantId ?? "default-tenant-id"
    const investorId = body.scopedInvestorId ?? "default-investor-id"
    
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
    return NextResponse.json(
      { error: "Failed to process chat request" },
      { status: 500 }
    )
  }
}
