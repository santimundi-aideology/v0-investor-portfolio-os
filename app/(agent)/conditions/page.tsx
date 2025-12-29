"use client"

import * as React from "react"
import Link from "next/link"

type PendingCondition = {
  memoId: string
  investorId: string
  conditionText?: string
  deadline?: string
  decidedAt?: string
  listingId?: string
}

export default function ConditionsPage() {
  const [items, setItems] = React.useState<PendingCondition[]>([])
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/conditions/pending", { headers: { "x-role": "agent" } })
        if (!res.ok) throw new Error("Failed to load pending conditions")
        const data = await res.json()
        setItems(data)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Conditional Approvals</h1>
        <p className="text-sm text-muted-foreground">Pending conditions for your investors</p>
      </div>
      {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
      {error && <div className="text-sm text-destructive">Error: {error}</div>}
      {!loading && items.length === 0 && <div className="text-sm text-muted-foreground">No pending conditional approvals.</div>}
      <div className="grid gap-3">
        {items.map((item) => (
          <div key={`${item.memoId}-${item.investorId}`} className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Memo {item.memoId}</span>
              <Link className="text-primary hover:underline" href={`/memos/${item.memoId}`}>
                View memo
              </Link>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Investor: {item.investorId} {item.listingId ? `• Listing: ${item.listingId}` : ""}{" "}
              {item.deadline ? `• Deadline: ${item.deadline}` : ""}
              {item.decidedAt ? ` • Decided: ${new Date(item.decidedAt).toLocaleDateString()}` : ""}
            </div>
            <div className="mt-2 text-sm">Condition: {item.conditionText ?? "N/A"}</div>
            <ResolveActions memoId={item.memoId} />
          </div>
        ))}
      </div>
    </div>
  )
}

function ResolveActions({ memoId }: { memoId: string }) {
  const [busy, setBusy] = React.useState<null | "met" | "not_met" | "withdrawn">(null)

  async function resolve(resolution: "met" | "not_met" | "withdrawn") {
    setBusy(resolution)
    try {
      await fetch(`/api/memos/${memoId}/conditions/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-role": "agent" },
        body: JSON.stringify({ resolution }),
      })
      window.location.reload()
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2 text-sm">
      <button
        onClick={() => resolve("met")}
        className="rounded-md bg-emerald-600 px-3 py-1 text-white disabled:opacity-50"
        disabled={!!busy}
      >
        {busy === "met" ? "Saving..." : "Mark met"}
      </button>
      <button
        onClick={() => resolve("not_met")}
        className="rounded-md bg-amber-600 px-3 py-1 text-white disabled:opacity-50"
        disabled={!!busy}
      >
        {busy === "not_met" ? "Saving..." : "Mark not met"}
      </button>
      <button
        onClick={() => resolve("withdrawn")}
        className="rounded-md bg-slate-500 px-3 py-1 text-white disabled:opacity-50"
        disabled={!!busy}
      >
        {busy === "withdrawn" ? "Saving..." : "Withdrawn"}
      </button>
    </div>
  )
}

