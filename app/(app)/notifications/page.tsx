"use client"

import * as React from "react"

import { PageHeader } from "@/components/layout/page-header"
import { NotificationCenter } from "@/components/notifications/notification-center"
import { notifications as defaultNotifications } from "@/lib/mock-session"

export default function NotificationsPage() {
  const [items, setItems] = React.useState(defaultNotifications)

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" subtitle="Updates across tasks, memos, deal rooms, and market intelligence." />
      <NotificationCenter notifications={items} onChange={setItems} variant="page" showViewAll={false} />
    </div>
  )
}


