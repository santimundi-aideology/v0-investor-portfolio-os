"use client"

import * as React from "react"

import { PageHeader } from "@/components/layout/page-header"
import { NotificationCenter } from "@/components/notifications/notification-center"
import type { Notification } from "@/lib/mock-session"

export default function NotificationsPage() {
  const [items, setItems] = React.useState<Notification[]>([])

  React.useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch("/api/notifications?limit=50")
        const json = (await res.json()) as {
          ok: boolean
          notifications?: Array<{
            id: string
            entity_type: string
            entity_id: string
            title: string
            body: string
            read_at?: string | null
            created_at: string
          }>
        }

        if (!json?.ok || !json.notifications) return
        if (cancelled) return

        const mapped: Notification[] = json.notifications.map((n) => ({
          id: n.id,
          title: n.title,
          body: n.body,
          createdAt: new Date(n.created_at).toLocaleString(),
          unread: !n.read_at,
          href: n.entity_type === "market_signal" ? "/market-signals" : undefined,
        }))

        setItems(mapped)
      } catch {
        // Keep page functional even if DB/env isn't configured; users will just see empty state.
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" subtitle="Updates across tasks, memos, deal rooms, and market intelligence." />
      <NotificationCenter notifications={items} onChange={setItems} variant="page" showViewAll={false} />
    </div>
  )
}


