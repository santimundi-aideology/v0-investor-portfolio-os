"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Building2, Calendar, TrendingUp, Sparkles, Loader2, ChevronDown, ChevronUp, ShieldCheck, AlertTriangle, DollarSign, MapPin, BarChart3, Bot, MessageCircle, Send } from "lucide-react"
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
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Decision Panel */}
      <div className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto max-w-5xl px-6 py-4">
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

      <div className="mx-auto max-w-5xl px-6 py-8 space-y-8">
        {/* Back navigation */}
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="size-4" />
          Back to memos
        </Button>

        {/* Memo Header */}
        <header className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-xl bg-green-50">
                  <Building2 className="size-6 text-green-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Investment Memo</h1>
                  <p className="text-sm text-gray-500">Review and make your decision</p>
                </div>
              </div>
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
        </header>

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
              {content.execSummary ?? "No executive summary provided."}
            </p>
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

        {/* Key Numbers & Scenarios Section */}
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

        {/* Assumptions Section */}
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
                  <div
                    key={idx}
                    className="flex items-start gap-3 rounded-lg border bg-card p-4 shadow-sm"
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-green-50 text-xs font-semibold text-green-600">
                      {idx + 1}
                    </span>
                    <p className="text-sm leading-relaxed text-gray-900">{assumption}</p>
                  </div>
                ))}
              </div>
            )}
            <AskAiAboutSection
              sectionId="assumptions"
              question={sectionAiQuestions.assumptions ?? ""}
              answer={sectionAiAnswers.assumptions}
              loading={sectionAiLoading.assumptions ?? false}
              onQuestionChange={(q) => setSectionAiQuestions((prev) => ({ ...prev, assumptions: q }))}
              onAsk={() => askAiAboutSection("assumptions")}
              placeholder="Ask AI to verify these assumptions..."
            />
          </div>
        </CollapsibleSection>

        {/* Comparable Properties Section */}
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
            <AskAiAboutSection
              sectionId="comps"
              question={sectionAiQuestions.comps ?? ""}
              answer={sectionAiAnswers.comps}
              loading={sectionAiLoading.comps ?? false}
              onQuestionChange={(q) => setSectionAiQuestions((prev) => ({ ...prev, comps: q }))}
              onAsk={() => askAiAboutSection("comps")}
              placeholder="Ask AI about these comparables..."
            />
          </div>
        </CollapsibleSection>

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
      </div>
    </div>
  )
}

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
