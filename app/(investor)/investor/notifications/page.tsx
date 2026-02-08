"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  ChevronRight,
  Clock,
  FileText,
  Filter,
  FolderKanban,
  LayoutDashboard,
  MessageSquare,
  Radar,
  Settings,
  Trash2,
  TrendingUp,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EmptyState } from "@/components/layout/empty-state"
import { cn } from "@/lib/utils"
import { useAPI } from "@/lib/hooks/use-api"

// Extended notification type for investor portal
interface InvestorNotification {
  id: string
  title: string
  body: string
  createdAt: string
  unread?: boolean
  href?: string
  type: "memo" | "deal" | "signal" | "portfolio" | "system"
  priority?: "high" | "normal" | "low"
}

// Notifications are loaded from API

const typeIcons = {
  memo: FileText,
  deal: FolderKanban,
  signal: Radar,
  portfolio: TrendingUp,
  system: Settings,
}

const typeColors = {
  memo: "bg-blue-500/10 text-blue-600",
  deal: "bg-purple-500/10 text-purple-600",
  signal: "bg-amber-500/10 text-amber-600",
  portfolio: "bg-green-500/10 text-green-600",
  system: "bg-gray-500/10 text-gray-600",
}

export default function InvestorNotificationsPage() {
  const { data: apiNotifications, isLoading: notificationsLoading } = useAPI<InvestorNotification[]>("/api/notifications")
  const [notifications, setNotifications] = React.useState<InvestorNotification[]>([])

  // Sync API data into local state for selection/read management
  React.useEffect(() => {
    if (apiNotifications) {
      setNotifications(apiNotifications)
    }
  }, [apiNotifications])
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [filter, setFilter] = React.useState<"all" | "unread">("all")

  const unreadCount = notifications.filter((n) => n.unread).length
  const filteredNotifications =
    filter === "all"
      ? notifications
      : notifications.filter((n) => n.unread)

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const selectAll = () => {
    if (selectedIds.size === filteredNotifications.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredNotifications.map((n) => n.id)))
    }
  }

  const markAsRead = (ids: string[]) => {
    setNotifications((prev) =>
      prev.map((n) => (ids.includes(n.id) ? { ...n, unread: false } : n))
    )
    setSelectedIds(new Set())
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))
  }

  const deleteNotifications = (ids: string[]) => {
    setNotifications((prev) => prev.filter((n) => !ids.includes(n.id)))
    setSelectedIds(new Set())
  }

  return (
    <div className="min-h-screen bg-gray-100/30">
      {/* Header */}
      <div className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/investor/dashboard">
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
                {unreadCount > 0 && (
                  <Badge className="bg-primary">{unreadCount} new</Badge>
                )}
              </div>
              <p className="text-sm text-gray-500">
                Stay updated on your investments and opportunities
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <CheckCheck className="size-4 mr-2" />
              Mark All Read
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        {notificationsLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Bell className="mx-auto size-8 animate-pulse text-muted-foreground/50" />
              <p className="mt-3 text-sm text-muted-foreground">Loading notifications...</p>
            </div>
          </div>
        ) : (
        <>
        {/* Filters */}
        <div className="mb-4 flex items-center justify-between">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <TabsList>
              <TabsTrigger value="all">
                All ({notifications.length})
              </TabsTrigger>
              <TabsTrigger value="unread">
                Unread ({unreadCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {selectedIds.size} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAsRead(Array.from(selectedIds))}
              >
                <Check className="size-4 mr-1" />
                Mark Read
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => deleteNotifications(Array.from(selectedIds))}
              >
                <Trash2 className="size-4 mr-1" />
                Delete
              </Button>
            </div>
          )}
        </div>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <EmptyState
            title={filter === "unread" ? "No unread notifications" : "No notifications"}
            description={
              filter === "unread"
                ? "You've read all your notifications"
                : "You don't have any notifications yet"
            }
            icon={<BellOff className="size-5" />}
          />
        ) : (
          <Card>
            <CardContent className="p-0">
              {/* Select All Header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b bg-gray-50/50">
                <Checkbox
                  checked={
                    selectedIds.size === filteredNotifications.length &&
                    filteredNotifications.length > 0
                  }
                  onCheckedChange={selectAll}
                />
                <span className="text-sm text-gray-500">Select all</span>
              </div>

              {/* Notification Items */}
              <div className="divide-y">
                {filteredNotifications.map((notification) => {
                  const Icon = typeIcons[notification.type]
                  return (
                    <div
                      key={notification.id}
                      className={cn(
                        "flex items-start gap-3 px-4 py-4 transition-colors",
                        notification.unread && "bg-blue-50/30",
                        selectedIds.has(notification.id) && "bg-gray-100"
                      )}
                    >
                      <Checkbox
                        checked={selectedIds.has(notification.id)}
                        onCheckedChange={() => toggleSelect(notification.id)}
                        className="mt-1"
                      />
                      <div
                        className={cn(
                          "flex size-10 shrink-0 items-center justify-center rounded-lg",
                          typeColors[notification.type]
                        )}
                      >
                        <Icon className="size-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <p
                                className={cn(
                                  "font-medium",
                                  notification.unread && "text-primary"
                                )}
                              >
                                {notification.title}
                              </p>
                              {notification.unread && (
                                <div className="size-2 rounded-full bg-primary" />
                              )}
                              {notification.priority === "high" && (
                                <Badge variant="destructive" className="text-[10px]">
                                  Urgent
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-0.5">
                              {notification.body}
                            </p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                              <Clock className="size-3" />
                              {notification.createdAt}
                            </div>
                          </div>
                          {notification.href && (
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={notification.href}>
                                View
                                <ChevronRight className="size-4 ml-1" />
                              </Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Settings Link */}
        <div className="mt-6 text-center">
          <Button variant="link" asChild>
            <Link href="/investor/settings">
              <Settings className="size-4 mr-2" />
              Manage notification preferences
            </Link>
          </Button>
        </div>
        </>
        )}
      </div>
    </div>
  )
}
