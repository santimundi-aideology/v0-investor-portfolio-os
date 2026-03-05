"use client"

import * as React from "react"
import {
  Building2, TrendingUp, FileText, Radar, Search, Calculator,
  Users, Shield, ClipboardCheck, BarChart3, Home, LineChart,
  SendHorizonal, Sparkles,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import type { AIAgentId } from "@/lib/ai/agents"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea, ScrollAreaViewport, ScrollBar } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
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
    placeholder: "Ask about properties, market trends, ROI…",
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
    placeholder: "Ask about portfolio performance, yields, diversification…",
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
    placeholder: "Ask about market signals, trends, area analysis…",
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
    placeholder: "Ask about assumptions, scenarios, risks…",
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
    placeholder: "Find properties, compare opportunities, get market insights…",
    pulseColor: "#16a34a",
    iconGradient: "from-green-600 to-amber-500",
  },
  valuation_sense_check: {
    icon: Calculator,
    accent: "#ea580c",
    accentMuted: "rgba(234, 88, 12, 0.1)",
    gradientFrom: "rgba(234, 88, 12, 0.05)",
    gradientTo: "rgba(234, 88, 12, 0.15)",
    badgeBg: "rgba(234, 88, 12, 0.1)",
    badgeText: "#ea580c",
    placeholder: "Check valuations, pricing, offers…",
    pulseColor: "#ea580c",
    iconGradient: "from-orange-500 to-orange-600",
  },
  investor_matching: {
    icon: Users,
    accent: "#4f46e5",
    accentMuted: "rgba(79, 70, 229, 0.1)",
    gradientFrom: "rgba(79, 70, 229, 0.05)",
    gradientTo: "rgba(79, 70, 229, 0.15)",
    badgeBg: "rgba(79, 70, 229, 0.1)",
    badgeText: "#4f46e5",
    placeholder: "Match properties to investors, route deals…",
    pulseColor: "#4f46e5",
    iconGradient: "from-indigo-500 to-indigo-600",
  },
  risk_assessment: {
    icon: Shield,
    accent: "#dc2626",
    accentMuted: "rgba(220, 38, 38, 0.1)",
    gradientFrom: "rgba(220, 38, 38, 0.05)",
    gradientTo: "rgba(220, 38, 38, 0.15)",
    badgeBg: "rgba(220, 38, 38, 0.1)",
    badgeText: "#dc2626",
    placeholder: "Assess risks, stress test deals, check concentration…",
    pulseColor: "#dc2626",
    iconGradient: "from-red-500 to-red-600",
  },
  due_diligence: {
    icon: ClipboardCheck,
    accent: "#d97706",
    accentMuted: "rgba(217, 119, 6, 0.1)",
    gradientFrom: "rgba(217, 119, 6, 0.05)",
    gradientTo: "rgba(217, 119, 6, 0.15)",
    badgeBg: "rgba(217, 119, 6, 0.1)",
    badgeText: "#d97706",
    placeholder: "Generate DD checklists, verify data, track progress…",
    pulseColor: "#d97706",
    iconGradient: "from-amber-500 to-amber-600",
  },
  cma_analyst: {
    icon: BarChart3,
    accent: "#0891b2",
    accentMuted: "rgba(8, 145, 178, 0.1)",
    gradientFrom: "rgba(8, 145, 178, 0.05)",
    gradientTo: "rgba(8, 145, 178, 0.15)",
    badgeBg: "rgba(8, 145, 178, 0.1)",
    badgeText: "#0891b2",
    placeholder: "Generate CMAs, find comps, calculate valuations…",
    pulseColor: "#0891b2",
    iconGradient: "from-cyan-500 to-cyan-600",
  },
  rental_optimizer: {
    icon: Home,
    accent: "#16a34a",
    accentMuted: "rgba(22, 163, 74, 0.1)",
    gradientFrom: "rgba(22, 163, 74, 0.05)",
    gradientTo: "rgba(22, 163, 74, 0.15)",
    badgeBg: "rgba(22, 163, 74, 0.1)",
    badgeText: "#16a34a",
    placeholder: "Optimize rents, reduce vacancy, analyze furnishing ROI…",
    pulseColor: "#16a34a",
    iconGradient: "from-green-500 to-green-600",
  },
  market_forecaster: {
    icon: LineChart,
    accent: "#9333ea",
    accentMuted: "rgba(147, 51, 234, 0.1)",
    gradientFrom: "rgba(147, 51, 234, 0.05)",
    gradientTo: "rgba(147, 51, 234, 0.15)",
    badgeBg: "rgba(147, 51, 234, 0.1)",
    badgeText: "#9333ea",
    placeholder: "Forecast prices, find hotspots, analyze scenarios…",
    pulseColor: "#9333ea",
    iconGradient: "from-purple-500 to-purple-600",
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
  memoId,
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
  memoId?: string
  memoContext?: MemoContextPayload
}) {
  const theme = agentThemes[agentId]
  const Icon = theme.icon
  const [input, setInput] = React.useState("")
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [loading, setLoading] = React.useState(false)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const hasMessages = messages.length > 0

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  // Reset conversation when sheet closes
  React.useEffect(() => {
    if (!open) {
      setMessages([])
      setInput("")
    } else {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

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
            memoId,
            messages: [{ role: "user", content: trimmed }],
            ...(memoContext ? { memoContext } : {}),
          }),
        })
        const json = await res.json().catch(() => null)
        if (!res.ok) {
          const err = (json && (json.detail || json.error)) || `Request failed (${res.status})`
          setMessages((prev) => [...prev, { role: "assistant", content: String(err) }])
          return
        }
        const reply = json?.message?.content ?? "I couldn't generate a response."
        setMessages((prev) => [...prev, { role: "assistant", content: String(reply) }])
      } finally {
        setLoading(false)
      }
    },
    [agentId, pagePath, propertyId, scopedInvestorId, memoId, memoContext],
  )

  const handleSend = () => {
    const text = input
    setInput("")
    void send(text)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-[480px]"
      >
        {/* ── Header ── */}
        <SheetHeader
          className="shrink-0 border-b px-5 pb-4 pt-5"
          style={{
            background: `linear-gradient(160deg, ${theme.gradientFrom}, ${theme.gradientTo})`,
          }}
        >
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm",
                theme.iconGradient,
              )}
            >
              <Icon className="size-4" />
            </span>
            <div className="min-w-0">
              <SheetTitle className="text-base font-semibold leading-tight">{title}</SheetTitle>
              <SheetDescription className="text-xs leading-snug">
                {description ?? "Insights and recommendations tailored to your portfolio."}
              </SheetDescription>
            </div>
            <span
              className="ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
              style={{ backgroundColor: theme.badgeBg, color: theme.badgeText }}
            >
              AI
            </span>
          </div>
        </SheetHeader>

        {/* ── Messages ── */}
        <ScrollArea className="min-h-0 flex-1">
          <ScrollAreaViewport className="h-full px-4 py-4">
            {!hasMessages ? (
              /* Empty state — greeting + suggestions */
              <div className="flex h-full flex-col items-center justify-center gap-5 py-8 text-center">
                <div
                  className={cn(
                    "inline-flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md",
                    theme.iconGradient,
                  )}
                >
                  <Icon className="size-7" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">How can I help?</p>
                  <p className="mt-1 text-xs text-gray-400">Pick a suggestion or type your question below.</p>
                </div>
                <div className="flex w-full flex-col gap-2">
                  {suggestedQuestions.map((q) => (
                    <button
                      key={q}
                      onClick={() => void send(q)}
                      disabled={loading}
                      className="w-full rounded-xl border border-gray-100 bg-white px-4 py-2.5 text-left text-sm text-gray-700 shadow-sm transition-colors hover:border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Conversation */
              <div className="space-y-3">
                {messages.map((m, idx) => {
                  const { text, block } = extractActionBlock(m.content)
                  return (
                    <div
                      key={idx}
                      className={cn(
                        "max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                        m.role === "user"
                          ? "ml-auto rounded-br-sm bg-gray-900 text-white"
                          : "mr-auto rounded-bl-sm border border-gray-100 bg-white text-gray-800 shadow-sm",
                      )}
                    >
                      <div
                        className={cn(
                          "prose max-w-none",
                          m.role === "user" && "prose-invert",
                          "prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0",
                          "prose-headings:my-2 prose-h1:text-base prose-h2:text-sm prose-h3:text-xs",
                          "prose-table:text-xs prose-th:py-1 prose-td:py-1",
                          "prose-strong:font-semibold",
                        )}
                      >
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
                        {block ? <ChatActionRenderer block={block} /> : null}
                      </div>
                    </div>
                  )
                })}
                {loading && (
                  <div className="mr-auto flex max-w-[88%] items-center gap-2 rounded-2xl rounded-bl-sm border border-gray-100 bg-white px-4 py-3 text-sm text-gray-400 shadow-sm">
                    <span className="inline-flex gap-1">
                      <span className="animate-bounce" style={{ animationDelay: "0ms" }}>·</span>
                      <span className="animate-bounce" style={{ animationDelay: "150ms" }}>·</span>
                      <span className="animate-bounce" style={{ animationDelay: "300ms" }}>·</span>
                    </span>
                    Thinking…
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollAreaViewport>
          <ScrollBar />
        </ScrollArea>

        {/* ── Suggested chips (after conversation starts) ── */}
        {hasMessages && suggestedQuestions.length > 0 && (
          <div className="shrink-0 border-t border-gray-100 bg-gray-50/60 px-4 py-2">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {suggestedQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => void send(q)}
                  disabled={loading}
                  className="shrink-0 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                >
                  <Sparkles className="mr-1 inline-block h-3 w-3 text-gray-400" />
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Input ── */}
        <div className="shrink-0 border-t bg-white px-4 pb-5 pt-3">
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={theme.placeholder}
              className="flex-1 rounded-xl border-gray-200 bg-gray-50 text-sm focus:bg-white"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
            />
            <Button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              size="icon"
              className="shrink-0 rounded-xl"
              style={{ backgroundColor: theme.accent }}
            >
              <SendHorizonal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default AIBankerChatInterface
