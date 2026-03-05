"use client"

import * as React from "react"
import { Mail, MessageCircle, Link2, Eye, MousePointerClick, Clock, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type ShareEntry = {
  id: string
  method: "whatsapp" | "email" | "link"
  recipientContact: string | null
  createdAt: string
  expiresAt: string | null
  openedAt: string | null
  openedCount: number
  lastOpenedAt: string | null
  clickedAt: string | null
}

const methodConfig = {
  whatsapp: { icon: MessageCircle, label: "WhatsApp", color: "text-green-600 bg-green-50 border-green-200" },
  email: { icon: Mail, label: "Email", color: "text-blue-600 bg-blue-50 border-blue-200" },
  link: { icon: Link2, label: "Link", color: "text-gray-600 bg-gray-50 border-gray-200" },
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt) < new Date()
}

export function MemoShareActivity({ memoId }: { memoId: string }) {
  const [shares, setShares] = React.useState<ShareEntry[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/memos/${memoId}/share-activity`)
        if (res.ok) {
          const data = await res.json()
          setShares(data.shares ?? [])
        }
      } catch {
        // Silently fail — card just stays empty
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [memoId])

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Share Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4 text-gray-400">
            <Loader2 className="size-4 animate-spin mr-2" />
            <span className="text-sm">Loading...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (shares.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Share Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 text-center py-2">
            Not shared yet. Use the Share button to send this memo to an investor.
          </p>
        </CardContent>
      </Card>
    )
  }

  const totalOpens = shares.reduce((sum, s) => sum + s.openedCount, 0)
  const uniqueOpens = shares.filter((s) => s.openedAt).length
  const totalClicks = shares.filter((s) => s.clickedAt).length

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          Share Activity
          <Badge variant="secondary" className="text-xs font-normal">
            {shares.length} {shares.length === 1 ? "share" : "shares"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border bg-gray-50 p-2 text-center">
            <div className="flex items-center justify-center gap-1 text-gray-500">
              <Eye className="size-3" />
            </div>
            <p className="text-lg font-semibold">{totalOpens}</p>
            <p className="text-[10px] uppercase tracking-wide text-gray-500">Opens</p>
          </div>
          <div className="rounded-lg border bg-gray-50 p-2 text-center">
            <div className="flex items-center justify-center gap-1 text-gray-500">
              <MousePointerClick className="size-3" />
            </div>
            <p className="text-lg font-semibold">{totalClicks}</p>
            <p className="text-[10px] uppercase tracking-wide text-gray-500">Clicks</p>
          </div>
          <div className="rounded-lg border bg-gray-50 p-2 text-center">
            <div className="flex items-center justify-center gap-1 text-gray-500">
              <Eye className="size-3" />
            </div>
            <p className="text-lg font-semibold">{uniqueOpens}</p>
            <p className="text-[10px] uppercase tracking-wide text-gray-500">Unique</p>
          </div>
        </div>

        {/* Individual share entries */}
        <div className="space-y-2">
          {shares.map((share) => {
            const config = methodConfig[share.method]
            const Icon = config.icon
            const expired = isExpired(share.expiresAt)

            return (
              <div
                key={share.id}
                className={cn(
                  "rounded-lg border p-3 text-sm transition-colors",
                  expired ? "opacity-60 bg-gray-50" : "bg-white"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge
                      variant="outline"
                      className={cn("shrink-0 gap-1 text-[10px] px-1.5 py-0.5", config.color)}
                    >
                      <Icon className="size-3" />
                      {config.label}
                    </Badge>
                    {share.recipientContact ? (
                      <span className="truncate font-medium text-gray-900">
                        {share.recipientContact}
                      </span>
                    ) : (
                      <span className="text-gray-400 italic">No contact</span>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-gray-400">
                    {formatRelativeDate(share.createdAt)}
                  </span>
                </div>

                {/* Engagement indicators */}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  {share.openedAt ? (
                    <span className="flex items-center gap-1 text-green-600">
                      <Eye className="size-3" />
                      Opened{share.openedCount > 1 ? ` ${share.openedCount}x` : ""}
                      {share.lastOpenedAt && (
                        <span className="text-gray-400 ml-0.5">
                          ({formatRelativeDate(share.lastOpenedAt)})
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-gray-400">
                      <Clock className="size-3" />
                      Not opened yet
                    </span>
                  )}
                  {share.clickedAt && (
                    <span className="flex items-center gap-1 text-blue-600">
                      <MousePointerClick className="size-3" />
                      Clicked
                    </span>
                  )}
                  {expired && (
                    <Badge variant="outline" className="text-[10px] text-red-500 border-red-200">
                      Expired
                    </Badge>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
