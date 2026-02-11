"use client"

import * as React from "react"
import Image from "next/image"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Building2, Calendar, TrendingUp, Sparkles, Loader2, ChevronDown, ChevronUp, ShieldCheck, AlertTriangle, DollarSign, MapPin, BarChart3, Bot, MessageCircle, Send, ImageIcon } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MemoDecisionPanel } from "@/components/investor/memo-decision-panel"
import { cn } from "@/lib/utils"

type Comp = {
  description?: string
  source?: string
  source_detail?: string
  price?: number
  price_per_sqft?: number
  rent_per_year?: number
  observed_date?: string
}

type MemoContent = {
  execSummary?: string
  scenarios?: Record<string, unknown>
  assumptions?: string[]
  evidence?: {
    comps?: Comp[]
  }
}

type MemoVersion = {
  version: number
  content: MemoContent
  createdAt: string
  createdBy: string
}

type Memo = {
  id: string
  investorId: string
  listingId?: string
  state: string
  currentVersion: number
  versions: MemoVersion[]
  createdAt: string
  updatedAt: string
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

const trustBadgeClasses: Record<string, string> = {
  verified: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300",
  unknown: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/50 dark:text-amber-300",
  flagged: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/50 dark:text-red-300",
}

export default function InvestorMemoDetailPage() {
  const params = useParams()
  const router = useRouter()
  const memoId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string)

  const [memo, setMemo] = React.useState<Memo | null>(null)
  const [messages, setMessages] = React.useState<Message[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [question, setQuestion] = React.useState("")
  const [sending, setSending] = React.useState(false)
  const [sectionAiQuestions, setSectionAiQuestions] = React.useState<Record<string, string>>({})
  const [sectionAiAnswers, setSectionAiAnswers] = React.useState<Record<string, string>>({})
  const [sectionAiLoading, setSectionAiLoading] = React.useState<Record<string, boolean>>({})
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({
    summary: true,
    scenarios: true,
    assumptions: true,
    comps: true,
    qa: true,
    aiAssistant: true,
  })

  // Memo Assistant chat state
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

  const currentVersion = memo?.versions.find((v) => v.version === memo.currentVersion)
  const content = currentVersion?.content ?? {}
  // Property-intake memos store rich analysis under content.analysis
  const intakeAnalysis = (content as Record<string, unknown>).analysis as Record<string, unknown> | undefined
  const hasIntakeAnalysis = !!intakeAnalysis
  const comps = content.evidence?.comps ?? []
  const assumptions = content.assumptions ?? []

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/investor/memos/${memoId}`, { headers: { "x-role": "investor" } })
        if (!res.ok) throw new Error("Failed to load memo")
        const data = await res.json()
        setMemo(data)

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

  async function sendQuestion() {
    if (!question.trim()) return
    setSending(true)
    try {
      const res = await fetch(`/api/investor/memos/${memoId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-role": "investor" },
        body: JSON.stringify({ body: question, versionContext: memo?.currentVersion }),
      })
      if (res.ok) {
        const created = await res.json()
        setMessages((m) => [...m, created])
        setQuestion("")

        // Ask AI to reply using memo context only
        const aiRes = await fetch(`/api/investor/memos/${memoId}/messages/ai-reply`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-role": "investor" },
          body: JSON.stringify({ basedOnMemoVersion: memo?.currentVersion }),
        })
        if (aiRes.ok) {
          const aiMessage = await aiRes.json()
          setMessages((m) => [...m, aiMessage])
        }
      }
    } finally {
      setSending(false)
    }
  }

  async function askAiAboutSection(sectionId: string) {
    const question = sectionAiQuestions[sectionId]
    if (!question?.trim()) return

    setSectionAiLoading((prev) => ({ ...prev, [sectionId]: true }))
    try {
      // Simulate AI response based on section context
      await new Promise((resolve) => setTimeout(resolve, 1500))
      
      const sectionContext = getSectionContext(sectionId, content)
      const answer = generateSectionAnswer(sectionId, question, sectionContext)
      
      setSectionAiAnswers((prev) => ({ ...prev, [sectionId]: answer }))
      setSectionAiQuestions((prev) => ({ ...prev, [sectionId]: "" }))
    } finally {
      setSectionAiLoading((prev) => ({ ...prev, [sectionId]: false }))
    }
  }

  function getSectionContext(sectionId: string, content: MemoContent): string {
    switch (sectionId) {
      case "summary":
        return content.execSummary ?? "No summary provided"
      case "scenarios":
        return JSON.stringify(content.scenarios ?? {})
      case "assumptions":
        return (content.assumptions ?? []).join(", ")
      case "comps":
        return JSON.stringify(content.evidence?.comps ?? [])
      default:
        return ""
    }
  }

  function generateSectionAnswer(sectionId: string, question: string, context: string): string {
    // Simplified AI response simulation
    const responses: Record<string, string> = {
      summary: `Based on the executive summary provided, ${context.slice(0, 100)}... The key investment thesis appears sound, but I recommend reviewing the assumptions section for any potential risks.`,
      scenarios: `The scenario analysis shows multiple possible outcomes. ${context ? "The scenarios account for various market conditions." : "Consider requesting additional scenario modeling."} Your question about "${question.slice(0, 30)}" relates to the risk/return profile.`,
      assumptions: `Regarding your question about assumptions: ${context ? `The memo lists ${context.split(",").length} key assumptions.` : "No specific assumptions were documented."} I recommend verifying each assumption against current market data.`,
      comps: `The comparable analysis includes properties that support the valuation. ${context ? "Multiple data points were provided." : "Limited comps were available."} Consider the recency and relevance of each comparable.`,
    }
    return responses[sectionId] ?? "I can help analyze this section. Please review the data carefully and let me know if you have specific concerns."
  }

  function toggleSection(sectionId: string) {
    setExpandedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }))
  }

  function handleDecisionMade(decision: "interested" | "not_now" | "pass") {
    // Show success toast based on decision type
    const toastMessages = {
      interested: { title: "Marked Interested", description: "The realtor has been notified." },
      not_now: { title: "Marked Not Now", description: "The realtor has been notified." },
      pass: { title: "Marked Pass", description: "The realtor has been notified." },
    }
    const { title, description } = toastMessages[decision]
    toast.success(title, { description })

    // Refresh memo state after decision
    fetch(`/api/investor/memos/${memoId}`, { headers: { "x-role": "investor" } })
      .then((res) => res.json())
      .then((data) => setMemo(data))
      .catch(() => {
        toast.error("Failed to refresh memo", { description: "Please reload the page." })
      })
  }

  // Memo Assistant AI chat function
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
          // Include memo context in the request
          memoContext: {
            execSummary: content.execSummary,
            assumptions: content.assumptions,
            scenarios: content.scenarios,
            comps: content.evidence?.comps,
            trustStatus: memo?.trustStatus,
            trustReason: memo?.trustReason,
            version: memo?.currentVersion,
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
    } catch (err) {
      setAiChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
      ])
    } finally {
      setAiChatLoading(false)
      // Scroll to bottom of chat
      setTimeout(() => {
        chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: "smooth" })
      }, 100)
    }
  }

  // Generate suggested questions based on memo content
  function getSuggestedQuestions(): string[] {
    const questions: string[] = []

    // Always include fundamental questions
    questions.push("What are the key risks in this deal?")
    questions.push("Does this investment match my mandate?")

    // Trust-related questions
    if (!memo?.trustStatus || memo.trustStatus !== "verified") {
      questions.push("What data in this memo hasn't been verified?")
    }

    // Assumption-related questions
    if (assumptions.length > 0) {
      questions.push("Are these assumptions reasonable for this market?")
    } else {
      questions.push("What assumptions is this analysis based on?")
    }

    // Scenario-related questions
    if (content.scenarios && Object.keys(content.scenarios).length > 0) {
      questions.push("Walk me through the downside scenario.")
    }

    // Comp-related questions
    if (comps.length > 0) {
      questions.push("How do these comparables support the valuation?")
    } else {
      questions.push("Why are there no comparables in this memo?")
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

  if (error || !memo) {
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
            memoId={memo.id}
            memoState={memo.state}
            trustStatus={memo.trustStatus}
            trustReason={memo.trustReason}
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

        {/* Two-column layout: Report (left) + Sidebar (right) */}
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* ── Left Column: Memo Report ──────────────────────────── */}
          <div className="min-w-0 space-y-6">

        {/* Memo Header */}
        {(() => {
          const contentProp = (content as Record<string, unknown>).property as Record<string, unknown> | undefined
          const contentNumbers = (content as Record<string, unknown>).numbers as Record<string, unknown> | undefined
          const evaluation = (content as Record<string, unknown>).evaluation as Record<string, unknown> | undefined
          const memoTitle =
            (memo.title && memo.title !== "Investment Committee Memo" ? memo.title : undefined) ??
            (contentProp?.title ? `IC Memo: ${String(contentProp.title)}` : undefined) ??
            "Investment Memo"
          const memoSubtitle =
            (contentProp?.area ? String(contentProp.area) : undefined) ??
            "Review and make your decision"
          const heroImage = (contentProp?.images as string[] | undefined)?.[0]
          return (
            <header className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
              {/* Hero cover image */}
              {heroImage ? (
                <div className="relative h-56 w-full bg-gray-100">
                  <Image
                    src={heroImage}
                    alt={String(contentProp?.title ?? "Property")}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 960px"
                    unoptimized
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-4 left-6 right-6">
                    <h1 className="text-2xl font-bold text-white drop-shadow-sm">{memoTitle}</h1>
                    <p className="text-sm text-white/80">{memoSubtitle}</p>
                  </div>
                </div>
              ) : null}
              <div className="p-6 space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-3">
                    {!heroImage ? (
                      <div className="flex items-center gap-3">
                        <div className="flex size-12 items-center justify-center rounded-xl bg-green-50">
                          <Building2 className="size-6 text-green-600" />
                        </div>
                        <div>
                          <h1 className="text-2xl font-bold">{memoTitle}</h1>
                          <p className="text-sm text-gray-500">{memoSubtitle}</p>
                        </div>
                      </div>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge variant="secondary" className="capitalize">
                        {memo.state.replace("_", " ")}
                      </Badge>
                      <Badge variant="outline">Version {memo.currentVersion}</Badge>
                      <TrustBadgeLarge status={memo.trustStatus ?? "unknown"} reason={memo.trustReason} />
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <Calendar className="size-4" />
                      Created {new Date(memo.createdAt).toLocaleDateString()}
                    </div>
                    <div className="mt-1">
                      Updated {new Date(memo.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                {/* Property Overview (intake memos) */}
                {contentProp ? (
                  <div className="grid gap-3 rounded-lg border bg-gray-50 p-4 text-sm sm:grid-cols-2 md:grid-cols-4">
                    {contentProp.type ? <StatTile label="Type" value={String(contentProp.type)} /> : null}
                    {contentProp.beds ? <StatTile label="Bedrooms" value={String(contentProp.beds)} /> : null}
                    {contentProp.size ? <StatTile label="Size" value={String(contentProp.size)} /> : null}
                    {contentNumbers?.askingPrice ? <StatTile label="Asking Price" value={formatCurrencyAED(Number(contentNumbers.askingPrice))} /> : null}
                    {contentNumbers?.pricePerSqft ? <StatTile label="Price / sqft" value={`AED ${Number(contentNumbers.pricePerSqft).toLocaleString()}`} /> : null}
                    {contentNumbers?.rentalYield ? <StatTile label="Rental Yield" value={`${Number(contentNumbers.rentalYield).toFixed(1)}%`} /> : null}
                  </div>
                ) : null}
                {/* AI Score (evaluation) */}
                {evaluation?.score != null ? (
                  <div className="flex items-center gap-3 rounded-lg border bg-gray-50 p-3 text-sm">
                    <div className="flex size-10 items-center justify-center rounded-full border-2 border-green-300 text-sm font-bold text-green-600">
                      {String(evaluation.score)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{String(evaluation.headline ?? "AI Investment Analysis")}</p>
                      {evaluation.reasoning ? <p className="text-xs text-gray-500">{String(evaluation.reasoning)}</p> : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </header>
          )
        })()}

        {/* Executive Summary Section */}
        <CollapsibleSection
          id="summary"
          title="Executive Summary"
          icon={<BarChart3 className="size-5 text-green-600" />}
          expanded={expandedSections.summary}
          onToggle={() => toggleSection("summary")}
        >
          <div className="space-y-4">
            <p className="text-base leading-7 text-gray-900">
              {content.execSummary ?? (intakeAnalysis?.summary as string) ?? "No executive summary provided."}
            </p>
            {(intakeAnalysis?.keyPoints as string[])?.length ? (
              <ul className="space-y-2 text-sm">
                {(intakeAnalysis.keyPoints as string[]).map((point, idx) => (
                  <li key={idx} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" /><span>{point}</span></li>
                ))}
              </ul>
            ) : null}
            <AskAiAboutSection
              sectionId="summary"
              question={sectionAiQuestions.summary ?? ""}
              answer={sectionAiAnswers.summary}
              loading={sectionAiLoading.summary ?? false}
              onQuestionChange={(q) => setSectionAiQuestions((prev) => ({ ...prev, summary: q }))}
              onAsk={() => askAiAboutSection("summary")}
              placeholder="Ask AI about this summary..."
            />
          </div>
        </CollapsibleSection>

        {/* ── Property-Intake Rich Analysis Sections ── */}
        {hasIntakeAnalysis ? (
          <IntakeAnalysisSections analysis={intakeAnalysis} content={content as Record<string, unknown>} />
        ) : (
          <>
            {/* Key Numbers & Scenarios Section (legacy format) */}
            <CollapsibleSection
              id="scenarios"
              title="Key Numbers & Scenarios"
              icon={<TrendingUp className="size-5 text-green-600" />}
              expanded={expandedSections.scenarios}
              onToggle={() => toggleSection("scenarios")}
            >
              <div className="space-y-4">
                {content.scenarios ? (
                  <ScenarioCards scenarios={content.scenarios} />
                ) : (
                  <div className="rounded-lg border-2 border-dashed bg-gray-50 p-6 text-center text-gray-500">
                    No scenario data provided in this memo.
                  </div>
                )}
                <AskAiAboutSection
                  sectionId="scenarios"
                  question={sectionAiQuestions.scenarios ?? ""}
                  answer={sectionAiAnswers.scenarios}
                  loading={sectionAiLoading.scenarios ?? false}
                  onQuestionChange={(q) => setSectionAiQuestions((prev) => ({ ...prev, scenarios: q }))}
                  onAsk={() => askAiAboutSection("scenarios")}
                  placeholder="Ask AI about these scenarios..."
                />
              </div>
            </CollapsibleSection>

            {/* Assumptions Section (legacy format) */}
            <CollapsibleSection
              id="assumptions"
              title="Key Assumptions"
              icon={<AlertTriangle className="size-5 text-amber-500" />}
              expanded={expandedSections.assumptions}
              onToggle={() => toggleSection("assumptions")}
            >
              <div className="space-y-4">
                {assumptions.length === 0 ? (
                  <div className="rounded-lg border-2 border-dashed bg-gray-50 p-6 text-center text-gray-500">
                    No assumptions documented in this memo.
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {assumptions.map((assumption, idx) => (
                      <div key={idx} className="flex items-start gap-3 rounded-lg border bg-card p-4 shadow-sm">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-green-50 text-xs font-semibold text-green-600">{idx + 1}</span>
                        <p className="text-sm leading-relaxed text-gray-900">{assumption}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CollapsibleSection>

            {/* Comparable Properties Section (legacy format) */}
            <CollapsibleSection
              id="comps"
              title="Evidence: Comparable Properties"
              icon={<MapPin className="size-5 text-green-600" />}
              expanded={expandedSections.comps}
              onToggle={() => toggleSection("comps")}
              badge={comps.length > 0 ? `${comps.length} comps` : undefined}
            >
              <div className="space-y-4">
                {comps.length === 0 ? (
                  <div className="rounded-lg border-2 border-dashed bg-gray-50 p-6 text-center text-gray-500">
                    No comparable properties provided in this memo.
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {comps.map((comp, idx) => (
                      <CompCard key={idx} comp={comp} index={idx} />
                    ))}
                  </div>
                )}
              </div>
            </CollapsibleSection>
          </>
        )}

        </div>{/* end left column */}

          {/* ── Right Sidebar ─────────────────────────────────────── */}
          <aside className="space-y-6 lg:sticky lg:top-14 lg:self-start lg:max-h-[calc(100vh-4.5rem)] lg:overflow-y-auto">

        {/* Memo Assistant AI Chat Section */}
        <CollapsibleSection
          id="aiAssistant"
          title="Memo Assistant"
          icon={<Bot className="size-5 text-sky-500" />}
          expanded={expandedSections.aiAssistant}
          onToggle={() => toggleSection("aiAssistant")}
        >
          <div className="space-y-4">
            {/* AI Chat Interface */}
            <Card className="border-sky-200 dark:border-sky-800 bg-gradient-to-br from-sky-50/50 to-blue-50/50 dark:from-sky-950/30 dark:to-blue-950/30">
              <CardContent className="p-0">
                {/* Chat messages */}
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
                          ? "ml-auto bg-primary text-green-600-foreground"
                          : "mr-auto bg-white dark:bg-slate-800 border shadow-sm"
                      )}
                    >
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-headings:my-2 prose-h3:text-sm">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        msg.content
                      )}
                    </div>
                  ))}
                  {aiChatLoading && (
                    <div className="mr-auto flex items-center gap-2 rounded-lg border bg-white dark:bg-slate-800 p-3 text-sm text-gray-500 shadow-sm">
                      <Loader2 className="size-4 animate-spin" />
                      Thinking...
                    </div>
                  )}
                </div>

                {/* Input area */}
                <div className="border-t p-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                      placeholder="Ask about assumptions, scenarios, risks..."
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
            </Card>

            {/* Suggested Questions */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                <Sparkles className="size-4 text-amber-500" />
                Suggested questions
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {getSuggestedQuestions().map((q, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    className="h-auto justify-start text-left whitespace-normal py-3 px-4 hover:bg-sky-50 hover:border-sky-300 dark:hover:bg-sky-950 dark:hover:border-sky-700"
                    onClick={() => sendAiChatMessage(q)}
                    disabled={aiChatLoading}
                  >
                    <MessageCircle className="size-4 shrink-0 mr-2 text-sky-500" />
                    <span className="text-sm">{q}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Q&A History Section */}
        <CollapsibleSection
          id="qa"
          title="Questions & Answers History"
          icon={<MessageCircle className="size-5 text-green-600" />}
          expanded={expandedSections.qa}
          onToggle={() => toggleSection("qa")}
          badge={messages.length > 0 ? `${messages.length} messages` : undefined}
        >
          <div className="space-y-4">
            <div className="space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className="rounded-lg border bg-card p-4 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="font-medium">{msg.senderId ?? msg.sender_id ?? "Unknown"}</span>
                    {(msg.versionContext ?? msg.version_context) && (
                      <Badge variant="outline" className="text-xs">
                        Asked on v{msg.versionContext ?? msg.version_context}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-gray-900">{msg.body}</p>
                </div>
              ))}
              {messages.length === 0 && (
                <div className="rounded-lg border-2 border-dashed bg-gray-50 p-6 text-center text-gray-500">
                  No saved questions yet. Questions you ask the Memo Assistant above will be logged here.
                </div>
              )}
            </div>

            <Card className="border-green-100 bg-white">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-green-50">
                    <Sparkles className="size-4 text-green-600" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <textarea
                      className="w-full rounded-lg border bg-background p-3 text-sm"
                      rows={3}
                      placeholder="Ask a question to save in memo history..."
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                    />
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        This saves the question to the memo for team reference.
                      </p>
                      <Button
                        onClick={sendQuestion}
                        disabled={sending || !question.trim()}
                        size="sm"
                      >
                        {sending ? (
                          <>
                            <Loader2 className="mr-2 size-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          "Save Question"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CollapsibleSection>

          </aside>{/* end right sidebar */}
        </div>{/* end grid */}
      </div>
    </div>
  )
}

// ─── Property-Intake Rich Analysis ──────────────────────────────────
// Renders full analysis from property-intake memos so the investor
// sees the same rich data the realtor created.

function formatCurrencyAED(value?: number) {
  if (typeof value !== "number") return "—"
  return new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED", maximumFractionDigits: 0 }).format(value)
}
function formatPct(value?: number) {
  if (typeof value !== "number") return "—"
  return new Intl.NumberFormat("en-AE", { style: "percent", maximumFractionDigits: 1 }).format(value)
}

function StatTile({ label, value, hint }: { label: string; value?: string | number; hint?: string }) {
  return (
    <div className="rounded-lg border bg-gray-50 p-3">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-base font-semibold">{value ?? "—"}</p>
      {hint ? <p className="text-xs text-gray-500">{hint}</p> : null}
    </div>
  )
}

function IntakeAnalysisSections({ analysis, content }: { analysis: Record<string, unknown>; content: Record<string, unknown> }) {
  const neighborhood = analysis.neighborhood as Record<string, unknown> | undefined
  const property = analysis.property as Record<string, unknown> | undefined
  const market = analysis.market as Record<string, unknown> | undefined
  const pricing = analysis.pricing as Record<string, unknown> | undefined
  const strategy = analysis.strategy as Record<string, unknown> | undefined
  const financialAnalysis = analysis.financialAnalysis as Record<string, unknown> | undefined
  const returnBridge = financialAnalysis?.returnBridge as Record<string, unknown> | undefined
  const growth = analysis.growth as Record<string, unknown> | undefined
  const risks = analysis.risks as Array<{ risk: string; mitigation: string }> | undefined
  const comparables = analysis.comparables as Array<Record<string, unknown>> | undefined
  const finalRec = analysis.finalRecommendation as Record<string, unknown> | undefined

  // Images from content.property.images (property-intake stores them as string[])
  const contentProperty = content.property as Record<string, unknown> | undefined
  const images = (contentProperty?.images as string[] | undefined)?.filter(Boolean) ?? []

  return (
    <>
      {/* Property Photos */}
      {images.length > 0 ? (
        <Card className="border-gray-100 overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ImageIcon className="size-5 text-green-600" />
              Property Photos
              <Badge variant="secondary" className="ml-auto text-xs">{images.length} photos</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {images.slice(0, 9).map((url, idx) => (
                <div key={`${url}-${idx}`} className="group relative h-48 overflow-hidden rounded-lg border bg-gray-100">
                  <Image
                    src={url}
                    alt={`Property photo ${idx + 1}`}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
      {/* Neighborhood Analysis */}
      {neighborhood ? (
        <Card className="border-gray-100">
          <CardHeader className="pb-3"><CardTitle className="text-lg">Neighborhood Analysis</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center gap-2"><Badge variant="secondary" className="uppercase">Grade {String(neighborhood.grade ?? "—")}</Badge></div>
            <p className="text-gray-500">{String(neighborhood.profile ?? "")}</p>
            {(neighborhood.metrics as Array<{label:string;value:string;trend?:string}>)?.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {(neighborhood.metrics as Array<{label:string;value:string;trend?:string}>).map((m) => (
                  <StatTile key={m.label} label={m.label} value={m.value} hint={m.trend} />
                ))}
              </div>
            ) : null}
            {(neighborhood.highlights as string[])?.length ? (
              <ul className="space-y-2 text-sm">{(neighborhood.highlights as string[]).map((h, i) => (
                <li key={i} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" /><span>{h}</span></li>
              ))}</ul>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* Property Description */}
      {property ? (
        <Card className="border-gray-100">
          <CardHeader className="pb-3"><CardTitle className="text-lg">Property Description</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-gray-500">{String(property.description ?? "")}</p>
            {(property.specs as Array<{label:string;value:string}>)?.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {(property.specs as Array<{label:string;value:string}>).map((s) => (
                  <StatTile key={s.label} label={s.label} value={s.value} />
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* Market Analysis */}
      {market ? (
        <Card className="border-gray-100">
          <CardHeader className="pb-3"><CardTitle className="text-lg">Market Analysis</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-gray-500">{String(market.overview ?? "")}</p>
            {(market.drivers as string[])?.length ? (
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Key Drivers</p>
                <ul className="mt-2 space-y-2 text-sm">{(market.drivers as string[]).map((d, i) => (
                  <li key={i} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" /><span>{d}</span></li>
                ))}</ul>
              </div>
            ) : null}
            <div className="grid gap-3 md:grid-cols-3">
              {market.supply ? <StatTile label="Supply" value={String(market.supply)} hint="Pipeline view" /> : null}
              {market.demand ? <StatTile label="Demand" value={String(market.demand)} hint="Tenant profile" /> : null}
              {market.absorption ? <StatTile label="Absorption" value={String(market.absorption)} hint="Last 12 months" /> : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Future Value Outlook */}
      {growth ? (
        <Card className="border-gray-100">
          <CardHeader className="pb-3"><CardTitle className="text-lg">Future Value Outlook</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            {growth.narrative ? <p className="text-gray-500">{String(growth.narrative)}</p> : null}
            <div className="grid gap-3 md:grid-cols-3">
              {growth.projectedValue1Y != null ? <StatTile label="Projected 1Y" value={formatCurrencyAED(Number(growth.projectedValue1Y))} /> : null}
              {growth.projectedValue3Y != null ? <StatTile label="Projected 3Y" value={formatCurrencyAED(Number(growth.projectedValue3Y))} /> : null}
              {growth.projectedValue5Y != null ? <StatTile label="Projected 5Y" value={formatCurrencyAED(Number(growth.projectedValue5Y))} /> : null}
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {growth.annualGrowthBase != null ? <StatTile label="Base Growth" value={`${growth.annualGrowthBase}% / year`} /> : null}
              {growth.annualGrowthConservative != null ? <StatTile label="Conservative" value={`${growth.annualGrowthConservative}% / year`} /> : null}
              {growth.annualGrowthUpside != null ? <StatTile label="Upside" value={`${growth.annualGrowthUpside}% / year`} /> : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Pricing & Upside */}
      {pricing ? (
        <Card className="border-gray-100">
          <CardHeader className="pb-3"><CardTitle className="text-lg">Pricing & Upside</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid gap-3 md:grid-cols-3">
              <StatTile label="Asking Price" value={formatCurrencyAED(Number(pricing.askingPrice))} />
              <StatTile label="Recommended Offer" value={formatCurrencyAED(Number(pricing.recommendedOffer))} />
              <StatTile label="Stabilized Value" value={formatCurrencyAED(Number(pricing.stabilizedValue))} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">In-place Rent</p>
                <p className="text-xl font-semibold">{formatCurrencyAED(Number(pricing.rentCurrent))}</p>
                <p className="text-sm text-gray-500">Stabilized: {formatCurrencyAED(Number(pricing.rentPotential))}</p>
              </div>
              <div className="rounded-lg border bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Projected Returns</p>
                <p className="text-xl font-semibold">{formatPct(Number(pricing.irr))}</p>
                <p className="text-sm text-gray-500">Equity multiple: {pricing.equityMultiple ? `${Number(pricing.equityMultiple).toFixed(2)}x` : "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Comparable Sales */}
      {comparables?.length ? (
        <Card className="border-gray-100">
          <CardHeader className="pb-3"><CardTitle className="text-lg">Comparable Sales</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {comparables.map((comp, idx) => (
              <div key={idx} className="rounded-lg border bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-medium">
                  <span>{String(comp.name ?? `Comp ${idx + 1}`)}</span>
                  <span className="text-gray-500">{String(comp.distance ?? "")}</span>
                </div>
                <p className="text-xs uppercase text-gray-500">{String(comp.closingDate ?? "")}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div><p className="text-xs uppercase text-gray-500">Price</p><p className="text-base font-semibold">{formatCurrencyAED(Number(comp.price))}</p></div>
                  <div><p className="text-xs uppercase text-gray-500">Size</p><p className="text-base font-semibold">{String(comp.size ?? "—")}</p></div>
                  <div><p className="text-xs uppercase text-gray-500">Price / sq ft</p><p className="text-base font-semibold">{formatCurrencyAED(Number(comp.pricePerSqft))}/sqft</p></div>
                </div>
                {comp.note ? <p className="mt-2 text-sm text-gray-500">{String(comp.note)}</p> : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {/* Strategy & Execution */}
      {strategy ? (
        <Card className="border-gray-100">
          <CardHeader className="pb-3"><CardTitle className="text-lg">Strategy & Execution</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-gray-500">{String(strategy.plan ?? "")}</p>
            <div className="text-xs text-gray-500">{String(strategy.holdPeriod ?? "")} &bull; {String(strategy.exit ?? "")}</div>
            {(strategy.focusPoints as string[])?.length ? (
              <ul className="space-y-2 text-sm">{(strategy.focusPoints as string[]).map((p, i) => (
                <li key={i} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" /><span>{p}</span></li>
              ))}</ul>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* Investment Thesis + Financial Analysis */}
      {(analysis.investmentThesis || financialAnalysis) ? (
        <div className="grid gap-6 md:grid-cols-2">
          {analysis.investmentThesis ? (
            <Card className="border-gray-100"><CardHeader className="pb-3"><CardTitle className="text-lg">Investment Thesis</CardTitle></CardHeader><CardContent className="text-sm text-gray-500">{String(analysis.investmentThesis)}</CardContent></Card>
          ) : null}
          {financialAnalysis ? (
            <Card className="border-gray-100"><CardHeader className="pb-3"><CardTitle className="text-lg">Financial Analysis</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
              {financialAnalysis.noi != null ? <div className="flex justify-between"><span className="text-gray-500">Current NOI:</span><span className="font-semibold">{formatCurrencyAED(Number(financialAnalysis.noi))}</span></div> : null}
              {financialAnalysis.capRate != null ? <div className="flex justify-between"><span className="text-gray-500">Cap Rate:</span><span className="font-semibold">{formatPct(Number(financialAnalysis.capRate) / 100)}</span></div> : null}
              {financialAnalysis.targetIrr != null ? <div className="flex justify-between"><span className="text-gray-500">Target IRR:</span><span className="font-semibold">{formatPct(Number(financialAnalysis.targetIrr) / 100)}</span></div> : null}
              {financialAnalysis.holdPeriod ? <div className="flex justify-between"><span className="text-gray-500">Hold Period:</span><span className="font-semibold">{String(financialAnalysis.holdPeriod)}</span></div> : null}
            </CardContent></Card>
          ) : null}
        </div>
      ) : null}

      {/* ROI on Equity Bridge */}
      {returnBridge ? (
        <Card className="border-gray-100">
          <CardHeader className="pb-3"><CardTitle className="text-lg">ROI on Equity Bridge</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {[
              { label: "Purchase price", value: formatCurrencyAED(Number(returnBridge.purchasePrice)) },
              { label: "DLD fee", value: formatCurrencyAED(Number(returnBridge.dldFee)) },
              { label: "Broker fee", value: formatCurrencyAED(Number(returnBridge.brokerFee)) },
              { label: "Renovation", value: formatCurrencyAED(Number(returnBridge.renovation)) },
              { label: "Total project cost", value: formatCurrencyAED(Number(returnBridge.totalProjectCost)) },
              { label: "Mortgage amount", value: formatCurrencyAED(Number(returnBridge.mortgageAmount)) },
              { label: "Mortgage LTV", value: `${Number(returnBridge.mortgageLtvPct ?? 70).toFixed(1)}%` },
              { label: "Equity invested", value: formatCurrencyAED(Number(returnBridge.equityInvested)) },
              { label: "Annual interest", value: formatCurrencyAED(Number(returnBridge.annualInterest)) },
              { label: "Resale price", value: formatCurrencyAED(Number(returnBridge.resalePrice)) },
              { label: "Net profit (after interest)", value: formatCurrencyAED(Number(returnBridge.netProfitAfterInterest)) },
              { label: "ROI on equity", value: `${Number(returnBridge.roiOnEquityPct).toFixed(1)}%` },
            ].map((row) => (
              <div key={row.label} className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-md border bg-gray-50 px-3 py-2">
                <p className="text-sm text-gray-600">{row.label}</p>
                <p className="text-sm font-semibold text-gray-900">{row.value}</p>
              </div>
            ))}
            {returnBridge.assumptions ? <p className="text-xs text-gray-500">{String(returnBridge.assumptions)}</p> : null}
          </CardContent>
        </Card>
      ) : null}

      {/* Risks & Mitigations */}
      {risks?.length ? (
        <Card className="border-gray-100">
          <CardHeader className="pb-3"><CardTitle className="text-lg">Risks & Mitigations</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {risks.map((r, idx) => (
              <div key={idx} className="flex gap-2"><span className="font-semibold text-gray-900">{idx + 1}.</span><span><span className="text-gray-700">{r.risk}</span>{r.mitigation ? <> — <span className="text-gray-500">{r.mitigation}</span></> : null}</span></div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {/* Final Recommendation */}
      {finalRec ? (
        <Card className={String(finalRec.decision) === "PROCEED" ? "border-green-200 bg-green-50" : String(finalRec.decision) === "CONDITIONAL" ? "border-amber-200 bg-amber-50" : "border-red-200 bg-red-50"}>
          <CardHeader><CardTitle className="text-lg">Recommendation</CardTitle></CardHeader>
          <CardContent>
            <p className="text-lg font-bold">{String(finalRec.decision)}</p>
            {finalRec.condition ? <p className="text-gray-600">{String(finalRec.condition)}</p> : null}
          </CardContent>
        </Card>
      ) : null}
    </>
  )
}

// ─── Original Helper Components ─────────────────────────────────────

function CollapsibleSection({
  id,
  title,
  icon,
  expanded,
  onToggle,
  badge,
  children,
}: {
  id: string
  title: string
  icon: React.ReactNode
  expanded: boolean
  onToggle: () => void
  badge?: string
  children: React.ReactNode
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="cursor-pointer select-none hover:bg-gray-100 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-lg">
            {icon}
            {title}
            {badge && (
              <Badge variant="secondary" className="ml-2">
                {badge}
              </Badge>
            )}
          </CardTitle>
          {expanded ? (
            <ChevronUp className="size-5 text-gray-500" />
          ) : (
            <ChevronDown className="size-5 text-gray-500" />
          )}
        </div>
      </CardHeader>
      {expanded && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  )
}

function AskAiAboutSection({
  sectionId,
  question,
  answer,
  loading,
  onQuestionChange,
  onAsk,
  placeholder,
}: {
  sectionId: string
  question: string
  answer?: string
  loading: boolean
  onQuestionChange: (q: string) => void
  onAsk: () => void
  placeholder: string
}) {
  return (
    <div className="mt-4 rounded-lg border bg-gray-50 p-4">
      <div className="flex items-start gap-3">
        <Sparkles className="size-4 shrink-0 text-green-600 mt-0.5" />
        <div className="flex-1 space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm"
              placeholder={placeholder}
              value={question}
              onChange={(e) => onQuestionChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onAsk()}
            />
            <Button size="sm" onClick={onAsk} disabled={!question.trim() || loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Ask AI"}
            </Button>
          </div>
          {answer && (
            <div className="rounded-lg bg-green-50 p-3 text-sm leading-relaxed text-gray-900">
              {answer}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ScenarioCards({ scenarios }: { scenarios: Record<string, unknown> }) {
  const entries = Object.entries(scenarios)
  
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed bg-gray-50 p-6 text-center text-gray-500">
        No scenarios defined.
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map(([key, value]) => (
        <Card key={key} className="border-gray-100 bg-white">
          <CardContent className="p-4">
            <h4 className="font-semibold capitalize text-gray-900">{key.replace(/_/g, " ")}</h4>
            <div className="mt-2 text-sm text-gray-500">
              {typeof value === "object" ? (
                <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(value, null, 2)}</pre>
              ) : (
                String(value)
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function CompCard({ comp, index }: { comp: Comp; index: number }) {
  const formatCurrency = (value?: number) => {
    if (typeof value !== "number") return "—"
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency: "AED",
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <Card className="overflow-hidden border-border/50 hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        <div className="flex items-center gap-3 border-b bg-gray-50 px-4 py-3">
          <span className="flex size-8 items-center justify-center rounded-full bg-green-50 text-sm font-semibold text-green-600">
            {index + 1}
          </span>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 truncate">
              {comp.description ?? `Comparable ${index + 1}`}
            </h4>
            <p className="text-xs text-gray-500">
              {comp.source ?? "Unknown source"}
              {comp.source_detail && ` • ${comp.source_detail}`}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px bg-border">
          {comp.price != null && (
            <div className="bg-card p-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <DollarSign className="size-3.5" />
                Price
              </div>
              <div className="mt-1 font-semibold text-gray-900">{formatCurrency(comp.price)}</div>
            </div>
          )}
          {comp.price_per_sqft != null && (
            <div className="bg-card p-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <BarChart3 className="size-3.5" />
                Price/sqft
              </div>
              <div className="mt-1 font-semibold text-gray-900">{formatCurrency(comp.price_per_sqft)}</div>
            </div>
          )}
          {comp.rent_per_year != null && (
            <div className="bg-card p-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <TrendingUp className="size-3.5" />
                Rent/year
              </div>
              <div className="mt-1 font-semibold text-gray-900">{formatCurrency(comp.rent_per_year)}</div>
            </div>
          )}
          {comp.observed_date && (
            <div className="bg-card p-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Calendar className="size-3.5" />
                Observed
              </div>
              <div className="mt-1 font-semibold text-gray-900">{comp.observed_date}</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function TrustBadgeLarge({ status, reason }: { status: "verified" | "unknown" | "flagged"; reason?: string }) {
  const config = {
    verified: {
      icon: ShieldCheck,
      label: "Verified",
    },
    unknown: {
      icon: AlertTriangle,
      label: "Unverified",
    },
    flagged: {
      icon: AlertTriangle,
      label: "Flagged",
    },
  }

  const { icon: Icon, label } = config[status]
  const className = trustBadgeClasses[status] ?? trustBadgeClasses.unknown

  return (
    <Badge variant="outline" className={cn("gap-1.5 px-3 py-1.5 text-sm", className)}>
      <Icon className="size-4" />
      {label}
      {reason && <span className="opacity-75 ml-1">• {reason}</span>}
    </Badge>
  )
}
