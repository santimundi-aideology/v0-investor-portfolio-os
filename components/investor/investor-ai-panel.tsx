"use client"

import * as React from "react"
import { TrendingUp, Sparkles, X, Maximize2, Minimize2 } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea, ScrollAreaViewport, ScrollBar } from "@/components/ui/scroll-area"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type ChatMessage = { role: "user" | "assistant"; content: string }

// Investor-focused suggested questions
const SUGGESTED_QUESTIONS = [
  "Should I diversify into commercial properties?",
  "Which property is underperforming my mandate?",
  "Compare my yield to Dubai market average",
  "What's my exposure risk by area?",
  "Recommend exit timing for my lowest performer",
  "How can I optimize my rental income?",
  "What's my portfolio concentration risk?",
  "Which property should I sell first?",
]

// Clean modern theme for investor-facing advisor
const theme = {
  accent: "#22C55E",
  accentMuted: "rgba(34, 197, 94, 0.1)",
  gradientFrom: "#FFFFFF",
  gradientTo: "#F8F8F8",
  badgeBg: "rgba(34, 197, 94, 0.15)",
  badgeText: "#16A34A",
  iconGradient: "from-green-500 to-green-600",
}

interface InvestorAIPanelProps {
  investorId?: string
  investorName?: string
  className?: string
  defaultExpanded?: boolean
  onClose?: () => void
}

export function InvestorAIPanel({
  investorId,
  investorName,
  className,
  defaultExpanded = false,
  onClose,
}: InvestorAIPanelProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded)

  // Handle close - call external onClose if provided
  const handleClose = React.useCallback(() => {
    setIsExpanded(false)
    onClose?.()
  }, [onClose])
  const [input, setInput] = React.useState("")
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hello! I'm your Portfolio Advisor. I can help you optimize your real estate portfolio, analyze yields, assess risks, and make strategic hold/sell decisions. What would you like to explore today?",
    },
  ])
  const [loading, setLoading] = React.useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

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
            agentId: "portfolio_advisor",
            pagePath: "/investor",
            scopedInvestorId: investorId,
            messages: [{ role: "user", content: trimmed }],
          }),
        })

        const json = await res.json().catch(() => null)
        if (!res.ok) {
          const err =
            (json && (json.detail || json.error)) ||
            `Request failed (${res.status})`
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: String(err) },
          ])
          return
        }

        const reply =
          json?.message?.content ?? "I couldn't generate a response."
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: String(reply) },
        ])
      } finally {
        setLoading(false)
      }
    },
    [investorId]
  )

  // Collapsed state - floating button
  if (!isExpanded) {
    return (
      <Button
        onClick={() => setIsExpanded(true)}
        className={cn(
          "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50",
          "bg-green-500 hover:bg-green-600",
          "transition-colors",
          className
        )}
      >
        <Sparkles className="h-6 w-6 text-white" />
        <span className="sr-only">Open Portfolio Advisor</span>
      </Button>
    )
  }

  // Expanded state - full panel
  return (
    <Card
      className={cn(
        "fixed bottom-6 right-6 w-[420px] shadow-2xl z-50 border-0 overflow-hidden",
        "transition-all duration-300",
        className
      )}
      style={{
        background: `linear-gradient(180deg, ${theme.gradientFrom}, ${theme.gradientTo})`,
      }}
    >
      {/* Header */}
      <CardHeader className="pb-3 border-b border-gray-100 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className="inline-flex size-10 items-center justify-center rounded-xl bg-green-500 text-white shadow-sm"
            >
              <TrendingUp className="size-5" />
            </span>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Portfolio Advisor
                <Badge
                  style={{ backgroundColor: theme.badgeBg, color: theme.badgeText }}
                  className="text-[10px] font-semibold"
                >
                  AI
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Your personal investment strategist
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-500 hover:text-foreground"
                      onClick={handleClose}
                    >
                      <Minimize2 className="h-4 w-4" />
                      <span className="sr-only">Minimize</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-500 hover:text-foreground"
                      onClick={handleClose}
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Close</span>
                    </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Messages */}
        <ScrollArea className="h-[320px]">
          <ScrollAreaViewport ref={scrollRef} className="p-4">
            <div className="space-y-3">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "max-w-[90%] rounded-xl p-3 text-xs leading-relaxed shadow-sm",
                    m.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "mr-auto bg-background border"
                  )}
                >
                  <div
                    className={cn(
                      "prose max-w-none",
                      m.role === "user" ? "prose-invert" : "dark:prose-invert",
                      "prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0",
                      "prose-headings:my-2 prose-h1:text-sm prose-h2:text-xs prose-h3:text-xs",
                      "prose-strong:font-semibold"
                    )}
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {m.content}
                    </ReactMarkdown>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="mr-auto max-w-[90%] rounded-xl border bg-background p-3 text-xs text-gray-500 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="animate-bounce delay-0">●</span>
                      <span className="animate-bounce delay-100">●</span>
                      <span className="animate-bounce delay-200">●</span>
                    </div>
                    <span>Analyzing your portfolio...</span>
                  </div>
                </div>
              )}
            </div>
          </ScrollAreaViewport>
          <ScrollBar />
        </ScrollArea>

        {/* Suggested Questions */}
        <div className="border-t bg-muted/30 px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
            Quick Questions
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_QUESTIONS.slice(0, 4).map((q) => (
              <Button
                key={q}
                variant="outline"
                size="sm"
                className="h-auto py-1 px-2 text-[10px] whitespace-normal text-left bg-background/80 hover:bg-background"
                onClick={() => void send(q)}
                disabled={loading}
              >
                {q}
              </Button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="flex gap-2 border-t bg-background/80 p-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about portfolio performance, yields..."
            className="text-sm h-9"
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
            disabled={loading || !input.trim()}
            size="sm"
            className="h-9 px-4"
            style={{ backgroundColor: theme.accent }}
          >
            Ask
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default InvestorAIPanel
