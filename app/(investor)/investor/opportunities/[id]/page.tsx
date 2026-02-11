"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Building2,
  FileText,
  Heart,
  Loader2,
  MapPin,
  Send,
  Sparkles,
  Star,
  ThumbsDown,
  User,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { AskAIBankerWidget } from "@/components/ai/ask-ai-banker-widget"
import { cn } from "@/lib/utils"
import { useApp } from "@/components/providers/app-provider"

type OpportunityDetail = {
  id: string
  status: string
  decision: string
  decisionNote: string | null
  sharedByName: string | null
  sharedAt: string
  sharedMessage: string | null
  matchScore: number | null
  matchReasons: string[]
  memoId: string | null
  messageCount: number
  property: {
    title: string | null
    area: string | null
    type: string | null
    price: number | null
    size: number | null
    bedrooms: number | null
    imageUrl: string | null
    developer: string | null
    expectedRent: number | null
  } | null
}

type ThreadMessage = {
  id: string
  senderId: string
  senderRole: "investor" | "agent" | "ai"
  body: string
  createdAt: string
}

function formatAED(value: number) {
  if (value >= 1_000_000) return `AED ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `AED ${(value / 1_000).toFixed(0)}K`
  return `AED ${value.toLocaleString()}`
}

export default function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { scopedInvestorId } = useApp()
  const [opportunityId, setOpportunityId] = React.useState<string | null>(null)
  const [opportunity, setOpportunity] = React.useState<OpportunityDetail | null>(null)
  const [messages, setMessages] = React.useState<ThreadMessage[]>([])
  const [loading, setLoading] = React.useState(true)
  const [input, setInput] = React.useState("")
  const [sending, setSending] = React.useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    params.then((p) => setOpportunityId(p.id))
  }, [params])

  // Fetch opportunity and messages
  React.useEffect(() => {
    if (!opportunityId) return

    async function load() {
      setLoading(true)
      try {
        const [oppRes, msgRes] = await Promise.all([
          fetch("/api/investor/opportunities"),
          fetch(`/api/investor/opportunities/${opportunityId}/messages`),
        ])

        if (oppRes.ok) {
          const oppData = await oppRes.json()
          const found = oppData.opportunities?.find(
            (o: OpportunityDetail) => o.id === opportunityId
          )
          setOpportunity(found ?? null)
        }

        if (msgRes.ok) {
          const msgData = await msgRes.json()
          setMessages(msgData.messages ?? [])
        }
      } catch (err) {
        console.error("Failed to load:", err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [opportunityId])

  // Auto-scroll on new messages
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      })
    }
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || !opportunityId || sending) return

    setSending(true)
    try {
      const res = await fetch(
        `/api/investor/opportunities/${opportunityId}/messages`,
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

  const handleDecision = async (decision: string) => {
    if (!opportunityId) return
    try {
      await fetch(`/api/investor/opportunities/${opportunityId}/decision`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      })
      // Refresh
      const res = await fetch("/api/investor/opportunities")
      if (res.ok) {
        const data = await res.json()
        const found = data.opportunities?.find(
          (o: OpportunityDetail) => o.id === opportunityId
        )
        setOpportunity(found ?? null)
      }
    } catch (err) {
      console.error("Failed to update decision:", err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!opportunity) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Opportunity not found</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/investor/opportunities">Back to Opportunities</Link>
          </Button>
        </div>
      </div>
    )
  }

  const p = opportunity.property

  return (
    <div className="min-h-screen bg-gray-100/30">
      {/* Header */}
      <div className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/investor/opportunities">
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold tracking-tight truncate">
                {p?.title ?? "Opportunity"}
              </h1>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                {p?.area && (
                  <>
                    <MapPin className="size-3" />
                    {p.area}
                  </>
                )}
                {p?.price && <span> - {formatAED(p.price)}</span>}
              </div>
            </div>
            {opportunity.memoId ? (
              <Button variant="outline" asChild>
                <Link href={`/investor/memos/${opportunity.memoId}`} className="gap-2">
                  <FileText className="size-4" />
                  Open IC Memo
                </Link>
              </Button>
            ) : (
              <Badge variant="secondary" className="whitespace-nowrap">
                IC memo pending from advisor
              </Badge>
            )}
            <AskAIBankerWidget
              agentId="real_estate_advisor"
              title="AI Advisor"
              suggestedQuestions={[
                `Is ${p?.title} a good investment?`,
                `What's the market outlook for ${p?.area}?`,
                `What are the risks?`,
              ]}
              pagePath="/investor/opportunities"
              scopedInvestorId={scopedInvestorId}
              variant="inline"
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Left: Chat thread */}
          <Card className="flex flex-col min-h-0">
            <CardHeader className="border-b py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="size-4" />
                  Conversation with {opportunity.sharedByName ?? "Your Advisor"}
                </CardTitle>
                <Badge variant="outline" className="text-[10px]">
                  {messages.length} messages
                </Badge>
              </div>
            </CardHeader>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 h-[400px] overflow-y-auto overscroll-contain p-4 space-y-3"
            >
              {/* Shared message as first "system" message */}
              {opportunity.sharedMessage && (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground inline-block bg-gray-100 rounded-full px-3 py-1">
                    {opportunity.sharedByName ?? "Advisor"} shared this property on{" "}
                    {new Date(opportunity.sharedAt).toLocaleDateString()}
                  </p>
                  <div className="bg-gray-50 rounded-lg p-3 mt-2 text-sm text-gray-700 italic">
                    &quot;{opportunity.sharedMessage}&quot;
                  </div>
                </div>
              )}

              {messages.length === 0 && !opportunity.sharedMessage && (
                <div className="text-center py-12">
                  <Sparkles className="mx-auto size-8 text-gray-300" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    Start a conversation about this property
                  </p>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "rounded-xl p-3 max-w-[80%]",
                    msg.senderRole === "investor"
                      ? "bg-primary text-primary-foreground ml-auto"
                      : msg.senderRole === "ai"
                        ? "bg-amber-50 border border-amber-200 mr-auto"
                        : "bg-gray-100 mr-auto"
                  )}
                >
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-[10px] font-medium opacity-70 uppercase">
                      {msg.senderRole === "investor"
                        ? "You"
                        : msg.senderRole === "ai"
                          ? "AI Advisor"
                          : "Advisor"}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                  <p className="text-[10px] opacity-50 mt-1">
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="border-t p-4">
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
                  placeholder="Ask about this property..."
                  disabled={sending}
                  className="flex-1"
                />
                <Button
                  onClick={sendMessage}
                  disabled={sending || !input.trim()}
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

          {/* Right: Property details + decision */}
          <div className="space-y-4">
            {/* Property card */}
            <Card>
              <div className="relative h-40 bg-muted rounded-t-lg overflow-hidden">
                {p?.imageUrl ? (
                  <img
                    src={p.imageUrl}
                    alt={p.title ?? ""}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Building2 className="size-12 text-gray-300" />
                  </div>
                )}
              </div>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold">{p?.title ?? "Property"}</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Price</span>
                    <p className="font-medium">
                      {p?.price ? formatAED(p.price) : "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Area</span>
                    <p className="font-medium">{p?.area ?? "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Type</span>
                    <p className="font-medium capitalize">{p?.type ?? "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Bedrooms</span>
                    <p className="font-medium">{p?.bedrooms ?? "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Size</span>
                    <p className="font-medium">
                      {p?.size ? `${p.size} sqm` : "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Developer</span>
                    <p className="font-medium">{p?.developer ?? "—"}</p>
                  </div>
                </div>
                {p?.expectedRent && (
                  <div className="rounded-lg bg-emerald-50 p-3 text-sm">
                    <span className="text-emerald-700 font-medium">
                      Expected rent: {formatAED(p.expectedRent)}/yr
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Decision card */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Your Decision</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant={opportunity.decision === "interested" ? "default" : "outline"}
                  className="w-full justify-start gap-2"
                  onClick={() => handleDecision("interested")}
                >
                  <Heart className="size-4" />
                  Interested
                </Button>
                <Button
                  variant={opportunity.decision === "very_interested" ? "default" : "outline"}
                  className={cn(
                    "w-full justify-start gap-2",
                    opportunity.decision === "very_interested" &&
                      "bg-amber-500 hover:bg-amber-600"
                  )}
                  onClick={() => handleDecision("very_interested")}
                >
                  <Star className="size-4" />
                  Very Interested
                </Button>
                <Button
                  variant={opportunity.decision === "not_interested" ? "destructive" : "ghost"}
                  className="w-full justify-start gap-2 text-muted-foreground"
                  onClick={() => handleDecision("not_interested")}
                >
                  <ThumbsDown className="size-4" />
                  Not Interested
                </Button>
              </CardContent>
            </Card>

            {/* Match reasons */}
            {opportunity.matchReasons.length > 0 && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="size-4 text-primary" />
                    Why this was recommended
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {opportunity.matchReasons.map((reason) => (
                      <li
                        key={reason}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                        {reason}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
