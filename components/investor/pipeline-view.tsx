"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowRight,
  Building2,
  Calendar,
  ChevronRight,
  FileText,
  FolderKanban,
  MapPin,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface ApprovedMemo {
  id: string
  propertyTitle: string
  propertyPrice?: number
  area?: string
  approvedAt: string
}

interface ActiveDeal {
  id: string
  title: string
  propertyTitle: string
  status: "preparation" | "due-diligence" | "negotiation" | "closing" | "completed"
  ticketSizeAed?: number
  targetCloseDate?: string
  probability?: number
}

interface PipelineViewProps {
  approvedMemos: ApprovedMemo[]
  activeDeals: ActiveDeal[]
}

const dealStatusConfig = {
  preparation: { label: "Preparation", progress: 20, color: "bg-gray-500" },
  "due-diligence": { label: "Due Diligence", progress: 40, color: "bg-amber-500" },
  negotiation: { label: "Negotiation", progress: 60, color: "bg-blue-500" },
  closing: { label: "Closing", progress: 80, color: "bg-purple-500" },
  completed: { label: "Completed", progress: 100, color: "bg-green-500" },
}

export function PipelineView({ approvedMemos, activeDeals }: PipelineViewProps) {
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
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <div className="space-y-6">
      {/* Pipeline Funnel Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Investment Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            {/* Approved Memos */}
            <div className="flex-1 text-center">
              <div className="mx-auto w-full max-w-[120px] h-20 bg-blue-100 rounded-t-lg flex items-center justify-center border-2 border-blue-300">
                <div>
                  <p className="text-2xl font-bold text-blue-700">{approvedMemos.length}</p>
                  <p className="text-xs text-blue-600">Approved</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Memos</p>
            </div>

            <ArrowRight className="size-5 text-muted-foreground flex-shrink-0" />

            {/* Active Deals */}
            <div className="flex-1 text-center">
              <div className="mx-auto w-full max-w-[100px] h-16 bg-amber-100 rounded-lg flex items-center justify-center border-2 border-amber-300">
                <div>
                  <p className="text-2xl font-bold text-amber-700">{activeDeals.length}</p>
                  <p className="text-xs text-amber-600">In Progress</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Deals</p>
            </div>

            <ArrowRight className="size-5 text-muted-foreground flex-shrink-0" />

            {/* Completed (Holdings) */}
            <div className="flex-1 text-center">
              <div className="mx-auto w-full max-w-[80px] h-12 bg-emerald-100 rounded-b-lg flex items-center justify-center border-2 border-emerald-300">
                <div>
                  <p className="text-xl font-bold text-emerald-700">
                    <Building2 className="size-5 mx-auto" />
                  </p>
                  <p className="text-xs text-emerald-600">Portfolio</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Holdings</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Approved Memos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="size-5 text-primary" />
                Approved Memos
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/investor/memos">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {approvedMemos.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="mx-auto size-10 text-muted-foreground/50" />
                <p className="mt-3 text-sm text-muted-foreground">No approved memos</p>
              </div>
            ) : (
              <div className="space-y-3">
                {approvedMemos.slice(0, 5).map((memo) => (
                  <Link
                    key={memo.id}
                    href={`/investor/memos/${memo.id}`}
                    className="block rounded-lg border p-3 transition-all hover:border-primary hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium truncate">{memo.propertyTitle}</h4>
                        {memo.area && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <MapPin className="size-3" />
                            {memo.area}
                          </div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        {memo.propertyPrice && (
                          <p className="text-sm font-semibold">
                            {formatCurrency(memo.propertyPrice)}
                          </p>
                        )}
                        <Badge variant="outline" className="mt-1 bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                          Approved
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Approved {formatDate(memo.approvedAt)}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Deals */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <FolderKanban className="size-5 text-primary" />
                Active Deals
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/investor/deal-rooms">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {activeDeals.length === 0 ? (
              <div className="text-center py-8">
                <FolderKanban className="mx-auto size-10 text-muted-foreground/50" />
                <p className="mt-3 text-sm text-muted-foreground">No active deals</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeDeals.slice(0, 5).map((deal) => {
                  const statusInfo = dealStatusConfig[deal.status]
                  return (
                    <Link
                      key={deal.id}
                      href={`/investor/deal-rooms/${deal.id}`}
                      className="block rounded-lg border p-4 transition-all hover:border-primary hover:shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium truncate">{deal.title}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {deal.propertyTitle}
                          </p>
                        </div>
                        {deal.ticketSizeAed && (
                          <p className="text-sm font-semibold flex-shrink-0">
                            {formatCurrency(deal.ticketSizeAed)}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{statusInfo.label}</span>
                          <span className="font-medium">{statusInfo.progress}%</span>
                        </div>
                        <Progress value={statusInfo.progress} className="h-1.5" />
                      </div>

                      <div className="flex items-center justify-between mt-3 text-xs">
                        {deal.targetCloseDate && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="size-3" />
                            Target: {formatDate(deal.targetCloseDate)}
                          </div>
                        )}
                        {deal.probability && (
                          <Badge variant="outline" className="text-xs">
                            {deal.probability}% probability
                          </Badge>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
