"use client"

import * as React from "react"
import Link from "next/link"

type MemoSummary = {
  id: string
  investorId: string
  state: string
  currentVersion: number
  listingId?: string
  createdAt: string
  updatedAt: string
}

export default function InvestorMemosPage() {
  const [memos, setMemos] = React.useState<MemoSummary[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/investor/memos", { headers: { "x-role": "investor" } })
        if (!res.ok) throw new Error("Failed to load memos")
        const data = await res.json()
        setMemos(data)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading memos…</div>
  if (error) return <div className="p-6 text-sm text-destructive">Error: {error}</div>

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Memos</h1>
        <p className="text-sm text-muted-foreground">Deals shared with you</p>
      </div>
      <div className="grid gap-3">
        {memos.map((memo) => (
          <Link
            key={memo.id}
            href={`/investor/memos/${memo.id}`}
            className="rounded-lg border bg-card p-4 shadow-sm hover:border-primary"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Memo {memo.id}</span>
              <span className="rounded-full bg-muted px-2 py-1 text-xs capitalize">{memo.state}</span>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Updated {new Date(memo.updatedAt).toLocaleString()} • Version {memo.currentVersion}
            </div>
          </Link>
        ))}
        {memos.length === 0 && <div className="text-sm text-muted-foreground">No memos yet.</div>}
      </div>
    </div>
  )
}

