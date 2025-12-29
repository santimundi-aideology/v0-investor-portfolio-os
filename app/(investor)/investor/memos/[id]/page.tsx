"use client"

import * as React from "react"
import { useParams } from "next/navigation"

type MemoVersion = {
  version: number
  content: any
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

const badgeClasses: Record<string, string> = {
  verified: "bg-emerald-100 text-emerald-700",
  unknown: "bg-amber-100 text-amber-700",
  flagged: "bg-red-100 text-red-700",
}

export default function InvestorMemoDetailPage() {
  const params = useParams()
  const memoId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string)

  const [memo, setMemo] = React.useState<Memo | null>(null)
  const [messages, setMessages] = React.useState<Message[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [question, setQuestion] = React.useState("")
  const [sending, setSending] = React.useState(false)

  const currentVersion = memo?.versions.find((v) => v.version === memo.currentVersion)
  const content = (currentVersion?.content as any) ?? {}
  const comps = (content.evidence?.comps as any[]) ?? []
  const assumptions = (content.assumptions as string[]) ?? []

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

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading memo…</div>
  if (error || !memo) return <div className="p-6 text-sm text-destructive">Error: {error ?? "Not found"}</div>

  return (
    <div className="p-6 space-y-6">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">Memo</h1>
          <span className="rounded-full bg-muted px-2 py-1 text-xs capitalize">{memo.state}</span>
          <span className="rounded-full bg-muted px-2 py-1 text-xs">v{memo.currentVersion}</span>
          <TrustBadge status={memo.trustStatus ?? "unknown"} reason={memo.trustReason} />
        </div>
        <p className="text-sm text-muted-foreground">
          Created {new Date(memo.createdAt).toLocaleString()} • Updated {new Date(memo.updatedAt).toLocaleString()}
        </p>
      </header>

      <Section title="Executive summary">
        <p className="text-sm leading-6 text-foreground">{content.execSummary ?? "No summary provided."}</p>
      </Section>

      <Section title="Key numbers & scenarios">
        <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
          {content.scenarios ? <pre className="whitespace-pre-wrap text-foreground">{JSON.stringify(content.scenarios, null, 2)}</pre> : "Scenarios not provided."}
        </div>
      </Section>

      <Section title="Assumptions">
        {assumptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No assumptions provided.</p>
        ) : (
          <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
            {assumptions.map((a, idx) => (
              <li key={idx}>{a}</li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Evidence (comps)">
        {comps.length === 0 ? (
          <p className="text-sm text-muted-foreground">No comps provided.</p>
        ) : (
          <div className="space-y-2">
            {comps.map((comp, idx) => (
              <div key={idx} className="rounded-md border bg-card p-3 text-sm">
                <div className="font-medium">{comp.description ?? "Comp"}</div>
                <div className="text-xs text-muted-foreground">
                  Source: {comp.source ?? "n/a"} {comp.source_detail && `• ${comp.source_detail}`}
                </div>
                <div className="mt-1 grid grid-cols-2 gap-2 text-xs text-foreground">
                  {comp.price && <span>Price: {comp.price}</span>}
                  {comp.price_per_sqft && <span>Price/sqft: {comp.price_per_sqft}</span>}
                  {comp.rent_per_year && <span>Rent/yr: {comp.rent_per_year}</span>}
                  {comp.observed_date && <span>Observed: {comp.observed_date}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Q&A">
        <div className="space-y-3">
          <div className="space-y-2">
            {messages.map((msg) => (
              <div key={msg.id} className="rounded-md border bg-card p-3 text-sm">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{msg.senderId ?? msg.sender_id ?? "unknown"}</span>
                  {msg.versionContext ?? msg.version_context ? (
                    <span>Asked on v{msg.versionContext ?? msg.version_context}</span>
                  ) : null}
                </div>
                <div className="mt-1 text-foreground">{msg.body}</div>
              </div>
            ))}
            {messages.length === 0 && <div className="text-sm text-muted-foreground">No questions yet.</div>}
          </div>
          <div className="rounded-lg border bg-card p-3 space-y-2">
            <textarea
              className="w-full rounded-md border bg-background p-2 text-sm"
              rows={3}
              placeholder="Ask a question about this memo..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <button
              onClick={sendQuestion}
              disabled={sending || !question.trim()}
              className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
            >
              {sending ? "Sending..." : "Send question"}
            </button>
            <p className="text-xs text-muted-foreground">
              AI replies reference memo assumptions, evidence, and scenarios only.
            </p>
          </div>
        </div>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      {children}
    </section>
  )
}

function TrustBadge({ status, reason }: { status: "verified" | "unknown" | "flagged"; reason?: string }) {
  const cls = badgeClasses[status] ?? badgeClasses.unknown
  const label = status === "verified" ? "Verified" : status === "flagged" ? "Flagged" : "Unknown"
  return (
    <span className={`rounded-full px-2 py-1 text-xs ${cls}`}>
      {label}
      {reason ? ` • ${reason}` : ""}
    </span>
  )
}

