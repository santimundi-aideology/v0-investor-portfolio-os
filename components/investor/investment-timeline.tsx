"use client"

import * as React from "react"
import Link from "next/link"
import {
  Building2,
  Check,
  ChevronRight,
  FileText,
  FolderKanban,
  MapPin,
  TrendingUp,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface TimelineItem {
  id: string
  type: "holding" | "deal" | "memo"
  date: string
  title: string
  subtitle?: string
  area?: string
  value?: number
  status?: string
  link: string
  metadata?: {
    yield?: number
    appreciation?: number
    dealProgress?: number
    memoVersion?: number
  }
}

interface InvestmentTimelineProps {
  items: TimelineItem[]
}

export function InvestmentTimeline({ items }: InvestmentTimelineProps) {
  const formatCurrency = (amount: number) => {
    if (amount >= 1_000_000) {
      return `AED ${(amount / 1_000_000).toFixed(1)}M`
    }
    if (amount >= 1_000) {
      return `AED ${(amount / 1_000).toFixed(0)}K`
    }
    return `AED ${amount.toLocaleString()}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const getTypeConfig = (type: TimelineItem["type"]) => {
    switch (type) {
      case "holding":
        return {
          icon: Building2,
          color: "bg-emerald-500",
          label: "Portfolio Holding",
          borderColor: "border-emerald-200",
          bgColor: "bg-emerald-50",
        }
      case "deal":
        return {
          icon: FolderKanban,
          color: "bg-amber-500",
          label: "Active Deal",
          borderColor: "border-amber-200",
          bgColor: "bg-amber-50",
        }
      case "memo":
        return {
          icon: FileText,
          color: "bg-blue-500",
          label: "Approved Memo",
          borderColor: "border-blue-200",
          bgColor: "bg-blue-50",
        }
    }
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <TrendingUp className="mx-auto size-12 text-muted-foreground/50" />
        <p className="mt-4 text-sm text-muted-foreground">
          No investment activity yet
        </p>
      </div>
    )
  }

  // Sort by date descending
  const sortedItems = [...items].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  return (
    <div className="relative">
      {/* Timeline Line */}
      <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />

      <div className="space-y-6">
        {sortedItems.map((item, index) => {
          const config = getTypeConfig(item.type)
          const Icon = config.icon

          return (
            <div key={item.id} className="relative pl-16">
              {/* Timeline Dot */}
              <div
                className={cn(
                  "absolute left-3 top-3 size-6 rounded-full flex items-center justify-center",
                  config.color
                )}
              >
                <Icon className="size-3 text-white" />
              </div>

              {/* Timeline Content */}
              <Link href={item.link}>
                <Card
                  className={cn(
                    "transition-all hover:shadow-md hover:border-primary/50 cursor-pointer border-l-4",
                    config.borderColor
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant="outline"
                            className={cn("text-xs border", config.borderColor, config.bgColor)}
                          >
                            {config.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(item.date)}
                          </span>
                        </div>

                        <h4 className="font-semibold text-base truncate">{item.title}</h4>
                        {item.subtitle && (
                          <p className="text-sm text-muted-foreground mt-0.5 truncate">
                            {item.subtitle}
                          </p>
                        )}

                        {item.area && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                            <MapPin className="size-3" />
                            {item.area}
                          </div>
                        )}

                        {/* Type-specific metadata */}
                        {item.type === "holding" && item.metadata && (
                          <div className="flex items-center gap-4 mt-3">
                            {item.metadata.yield !== undefined && (
                              <div className="text-xs">
                                <span className="text-muted-foreground">Yield: </span>
                                <span className="font-semibold">{item.metadata.yield.toFixed(1)}%</span>
                              </div>
                            )}
                            {item.metadata.appreciation !== undefined && (
                              <div className="text-xs">
                                <span className="text-muted-foreground">Appreciation: </span>
                                <span
                                  className={cn(
                                    "font-semibold",
                                    item.metadata.appreciation >= 0
                                      ? "text-emerald-600"
                                      : "text-red-600"
                                  )}
                                >
                                  {item.metadata.appreciation >= 0 ? "+" : ""}
                                  {item.metadata.appreciation.toFixed(1)}%
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {item.type === "deal" && item.status && (
                          <Badge variant="secondary" className="mt-2 text-xs capitalize">
                            {item.status.replace("-", " ")}
                          </Badge>
                        )}

                        {item.type === "memo" && item.metadata?.memoVersion && (
                          <Badge variant="outline" className="mt-2 text-xs">
                            Version {item.metadata.memoVersion}
                          </Badge>
                        )}
                      </div>

                      {/* Value & Action */}
                      <div className="text-right flex-shrink-0">
                        {item.value && (
                          <p className="text-lg font-bold">{formatCurrency(item.value)}</p>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 text-xs gap-1"
                        >
                          View
                          <ChevronRight className="size-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}
