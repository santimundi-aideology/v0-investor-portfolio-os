/**
 * AI Banker chat dialog shown in realtor flows.
 * The file had multiple duplicate copies; reduced to a single export.
 */
"use client"

import * as React from "react"
import { Building2 } from "lucide-react"

import type { AIAgentId } from "@/lib/ai/agents"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea, ScrollAreaViewport, ScrollBar } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

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
}

type ChatMessage = { role: "user" | "assistant"; content: string }

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
    [agentId, pagePath, propertyId, scopedInvestorId],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 sm:max-w-[760px]">
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
          <DialogDescription className="text-muted-foreground">
            {description ?? "Insights and recommendations tailored to your real estate portfolio."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-0 sm:grid-cols-[1fr_260px]">
          <div className="border-b sm:border-b-0 sm:border-r">
            <ScrollArea className="h-[520px]">
              <ScrollAreaViewport className="p-4">
                <div className="space-y-3">
                  {messages.map((m, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "max-w-[90%] rounded-lg border p-3 text-sm leading-relaxed",
                        m.role === "user" ? "ml-auto bg-muted" : "mr-auto bg-background",
                      )}
                    >
                      <pre className="whitespace-pre-wrap font-sans">{m.content}</pre>
                    </div>
                  ))}
                  {loading ? (
                    <div className="mr-auto max-w-[90%] rounded-lg border p-3 text-sm text-muted-foreground">
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


