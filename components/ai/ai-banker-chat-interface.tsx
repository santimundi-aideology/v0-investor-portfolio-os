"use client"

/**
 * AI Banker chat dialog shown in realtor flows.
 * The file had multiple duplicate copies; reduced to a single export.
 */

import * as React from "react"
import { Building2, TrendingUp, FileText, Radar, Search } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import type { AIAgentId } from "@/lib/ai/agents"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea, ScrollAreaViewport, ScrollBar } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import type { ChatActionBlock } from "@/components/ai/chat-action-types"
import { ChatActionRenderer } from "@/components/ai/chat-action-renderer"
import type { MemoContextPayload } from "@/components/ai/ask-ai-banker-widget"

type Theme = {
  icon: React.ComponentType<{ className?: string }>
  accent: string
  accentMuted: string
  gradientFrom: string
  gradientTo: string
  badgeBg: string
  badgeText: string
  placeholder: string
  pulseColor: string
  iconGradient: string
}

export const agentThemes: Record<AIAgentId, Theme> = {
  real_estate_advisor: {
    icon: Building2,
    accent: "#10b981",
    accentMuted: "rgba(16, 185, 129, 0.1)",
    gradientFrom: "rgba(16, 185, 129, 0.05)",
    gradientTo: "rgba(16, 185, 129, 0.15)",
    badgeBg: "rgba(16, 185, 129, 0.1)",
    badgeText: "#10b981",
    placeholder: "Ask about properties, market trends, ROI...",
    pulseColor: "#10b981",
    iconGradient: "from-emerald-500 to-teal-600",
  },
  portfolio_advisor: {
    icon: TrendingUp,
    accent: "#16a34a",
    accentMuted: "rgba(22, 163, 74, 0.1)",
    gradientFrom: "rgba(22, 163, 74, 0.05)",
    gradientTo: "rgba(202, 138, 4, 0.12)",
    badgeBg: "rgba(202, 138, 4, 0.15)",
    badgeText: "#ca8a04",
    placeholder: "Ask about portfolio performance, yields, diversification...",
    pulseColor: "#16a34a",
    iconGradient: "from-green-600 to-amber-500",
  },
  market_intelligence: {
    icon: Radar,
    accent: "#8b5cf6",
    accentMuted: "rgba(139, 92, 246, 0.1)",
    gradientFrom: "rgba(139, 92, 246, 0.05)",
    gradientTo: "rgba(139, 92, 246, 0.15)",
    badgeBg: "rgba(139, 92, 246, 0.1)",
    badgeText: "#8b5cf6",
    placeholder: "Ask about market signals, trends, area analysis...",
    pulseColor: "#8b5cf6",
    iconGradient: "from-violet-500 to-purple-600",
  },
  memo_assistant: {
    icon: FileText,
    accent: "#0ea5e9",
    accentMuted: "rgba(14, 165, 233, 0.1)",
    gradientFrom: "rgba(14, 165, 233, 0.05)",
    gradientTo: "rgba(14, 165, 233, 0.15)",
    badgeBg: "rgba(14, 165, 233, 0.1)",
    badgeText: "#0ea5e9",
    placeholder: "Ask about assumptions, scenarios, risks...",
    pulseColor: "#0ea5e9",
    iconGradient: "from-sky-500 to-blue-600",
  },
  opportunity_finder: {
    icon: Search,
    accent: "#16a34a",
    accentMuted: "rgba(22, 163, 74, 0.1)",
    gradientFrom: "rgba(22, 163, 74, 0.05)",
    gradientTo: "rgba(245, 158, 11, 0.12)",
    badgeBg: "rgba(245, 158, 11, 0.15)",
    badgeText: "#f59e0b",
    placeholder: "Find properties, compare opportunities, get market insights...",
    pulseColor: "#16a34a",
    iconGradient: "from-green-600 to-amber-500",
  },
}

type ChatMessage = { role: "user" | "assistant"; content: string }

function extractActionBlock(raw: string): { text: string; block: ChatActionBlock | null } {
  const re = /```action\s*([\s\S]*?)```/m
  const m = raw.match(re)
  if (!m) return { text: raw, block: null }
  const jsonText = (m[1] ?? "").trim()
  try {
    const parsed = JSON.parse(jsonText) as ChatActionBlock
    const cleaned = raw.replace(re, "").trim()
    return { text: cleaned, block: parsed }
  } catch {
    return { text: raw, block: null }
  }
}

export function AIBankerChatInterface({
  open,
  onOpenChange,
  agentId,
  title,
  description,
  suggestedQuestions = [],
  pagePath,
  scopedInvestorId,
  propertyId,
  memoContext,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  agentId: AIAgentId
  title: string
  description?: string
  suggestedQuestions?: string[]
  pagePath?: string
  scopedInvestorId?: string
  propertyId?: string
  memoContext?: MemoContextPayload
}) {
  const theme = agentThemes[agentId]
  const Icon = theme.icon
  const [input, setInput] = React.useState("")
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Ask me about portfolio performance, rental yield, appreciation, or what to do next.",
    },
  ])
  const [loading, setLoading] = React.useState(false)

  const send = React.useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      setMessages((prev) => [...prev, { role: "user", content: trimmed }])
      setLoading(true)
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId,
            pagePath,
            scopedInvestorId,
            propertyId,
            messages: [{ role: "user", content: trimmed }],
            // Include memo context for memo_assistant agent
            ...(agentId === "memo_assistant" && memoContext ? { memoContext } : {}),
          }),
        })
        const json = await res.json().catch(() => null)
        if (!res.ok) {
          const err = (json && (json.detail || json.error)) || `Request failed (${res.status})`
          setMessages((prev) => [...prev, { role: "assistant", content: String(err) }])
          return
        }

        const reply = json?.message?.content ?? "I couldn’t generate a response."
        setMessages((prev) => [...prev, { role: "assistant", content: String(reply) }])
      } finally {
        setLoading(false)
      }
    },
    [agentId, pagePath, propertyId, scopedInvestorId, memoContext],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 !w-[92vw] !max-w-[92vw] sm:!max-w-[92vw] h-[90vh] max-h-[90vh] overflow-hidden"
      >
        <DialogHeader
          className="border-b px-5 py-4"
          style={{
            background: `linear-gradient(180deg, ${theme.gradientFrom}, ${theme.gradientTo})`,
          }}
        >
          <DialogTitle className="flex items-center gap-2">
            <span className={cn("inline-flex size-8 items-center justify-center rounded-md bg-gradient-to-br text-white", theme.iconGradient)}>
              <Icon className="size-4" />
            </span>
            <span>{title}</span>
            <Badge style={{ backgroundColor: theme.badgeBg, color: theme.badgeText }} className="ml-2">
              Advisor
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-gray-500">
            {description ?? "Insights and recommendations tailored to your real estate portfolio."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-0 sm:grid-cols-[1fr_340px]">
          <div className="border-b sm:border-b-0 sm:border-r">
            <ScrollArea className="h-[78vh] min-h-[520px] max-h-[820px]">
              <ScrollAreaViewport className="p-4">
                <div className="space-y-3">
                  {messages.map((m, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "max-w-[92%] rounded-lg border p-3 text-xs leading-relaxed",
                        m.role === "user" ? "ml-auto bg-gray-100" : "mr-auto bg-white",
                      )}
                    >
                      {(() => {
                        const { text, block } = extractActionBlock(m.content)
  return (
                          <div
                      className={cn(
                              "prose max-w-none dark:prose-invert",
                              // Keep markdown compact (avoid huge H1/H2 when model uses headings)
                              "prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0",
                              "prose-headings:my-2 prose-h1:text-base prose-h2:text-sm prose-h3:text-xs",
                              "prose-table:text-xs prose-th:py-1 prose-td:py-1",
                              "prose-strong:font-semibold",
                            )}
                          >
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
                            {block ? <ChatActionRenderer block={block} /> : null}
                          </div>
                        )
                      })()}
                    </div>
                  ))}
                  {loading ? (
                    <div className="mr-auto max-w-[90%] rounded-lg border border-gray-100 p-3 text-sm text-gray-500">
                      Thinking…
                    </div>
                  ) : null}
                </div>
              </ScrollAreaViewport>
              <ScrollBar />
            </ScrollArea>

            <div className="flex gap-2 border-t p-4">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={theme.placeholder}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    const text = input
                    setInput("")
                    void send(text)
                  }
                }}
              />
              <Button
                onClick={() => {
                  const text = input
                  setInput("")
                  void send(text)
                }}
                disabled={loading}
                style={{ backgroundColor: theme.accent }}
              >
                Ask
              </Button>
            </div>
          </div>

          <div className="p-4">
            <div className="text-sm font-medium">Suggested questions</div>
            <div className="mt-3 space-y-2">
              {suggestedQuestions.map((q) => (
                <Button
                  key={q}
                  variant="outline"
                  className="w-full justify-start text-left whitespace-normal h-auto"
                  onClick={() => void send(q)}
                  disabled={loading}
                >
                  {q}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AIBankerChatInterface


