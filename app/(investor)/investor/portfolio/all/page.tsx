"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, Building2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { HoldingsGrid } from "@/components/investor/holdings-grid"
import { useApp } from "@/components/providers/app-provider"
import { useAPI } from "@/lib/hooks/use-api"
import type { Investor } from "@/lib/types"

type PortfolioHolding = {
  id: string
  investorId: string
  listingId: string
  property: { title: string; area: string; type: string; imageUrl?: string; images?: string[] } | null
  financials: {
    purchasePrice: number
    currentValue: number
    monthlyRent: number
    occupancyRate: number
    annualExpenses: number
    appreciationPct: number
    netYieldPct: number
  }
}

export default function PortfolioAllHoldingsPage() {
  const { scopedInvestorId } = useApp()
  const { data: investor } = useAPI<Investor>(
    scopedInvestorId ? `/api/investors/${scopedInvestorId}` : null
  )
  const { data: portfolioData, isLoading } = useAPI<{
    summary: { propertyCount: number }
    holdings: PortfolioHolding[]
  }>(scopedInvestorId ? `/api/portfolio/${scopedInvestorId}` : null)

  const holdings = React.useMemo(() => portfolioData?.holdings ?? [], [portfolioData])

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading your assets...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header: title + back link */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">My assets</h1>
            <p className="text-sm text-muted-foreground">
              All holdings in your portfolio
            </p>
          </div>
        </div>
        <Button variant="outline" asChild className="w-fit transition-colors duration-150 hover:bg-primary/5">
          <Link href="/investor/dashboard" className="gap-2">
            <ArrowLeft className="size-4" />
            Back to dashboard
          </Link>
        </Button>
      </div>

      {/* Holdings grid (HoldingsGrid handles empty state internally) */}
      <HoldingsGrid
        holdings={holdings}
        mandateYieldTarget={investor?.mandate?.yieldTarget ? Number(investor.mandate.yieldTarget) : 8.5}
      />

      {/* Secondary link to portfolio profile */}
      <div className="pt-4 border-t">
        <Link
          href="/investor/portfolio"
          className="text-sm text-muted-foreground hover:text-primary transition-colors duration-150"
        >
          Go to portfolio profile →
        </Link>
      </div>
    </div>
  )
}
