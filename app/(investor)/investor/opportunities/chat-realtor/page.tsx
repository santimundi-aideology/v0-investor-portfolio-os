"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Loader2, Send } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useApp } from "@/components/providers/app-provider"

const SARAH_AVATAR = "/professional-woman-avatar.png"

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

const ADVISOR_NAME = "Sarah"

export default function ChatRealtorPage() {
  const { scopedInvestorId } = useApp()
  const [opportunities, setOpportunities] = React.useState<OpportunitySummary[]>([])
  const [selectedOppId, setSelectedOppId] = React.useState<string | null>(null)
  const [messages, setMessages] = React.useState<ThreadMessage[]>([])
  const [loading, setLoading] = React.useState(true)
  const [input, setInput] = React.useState("")
  const [sending, setSending] = React.useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/investor/opportunities")
        if (res.ok) {
          const data = await res.json()
          const opps = (data.opportunities ?? []) as OpportunitySummary[]
          setOpportunities(opps)
          if (opps.length > 0 && !selectedOppId) {
            setSelectedOppId(opps[0].id)
          }
        }
      } catch (err) {
        console.error("Failed to load opportunities:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  React.useEffect(() => {
    if (!selectedOppId) {
      setMessages([])
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
  }, [selectedOppId])

  React.useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [messages])

  const sendMessage = async () => {
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

  const selectedOpp = opportunities.find((o) => o.id === selectedOppId)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-emerald-50/50">
        <Loader2 className="size-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  if (opportunities.length === 0) {
    return (
      <div className="min-h-screen bg-emerald-50/50">
        <div className="mx-auto w-full max-w-7xl px-4 py-8">
          <Button variant="ghost" size="icon" asChild className="text-gray-700 hover:bg-emerald-100">
            <Link href="/investor/opportunities">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <Card className="mt-6 border-emerald-200 bg-white p-12 text-center shadow-sm">
            <div className="relative mx-auto size-20 overflow-hidden rounded-full bg-emerald-100 ring-2 ring-emerald-200">
              <Image src={SARAH_AVATAR} alt={ADVISOR_NAME} fill className="object-cover" sizes="80px" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-gray-900">No chat yet</h2>
            <p className="mt-2 text-sm text-gray-600">
              Your realtor will share opportunities with you. Once they do, you&apos;ll be able to chat here.
            </p>
            <Button variant="outline" className="mt-6 border-emerald-200 text-emerald-800 hover:bg-emerald-50" asChild>
              <Link href="/investor/opportunities">Back to Opportunities</Link>
            </Button>
          </Card>
        </div>
      </div>
    )
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
          <div className="relative size-10 shrink-0 overflow-hidden rounded-full bg-emerald-100 ring-2 ring-emerald-200">
            <Image src={SARAH_AVATAR} alt={ADVISOR_NAME} fill className="object-cover" sizes="40px" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold tracking-tight text-gray-900">
              Chat with Sarah
            </h1>
            <p className="text-sm text-emerald-700">
              {selectedOpp?.sharedByName ?? ADVISOR_NAME} · Your realtor
            </p>
          </div>
        </div>
        {opportunities.length > 1 && (
          <div className="mx-auto max-w-3xl px-4 pb-3 sm:px-6 lg:px-8">
            <select
              value={selectedOppId ?? ""}
              onChange={(e) => setSelectedOppId(e.target.value || null)}
              className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            >
              {opportunities.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.property?.title ?? "Property"} {o.property?.area ? `– ${o.property.area}` : ""}
                </option>
              ))}
            </select>
          </div>
        )}
      </header>

      <Card className="mx-auto my-4 flex flex-1 flex-col overflow-hidden w-full max-w-3xl border-emerald-200 bg-white shadow-sm">
        <CardHeader className="border-b border-emerald-100 bg-emerald-50/30 py-3">
          <CardTitle className="flex items-center justify-between text-base text-gray-900">
            <span className="flex items-center gap-2">
              <div className="relative size-8 overflow-hidden rounded-full bg-emerald-100 ring-2 ring-emerald-200">
                <Image src={SARAH_AVATAR} alt="" fill className="object-cover" sizes="32px" />
              </div>
              {selectedOpp?.sharedByName ?? ADVISOR_NAME}
            </span>
            <Badge variant="outline" className="text-xs border-emerald-200 text-emerald-800">
              {messages.length} messages
            </Badge>
          </CardTitle>
        </CardHeader>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[400px] max-h-[60vh]"
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="relative size-14 overflow-hidden rounded-full bg-emerald-100 ring-2 ring-emerald-200">
                <Image src={SARAH_AVATAR} alt={ADVISOR_NAME} fill className="object-cover" sizes="56px" />
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
                  sendMessage()
                }
              }}
              placeholder="Type a message..."
              disabled={sending}
              className="flex-1 border-emerald-200 bg-white text-gray-900 placeholder:text-gray-500 focus-visible:ring-emerald-400"
            />
            <Button
              onClick={sendMessage}
              disabled={sending || !input.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {sending ? (
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
