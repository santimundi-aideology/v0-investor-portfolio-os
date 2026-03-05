"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Bot, MessageCircle, Send, Sparkles } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { MemoDecisionPanel } from "@/components/investor/memo-decision-panel"
import { MemoDetailView } from "@/components/memos/memo-detail-view"
import { MemoDownloadActions } from "@/components/memos/memo-download-actions"
import { buildStaticMapUrl } from "@/lib/utils/build-static-map-url"
import { cn } from "@/lib/utils"
import type { Memo, MemoAnalysis } from "@/lib/types"

type MemoVersion = {
  version: number
  content: Record<string, unknown>
  createdAt: string
  createdBy: string
}

type MemoData = {
  id: string
  investorId: string
  listingId?: string
  state: string
  currentVersion: number
  versions: MemoVersion[]
  createdAt: string
  updatedAt: string
  title?: string
  trustStatus?: "verified" | "unknown" | "flagged"
  trustReason?: string
}

type Message = {
  id: string
  body: string
  created_at?: string
  createdAt?: string
  version_context?: number
  versionContext?: number
  sender_id?: string
  senderId?: string
}

function normalizeStatus(state: string): Memo["status"] {
  switch (state) {
    case "draft":
      return "draft"
    case "pending_review":
      return "review"
    case "ready":
      return "approved"
    case "sent":
    case "opened":
    case "decided":
      return "sent"
    default:
      return "draft"
  }
}

function toNarrative(content: Record<string, unknown>): string {
  const lines: string[] = []
  if (typeof content.execSummary === "string") {
    lines.push("## Executive Summary", content.execSummary, "")
  }
  if (typeof content.mandateFit === "string") {
    lines.push("## Mandate Fit", content.mandateFit, "")
  }
  if (Array.isArray(content.assumptions)) {
    lines.push("## Assumptions")
    for (const item of content.assumptions) {
      if (typeof item === "string") lines.push(`- ${item}`)
    }
    lines.push("")
  }
  if (typeof content.recommendation === "string") {
    lines.push("## Recommendation", content.recommendation, "")
  }
  if (lines.length === 0) return JSON.stringify(content, null, 2)
  return lines.join("\n").trim()
}

export default function InvestorMemoDetailPage() {
  const params = useParams()
  const router = useRouter()
  const memoId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string)

  const [memoData, setMemoData] = React.useState<MemoData | null>(null)
  const [messages, setMessages] = React.useState<Message[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [question, setQuestion] = React.useState("")
  const [sending, setSending] = React.useState(false)

  // AI chat state
  type ChatMessage = { role: "user" | "assistant"; content: string }
  const [aiChatMessages, setAiChatMessages] = React.useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "I'm your Memo Assistant. I can help you understand this investment memo, clarify assumptions, compare the deal to your mandate, and highlight risks or opportunities. What would you like to know?",
    },
  ])
  const [aiChatInput, setAiChatInput] = React.useState("")
  const [aiChatLoading, setAiChatLoading] = React.useState(false)
  const chatScrollRef = React.useRef<HTMLDivElement>(null)

  const currentVersion = memoData?.versions.find((v) => v.version === memoData.currentVersion)
  const content = currentVersion?.content ?? {}

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/investor/memos/${memoId}`, { headers: { "x-role": "investor" } })
        if (!res.ok) throw new Error("Failed to load memo")
        setMemoData(await res.json())

        const msgRes = await fetch(`/api/investor/memos/${memoId}/messages`, { headers: { "x-role": "investor" } })
        if (msgRes.ok) {
          setMessages(await msgRes.json())
        }
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [memoId])

  // Build the Memo object and all derived data the shared view needs
  const derived = React.useMemo(() => {
    if (!memoData) return null

    const contentProperty = content.property as Record<string, unknown> | undefined
    const contentEvaluation = content.evaluation as Record<string, unknown> | undefined
    const contentSource = content.source as Record<string, unknown> | undefined
    const contentImages = contentProperty?.images as string[] | undefined
    const intakeAnalysis = content.analysis as MemoAnalysis | undefined

    const sourceCoords = contentSource?.coordinates as { lat: number; lng: number } | null | undefined
    const mapImageUrl = buildStaticMapUrl(
      sourceCoords,
      `${contentProperty?.area ?? ""}${contentProperty?.subArea ? `, ${contentProperty.subArea}` : ""}`,
    )
    const floorPlanImageUrls = (contentSource?.floorPlanImages as string[] | undefined)?.filter(Boolean)

    const isOffplan = content.type === "offplan"
    const offplanProject = isOffplan ? (content.project as Record<string, unknown> | undefined) : undefined
    const offplanUnit = isOffplan ? (content.unit as Record<string, unknown> | undefined) : undefined
    const offplanAnalysis = isOffplan ? (content.analysis as Record<string, unknown> | undefined) : undefined
    const offplanPaymentPlan = isOffplan ? (content.paymentPlan as Record<string, unknown> | undefined) : undefined

    const propertyTitle = contentProperty?.title ? String(contentProperty.title) : "Property"
    const derivedTitle =
      (memoData.title && memoData.title !== "Investment Committee Memo" ? memoData.title : null) ??
      (contentProperty?.title ? `IC Memo: ${propertyTitle}` : null) ??
      (typeof contentEvaluation?.headline === "string" ? String(contentEvaluation.headline) : null) ??
      "Investment Committee Memo"

    const property = contentProperty
      ? ({
          id: memoData.listingId || "",
          title: propertyTitle,
          area: String(contentProperty.area ?? ""),
          propertyType: String(contentProperty.type ?? ""),
          price: 0,
          bedrooms: Number(contentProperty.bedrooms ?? 0),
          bathrooms: Number(contentProperty.bathrooms ?? 0),
          size: contentProperty.size ? Number(contentProperty.size) : undefined,
          images: contentImages?.map((url: string) => ({ url })),
          imageUrl: contentImages?.[0] ?? undefined,
        } as unknown as import("@/lib/types").Property)
      : undefined

    const normalizedContent = toNarrative(content)

    const memo: Memo = {
      id: memoData.id,
      title: derivedTitle,
      investorId: memoData.investorId,
      investorName: "You",
      propertyId: memoData.listingId || "",
      propertyTitle,
      status: normalizeStatus(memoData.state),
      content: normalizedContent,
      analysis: intakeAnalysis ?? undefined,
      createdAt: memoData.createdAt,
      updatedAt: memoData.updatedAt,
    }

    return {
      memo,
      analysis: intakeAnalysis ?? null,
      contentEvaluation: contentEvaluation ?? null,
      structuredContent: content,
      contentSource: contentSource ?? null,
      property,
      normalizedContent,
      mapImageUrl,
      mapCoords: sourceCoords ?? null,
      floorPlanImageUrls,
      isOffplan,
      offplanProject: offplanProject ?? null,
      offplanUnit: offplanUnit ?? null,
      offplanAnalysis: offplanAnalysis ?? null,
      offplanPaymentPlan: offplanPaymentPlan ?? null,
    }
  }, [memoData, content])

  function handleDecisionMade(decision: "interested" | "not_now" | "pass") {
    const toastMessages = {
      interested: { title: "Marked Interested", description: "The realtor has been notified." },
      not_now: { title: "Marked Not Now", description: "The realtor has been notified." },
      pass: { title: "Marked Pass", description: "The realtor has been notified." },
    }
    const { title, description } = toastMessages[decision]
    toast.success(title, { description })

    fetch(`/api/investor/memos/${memoId}`, { headers: { "x-role": "investor" } })
      .then((res) => res.json())
      .then((data) => setMemoData(data))
      .catch(() => toast.error("Failed to refresh memo", { description: "Please reload the page." }))
  }

  async function sendAiChatMessage(messageText?: string) {
    const text = (messageText ?? aiChatInput).trim()
    if (!text) return

    setAiChatMessages((prev) => [...prev, { role: "user", content: text }])
    setAiChatInput("")
    setAiChatLoading(true)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: "memo_assistant",
          pagePath: `/investor/memos/${memoId}`,
          memoId: memoId,
          messages: [{ role: "user", content: text }],
          memoContext: {
            execSummary: content.execSummary,
            assumptions: content.assumptions,
            scenarios: content.scenarios,
            comps: (content.evidence as Record<string, unknown> | undefined)?.comps,
            trustStatus: memoData?.trustStatus,
            trustReason: memoData?.trustReason,
            version: memoData?.currentVersion,
          },
        }),
      })

      const json = await res.json().catch(() => null)
      if (!res.ok) {
        const err = (json && (json.detail || json.error)) || `Request failed (${res.status})`
        setAiChatMessages((prev) => [...prev, { role: "assistant", content: String(err) }])
        return
      }

      const reply = json?.message?.content ?? "I couldn't generate a response."
      setAiChatMessages((prev) => [...prev, { role: "assistant", content: String(reply) }])
    } catch {
      setAiChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
      ])
    } finally {
      setAiChatLoading(false)
      setTimeout(() => {
        chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: "smooth" })
      }, 100)
    }
  }

  async function sendQuestion() {
    if (!question.trim()) return
    setSending(true)
    try {
      const res = await fetch(`/api/investor/memos/${memoId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-role": "investor" },
        body: JSON.stringify({ body: question, versionContext: memoData?.currentVersion }),
      })
      if (res.ok) {
        const created = await res.json()
        setMessages((m) => [...m, created])
        setQuestion("")
      }
    } finally {
      setSending(false)
    }
  }

  function getSuggestedQuestions(): string[] {
    const questions = [
      "What are the key risks in this deal?",
      "Does this investment match my mandate?",
    ]

    if (!memoData?.trustStatus || memoData.trustStatus !== "verified") {
      questions.push("What data in this memo hasn't been verified?")
    }
    if (Array.isArray(content.assumptions) && content.assumptions.length > 0) {
      questions.push("Are these assumptions reasonable for this market?")
    } else {
      questions.push("What assumptions is this analysis based on?")
    }
    if (content.scenarios && typeof content.scenarios === "object" && Object.keys(content.scenarios as Record<string, unknown>).length > 0) {
      questions.push("Walk me through the downside scenario.")
    }

    return questions.slice(0, 5)
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="size-5 animate-spin" />
          <span>Loading memo...</span>
        </div>
      </div>
    )
  }

  if (error || !memoData || !derived) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <div className="text-destructive">Error: {error ?? "Memo not found"}</div>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 size-4" />
          Go back
        </Button>
      </div>
    )
  }

  return (
    <div className="-mx-4 -mt-4 lg:-mx-6 lg:-mt-6">
      {/* Sticky Decision Bar */}
      <div className="sticky top-0 z-40 border-b border-gray-200/60 bg-white/90 backdrop-blur-md">
        <div className="py-2.5 px-2">
          <MemoDecisionPanel
            memoId={memoData.id}
            memoState={memoData.state}
            trustStatus={memoData.trustStatus}
            trustReason={memoData.trustReason}
            currentVersion={currentVersion}
            onDecisionMade={handleDecisionMade}
          />
        </div>
      </div>

      <div className="space-y-4 px-4 py-4 lg:px-6">
        {/* Back navigation */}
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="size-4" />
          Back to memos
        </Button>

        {/* Shared Memo Detail View — same layout/format as the realtor sees */}
        <MemoDetailView
          memo={derived.memo}
          analysis={derived.analysis}
          contentEvaluation={derived.contentEvaluation}
          structuredContent={derived.structuredContent}
          contentSource={derived.contentSource}
          property={derived.property}
          normalizedContent={derived.normalizedContent}
          memoMapImageUrl={derived.mapImageUrl}
          memoMapCoords={derived.mapCoords}
          memoFloorPlanImageUrls={derived.floorPlanImageUrls}
          isOffplan={derived.isOffplan}
          offplanProject={derived.offplanProject}
          offplanUnit={derived.offplanUnit}
          offplanAnalysis={derived.offplanAnalysis}
          offplanPaymentPlan={derived.offplanPaymentPlan}
          routePrefix="/investor"
          headerActions={
            <MemoDownloadActions memo={derived.memo} property={derived.property} />
          }
          sidebarTop={
            /* AI Memo Assistant */
            <Card className="border-sky-200 bg-gradient-to-br from-sky-50/50 to-blue-50/50">
              <div className="p-4 pb-2 flex items-center gap-2 text-sm font-semibold">
                <Bot className="size-4 text-sky-500" />
                Memo Assistant
              </div>
              <CardContent className="p-0">
                <div
                  ref={chatScrollRef}
                  className="max-h-[400px] min-h-[200px] overflow-y-auto p-4 space-y-3"
                >
                  {aiChatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "max-w-[90%] rounded-lg p-3 text-sm leading-relaxed",
                        msg.role === "user"
                          ? "ml-auto bg-primary text-primary-foreground"
                          : "mr-auto bg-white border shadow-sm"
                      )}
                    >
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-headings:my-2 prose-h3:text-sm">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        msg.content
                      )}
                    </div>
                  ))}
                  {aiChatLoading && (
                    <div className="mr-auto flex items-center gap-2 rounded-lg border bg-white p-3 text-sm text-gray-500 shadow-sm">
                      <Loader2 className="size-4 animate-spin" />
                      Thinking...
                    </div>
                  )}
                </div>
                <div className="border-t p-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                      placeholder="Ask about assumptions, risks..."
                      value={aiChatInput}
                      onChange={(e) => setAiChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          sendAiChatMessage()
                        }
                      }}
                      disabled={aiChatLoading}
                    />
                    <Button
                      onClick={() => sendAiChatMessage()}
                      disabled={aiChatLoading || !aiChatInput.trim()}
                      className="bg-sky-500 hover:bg-sky-600"
                    >
                      <Send className="size-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
              {/* Suggested Questions */}
              <div className="p-4 pt-0 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                  <Sparkles className="size-4 text-amber-500" />
                  Suggested questions
                </div>
                <div className="grid gap-2">
                  {getSuggestedQuestions().map((q, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      className="h-auto justify-start text-left whitespace-normal py-2.5 px-3 hover:bg-sky-50 hover:border-sky-300"
                      onClick={() => sendAiChatMessage(q)}
                      disabled={aiChatLoading}
                      size="sm"
                    >
                      <MessageCircle className="size-3.5 shrink-0 mr-2 text-sky-500" />
                      <span className="text-xs">{q}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </Card>
          }
          sidebarBottom={
            /* Q&A History */
            messages.length > 0 ? (
              <Card>
                <div className="p-4 pb-2 flex items-center gap-2 text-sm font-semibold">
                  <MessageCircle className="size-4 text-green-600" />
                  Q&A History
                  <span className="text-xs text-gray-400 font-normal ml-auto">{messages.length} messages</span>
                </div>
                <CardContent className="space-y-3 pt-0">
                  {messages.map((msg) => (
                    <div key={msg.id} className="rounded-lg border bg-card p-3 text-sm">
                      <p className="text-gray-900">{msg.body}</p>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm"
                      placeholder="Save a question to memo history..."
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendQuestion()}
                    />
                    <Button size="sm" onClick={sendQuestion} disabled={sending || !question.trim()}>
                      {sending ? <Loader2 className="size-4 animate-spin" /> : "Save"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null
          }
        />
      </div>
    </div>
  )
}
