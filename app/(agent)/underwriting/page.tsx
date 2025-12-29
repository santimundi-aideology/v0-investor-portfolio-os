"use client"

import * as React from "react"
import Link from "next/link"

type Underwriting = {
  id: string
  investorId: string
  listingId?: string
  createdAt: string
  updatedAt: string
}

export default function UnderwritingListPage() {
  const [items, setItems] = React.useState<Underwriting[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/underwritings", { headers: { "x-role": "agent" } })
        if (!res.ok) throw new Error("Failed to load underwritings")
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Underwriting</h1>
          <p className="text-sm text-muted-foreground">Drafts you can edit</p>
        </div>
        <Link className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground" href="/underwriting/new">
          New underwriting
        </Link>
      </div>

      {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
      {error && <div className="text-sm text-destructive">Error: {error}</div>}

      <div className="grid gap-3">
        {items.map((item) => (
          <Link key={item.id} href={`/underwriting/${item.id}`} className="rounded-lg border bg-card p-4 shadow-sm hover:border-primary">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Underwriting {item.id}</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Investor: {item.investorId} {item.listingId ? `• Listing: ${item.listingId}` : ""} <br />
              Updated {new Date(item.updatedAt).toLocaleString()}
            </div>
          </Link>
        ))}
        {items.length === 0 && !loading && <div className="text-sm text-muted-foreground">No underwritings yet.</div>}
      </div>
    </div>
  )
}

