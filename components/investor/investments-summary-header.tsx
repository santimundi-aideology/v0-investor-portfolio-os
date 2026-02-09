"use client"

import * as React from "react"
import {
  Building2,
  DollarSign,
  FolderKanban,
  TrendingUp,
  Briefcase,
} from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface InvestmentsSummaryHeaderProps {
  totalInvested: number
  totalCommitted: number
  activeDealCount: number
  pipelineValue: number
  overallROI: number
  portfolioCount: number
}

export function InvestmentsSummaryHeader({
  totalInvested,
  totalCommitted,
  activeDealCount,
  pipelineValue,
  overallROI,
  portfolioCount,
}: InvestmentsSummaryHeaderProps) {
  const formatCurrency = (amount: number) => {
    if (amount >= 1_000_000) {
      return `AED ${(amount / 1_000_000).toFixed(1)}M`
    }
    if (amount >= 1_000) {
      return `AED ${(amount / 1_000).toFixed(0)}K`
    }
    return `AED ${amount.toLocaleString()}`
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Invested */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Invested
              </p>
              <p className="text-2xl font-bold mt-2">{formatCurrency(totalInvested)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {portfolioCount} {portfolioCount === 1 ? "property" : "properties"}
              </p>
            </div>
            <div className="rounded-lg bg-primary/10 p-3">
              <Building2 className="size-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Capital Committed */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Capital Committed
              </p>
              <p className="text-2xl font-bold mt-2">{formatCurrency(totalCommitted)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Approved memos
              </p>
            </div>
            <div className="rounded-lg bg-blue-500/10 p-3">
              <Briefcase className="size-6 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Deals */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Active Deals
              </p>
              <p className="text-2xl font-bold mt-2">{activeDealCount}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(pipelineValue)} in pipeline
              </p>
            </div>
            <div className="rounded-lg bg-amber-500/10 p-3">
              <FolderKanban className="size-6 text-amber-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overall ROI */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Overall ROI
              </p>
              <p
                className={cn(
                  "text-2xl font-bold mt-2",
                  overallROI >= 0 ? "text-emerald-600" : "text-red-600"
                )}
              >
                {overallROI >= 0 ? "+" : ""}
                {overallROI.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Appreciation + income
              </p>
            </div>
            <div
              className={cn(
                "rounded-lg p-3",
                overallROI >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"
              )}
            >
              <TrendingUp
                className={cn(
                  "size-6",
                  overallROI >= 0 ? "text-emerald-600" : "text-red-600"
                )}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
