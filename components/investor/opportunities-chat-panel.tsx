"use client"

import * as React from "react"
import Image from "next/image"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Loader2, Send, Sparkles, User } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useApp } from "@/components/providers/app-provider"

type ThreadMessage = {
  id: string
  senderId: string
  senderRole: "investor" | "agent" | "ai"
  body: string
  createdAt: string
}

type OpportunitySummary = {
  id: string
  sharedByName: string | null
  property: { title: string | null; area: string | null } | null
}

type ChatMessage = { role: "user" | "assistant"; content: string }

const SARAH_AVATAR = "/professional-woman-avatar.png"
const ADVISOR_NAME = "Sarah"

const markdownComponents = {
  a: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-emerald-700 underline hover:text-emerald-900 font-medium"
      {...props}
    >
      {children}
    </a>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-gray-900">{children}</strong>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="my-1.5 text-sm text-gray-900">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc list-inside space-y-1 my-2 text-gray-900">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal list-inside space-y-1 my-2 text-gray-900">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="text-sm text-gray-900">{children}</li>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="font-semibold text-sm mt-3 mb-1 text-gray-900">{children}</h3>
  ),
}

export function OpportunitiesChatPanel({
  mode,
  className,
}: {
  mode: "sarah" | "ai"
  className?: string
}) {
  const { scopedInvestorId } = useApp()
  const scrollRef = React.useRef<HTMLDivElement>(null)

  // Sarah state
  const [opportunities, setOpportunities] = React.useState<OpportunitySummary[]>([])
  const [selectedOppId, setSelectedOppId] = React.useState<string | null>(null)
  const [messages, setMessages] = React.useState<ThreadMessage[]>([])
  const [loadingOpps, setLoadingOpps] = React.useState(mode === "sarah")
  const [input, setInput] = React.useState("")
  const [sending, setSending] = React.useState(false)

  // AI state
  const [aiMessages, setAiMessages] = React.useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Ask me about Dubai real estate, market trends, yields, or any property. I can help you compare opportunities and get insights.",
    },
  ])
  const [aiLoading, setAiLoading] = React.useState(false)

  React.useEffect(() => {
    if (mode !== "sarah") return
    async function load() {
      try {
        const res = await fetch("/api/investor/opportunities")
        if (res.ok) {
          const data = await res.json()
          const opps = (data.opportunities ?? []) as OpportunitySummary[]
          setOpportunities(opps)
          if (opps.length > 0 && !selectedOppId) setSelectedOppId(opps[0].id)
        }
      } catch (err) {
        console.error("Failed to load opportunities:", err)
      } finally {
        setLoadingOpps(false)
      }
    }
    load()
  }, [mode])

  React.useEffect(() => {
    if (mode !== "sarah" || !selectedOppId) {
      if (mode === "sarah") setMessages([])
      return
    }
    async function loadMessages() {
      try {
        const res = await fetch(
          `/api/investor/opportunities/${selectedOppId}/messages`
        )
        if (res.ok) {
          const data = await res.json()
          const msgs = (data.messages ?? []) as ThreadMessage[]
          setMessages(msgs.filter((m) => m.senderRole !== "ai"))
        }
      } catch (err) {
        console.error("Failed to load messages:", err)
      }
    }
    loadMessages()
  }, [mode, selectedOppId])

  React.useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current?.scrollHeight ?? 0,
      behavior: "smooth",
    })
  }, [messages, aiMessages, aiLoading])

  const sendSarahMessage = async () => {
    if (!input.trim() || !selectedOppId || sending) return
    setSending(true)
    try {
      const res = await fetch(
        `/api/investor/opportunities/${selectedOppId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: input.trim() }),
        }
      )
      if (res.ok) {
        const { message } = await res.json()
        setMessages((prev) => [...prev, message])
        setInput("")
      }
    } catch (err) {
      console.error("Failed to send:", err)
    } finally {
      setSending(false)
    }
  }

  const sendAiMessage = async () => {
    const trimmed = input.trim()
    if (!trimmed || aiLoading) return
    setAiMessages((prev) => [...prev, { role: "user", content: trimmed }])
    setInput("")
    setAiLoading(true)
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: "real_estate_advisor",
          pagePath: "/investor/opportunities",
          scopedInvestorId,
          messages: [{ role: "user", content: trimmed }],
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        const err = (json && (json.detail || json.error)) || `Request failed (${res.status})`
        setAiMessages((prev) => [...prev, { role: "assistant", content: String(err) }])
        return
      }
      const reply = json?.message?.content ?? "I couldn't generate a response."
      setAiMessages((prev) => [...prev, { role: "assistant", content: String(reply) }])
    } finally {
      setAiLoading(false)
    }
  }

  const selectedOpp = opportunities.find((o) => o.id === selectedOppId)
  const isSarah = mode === "sarah"

  if (isSarah && loadingOpps) {
    return (
      <div className={cn("flex flex-1 items-center justify-center p-8", className)}>
        <Loader2 className="size-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  if (isSarah && opportunities.length === 0) {
    return (
      <div className={cn("flex flex-1 flex-col items-center justify-center p-8 text-center", className)}>
        <div className="relative size-16 overflow-hidden rounded-full bg-emerald-100 ring-2 ring-emerald-200">
          <Image
            src={SARAH_AVATAR}
            alt={ADVISOR_NAME}
            fill
            className="object-cover"
            sizes="64px"
          />
        </div>
        <p className="mt-4 text-sm font-medium text-gray-900">No chat yet</p>
        <p className="mt-1 text-sm text-gray-600">
          Your realtor will share opportunities with you. Once they do, you&apos;ll be able to chat here.
        </p>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-1 flex-col overflow-hidden bg-white", className)}>
      {isSarah && opportunities.length > 1 && (
        <div className="border-b border-emerald-100 bg-emerald-50/50 px-4 py-2">
          <select
            value={selectedOppId ?? ""}
            onChange={(e) => setSelectedOppId(e.target.value || null)}
            className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
          >
            {opportunities.map((o) => (
              <option key={o.id} value={o.id}>
                {o.property?.title ?? "Property"}{" "}
                {o.property?.area ? `– ${o.property.area}` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[280px]"
      >
        {isSarah ? (
          messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="relative size-14 overflow-hidden rounded-full bg-emerald-100 ring-2 ring-emerald-200">
                <Image
                  src={SARAH_AVATAR}
                  alt={ADVISOR_NAME}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              </div>
              <p className="mt-3 text-sm font-medium text-gray-900">
                Start a conversation with {selectedOpp?.sharedByName ?? ADVISOR_NAME}
              </p>
              <p className="mt-1 text-xs text-gray-600">Send a message below</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "rounded-xl p-3 max-w-[85%]",
                  msg.senderRole === "investor"
                    ? "bg-emerald-600 text-white ml-auto"
                    : "bg-emerald-50 border border-emerald-200 mr-auto"
                )}
              >
                <span
                  className={cn(
                    "text-[10px] font-medium uppercase block mb-1",
                    msg.senderRole === "investor" ? "text-emerald-100" : "text-emerald-700"
                  )}
                >
                  {msg.senderRole === "investor" ? "You" : selectedOpp?.sharedByName ?? ADVISOR_NAME}
                </span>
                <p
                  className={cn(
                    "text-sm whitespace-pre-wrap",
                    msg.senderRole === "investor" ? "text-white" : "text-gray-900"
                  )}
                >
                  {msg.body}
                </p>
                <p
                  className={cn(
                    "text-[10px] mt-1",
                    msg.senderRole === "investor" ? "text-emerald-200" : "text-gray-500"
                  )}
                >
                  {new Date(msg.createdAt).toLocaleTimeString()}
                </p>
              </div>
            ))
          )
        ) : (
          <>
            {aiMessages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-xl p-3 max-w-[85%]",
                  msg.role === "user"
                    ? "bg-emerald-600 text-white ml-auto"
                    : "bg-emerald-50 border border-emerald-200 mr-auto"
                )}
              >
                <span
                  className={cn(
                    "text-[10px] font-medium uppercase block mb-1",
                    msg.role === "user" ? "text-emerald-100" : "text-emerald-700"
                  )}
                >
                  {msg.role === "user" ? "You" : "AI"}
                </span>
                {msg.role === "user" ? (
                  <p className="text-sm whitespace-pre-wrap text-white">{msg.content}</p>
                ) : (
                  <div
                    className={cn(
                      "prose prose-sm max-w-none text-gray-900",
                      "prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0",
                      "prose-headings:my-2 prose-h3:text-sm prose-h3:font-semibold prose-h3:text-gray-900"
                    )}
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            ))}
            {aiLoading && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 max-w-[85%] mr-auto">
                <Loader2 className="size-4 animate-spin text-emerald-600" />
                <span className="text-sm text-gray-700">Thinking...</span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="border-t border-emerald-100 bg-emerald-50/30 p-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                isSarah ? sendSarahMessage() : sendAiMessage()
              }
            }}
            placeholder={
              isSarah ? "Type a message to Sarah..." : "Ask about market, yields, properties..."
            }
            disabled={isSarah ? sending : aiLoading}
            className="flex-1 border-emerald-200 bg-white text-gray-900 placeholder:text-gray-500 focus-visible:ring-emerald-400"
          />
          <Button
            onClick={isSarah ? sendSarahMessage : sendAiMessage}
            disabled={(isSarah ? sending : aiLoading) || !input.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            {isSarah && sending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : !isSarah && aiLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
