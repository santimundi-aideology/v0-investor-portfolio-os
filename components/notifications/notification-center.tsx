"use client"

import * as React from "react"
import Link from "next/link"
import { Sparkles } from "lucide-react"

import type { Notification } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

type NotificationCenterProps = {
  notifications: Notification[]
  onChange?: (next: Notification[]) => void
  variant?: "popover" | "page" | "compact"
  maxItems?: number
  showViewAll?: boolean
}

export function NotificationCenter({
  notifications,
  onChange,
  variant = "popover",
  maxItems,
  showViewAll = true,
}: NotificationCenterProps) {
  const [filter, setFilter] = React.useState<"all" | "unread">("all")

  const unreadCount = React.useMemo(() => notifications.filter((n) => n.unread).length, [notifications])

  const filtered = React.useMemo(() => {
    const base = filter === "unread" ? notifications.filter((n) => n.unread) : notifications
    const limit = maxItems ?? (variant === "popover" ? 6 : undefined)
    return typeof limit === "number" ? base.slice(0, limit) : base
  }, [filter, maxItems, notifications, variant])

  function markAllRead() {
    const next = notifications.map((n) => ({ ...n, unread: false }))
    onChange?.(next)
  }

  function markRead(id: string) {
    const next = notifications.map((n) => (n.id === id ? { ...n, unread: false } : n))
    onChange?.(next)
  }

  const containerClass =
    variant === "page" ? "space-y-4" : variant === "compact" ? "space-y-2" : "space-y-3"

  return (
    <div className={containerClass}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className={cn("text-sm font-medium", variant === "page" && "text-base")}>Notifications</div>
            {unreadCount ? <Badge variant="secondary">{unreadCount} new</Badge> : null}
          </div>

          <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "unread")}>
            <TabsList className="h-9">
              <TabsTrigger value="all" className="h-7 px-3">
                All
              </TabsTrigger>
              <TabsTrigger value="unread" className="h-7 px-3">
                Unread
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={markAllRead} disabled={!unreadCount}>
            Mark all read
          </Button>
          {showViewAll && variant !== "page" ? (
            <Button variant="outline" size="sm" asChild>
              <Link href="/notifications">View all</Link>
            </Button>
          ) : null}
        </div>
      </div>

      {filtered.length ? (
        <div className={cn("space-y-3", variant === "compact" && "space-y-2")}>
          {filtered.map((n) => {
            const row = (
                <div
                  className={cn(
                    "flex gap-3 rounded-lg border p-3 transition-colors",
                    n.unread ? "bg-green-50 border-green-200" : "bg-white hover:bg-gray-50 border-gray-100",
                  )}
                >
                  <div className="bg-gray-100 flex size-9 items-center justify-center rounded-lg">
                    <Sparkles className="size-4 text-gray-500" />
                  </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-sm font-medium">{n.title}</div>
                    {n.unread ? <Badge variant="outline">New</Badge> : null}
                  </div>
                  <div className="text-gray-500 mt-0.5 text-sm">{n.body}</div>
                  <div className="text-gray-500 mt-1 text-xs">{n.createdAt}</div>
                </div>
              </div>
            )

            if (n.href) {
              return (
                <Link
                  key={n.id}
                  href={n.href}
                  className="block"
                  onClick={() => markRead(n.id)}
                >
                  {row}
                </Link>
              )
            }

            return (
              <button key={n.id} type="button" className="block w-full text-left" onClick={() => markRead(n.id)}>
                {row}
              </button>
            )
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm text-gray-500">
          {filter === "unread" ? "No unread notifications." : "No notifications yet."}
        </div>
      )}

      {showViewAll && variant === "page" ? (
        <div className="flex justify-end">
          <Button variant="outline" asChild>
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      ) : null}
    </div>
  )
}


