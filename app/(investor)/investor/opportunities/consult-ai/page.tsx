"use client"

import * as React from "react"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { ArrowLeft, Loader2, Send, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useApp } from "@/components/providers/app-provider"

type ChatMessage = { role: "user" | "assistant"; content: string }

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
  img: ({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    <img
      src={src}
      alt={alt ?? ""}
      className="rounded-lg max-w-full h-auto my-2 max-h-48 object-cover"
      {...props}
    />
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc list-inside space-y-1 my-2">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal list-inside space-y-1 my-2">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="text-sm">{children}</li>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="font-semibold text-sm mt-3 mb-1">{children}</h3>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="my-1.5 text-sm">{children}</p>
  ),
}

export default function ConsultAIPage() {
  const { scopedInvestorId } = useApp()
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Ask me about Dubai real estate, market trends, yields, or any property. I can help you compare opportunities and get insights.",
    },
  ])
  const [input, setInput] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [messages, loading])

  const send = async () => {
    const trimmed = input.trim()
    if (!trimmed || loading) return

    setMessages((prev) => [...prev, { role: "user", content: trimmed }])
    setInput("")
    setLoading(true)

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
        const err =
          (json && (json.detail || json.error)) || `Request failed (${res.status})`
        setMessages((prev) => [...prev, { role: "assistant", content: String(err) }])
        return
      }

      const reply = json?.message?.content ?? "I couldn't generate a response."
      setMessages((prev) => [...prev, { role: "assistant", content: String(reply) }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-emerald-50/50">
      <header className="border-b border-emerald-100 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Button variant="ghost" size="icon" asChild className="text-gray-700 hover:bg-emerald-50">
            <Link href="/investor/opportunities">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
            <Sparkles className="size-5" />
          </span>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-gray-900">
              Consult AI
            </h1>
            <p className="text-sm text-emerald-700">
              AI Advisor – market insights, yields, property analysis
            </p>
          </div>
        </div>
      </header>

      <Card className="mx-auto my-4 flex flex-1 flex-col overflow-hidden w-full max-w-3xl border-emerald-200 bg-white shadow-sm">
        <CardHeader className="border-b border-emerald-100 bg-emerald-50/30 py-3">
          <CardTitle className="text-base flex items-center gap-2 text-gray-900">
            <span className="flex size-8 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Sparkles className="size-4" />
            </span>
            AI Advisor
          </CardTitle>
        </CardHeader>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[400px] max-h-[60vh]"
        >
          {messages.map((msg, i) => (
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
                    "prose-headings:my-2 prose-h3:text-sm prose-h3:font-semibold prose-h3:text-gray-900",
                    "prose-strong:font-semibold prose-strong:text-gray-900",
                  )}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 max-w-[85%] mr-auto">
              <Loader2 className="size-4 animate-spin text-emerald-600" />
              <span className="text-sm text-gray-700">Thinking...</span>
            </div>
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
                  send()
                }
              }}
              placeholder="Ask about market, yields, properties..."
              disabled={loading}
              className="flex-1 border-emerald-200 bg-white text-gray-900 placeholder:text-gray-500 focus-visible:ring-emerald-400"
            />
            <Button
              onClick={send}
              disabled={loading || !input.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
