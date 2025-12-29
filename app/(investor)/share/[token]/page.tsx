"use client"

import * as React from "react"
import { useParams } from "next/navigation"

export default function InvestorSharePage() {
  const params = useParams()
  const token = Array.isArray(params?.token) ? params.token[0] : (params?.token as string)

  const [memoId, setMemoId] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function resolveToken() {
      try {
        const res = await fetch(`/api/share/${token}`)
        if (!res.ok) throw new Error("Invalid or expired link")
        const data = await res.json()
        setMemoId(data.memoId)
        // Redirect to standard investor memo view (investor must still have session headers)
        window.location.href = `/investor/memos/${data.memoId}`
      } catch (err) {
        setError((err as Error).message)
      }
    }
    resolveToken()
  }, [token])

  if (error) return <div className="p-6 text-sm text-destructive">Error: {error}</div>
  return <div className="p-6 text-sm text-muted-foreground">Opening memo…</div>
}

