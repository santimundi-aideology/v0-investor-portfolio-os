"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Briefcase,
  Loader2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { InvestmentsSummaryHeader } from "@/components/investor/investments-summary-header"
import { InvestmentTimeline } from "@/components/investor/investment-timeline"
import { HoldingsGrid } from "@/components/investor/holdings-grid"
import { PipelineView } from "@/components/investor/pipeline-view"
import { AskAIBankerWidget } from "@/components/ai/ask-ai-banker-widget"
import { useAPI } from "@/lib/hooks/use-api"
import { useApp } from "@/components/providers/app-provider"

type PortfolioSummary = {
  propertyCount: number
  totalValue: number
  totalCost: number
  appreciationPct: number
  totalMonthlyIncome: number
  netAnnualIncome: number
  avgYieldPct: number
  avgOccupancy: number
}

type PortfolioHolding = {
  id: string
  investorId: string
  listingId: string
  property: {
    title: string
    area: string
    type: string
    imageUrl?: string
  } | null
  financials: {
    purchasePrice: number
    purchaseDate: string
    currentValue: number
    monthlyRent: number
    occupancyRate: number
    annualExpenses: number
    appreciationPct: number
    netYieldPct: number
  }
}

type DealRoom = {
  id: string
  title: string
  propertyTitle: string
  status: "preparation" | "due-diligence" | "negotiation" | "closing" | "completed"
  ticketSizeAed?: number
  targetCloseDate?: string
  probability?: number
  createdAt: string
}

type MemoSummary = {
  id: string
  investorId: string
  state: string
  currentVersion: number
  listingId?: string
  createdAt: string
  updatedAt: string
  propertyTitle?: string
  propertyPrice?: number
  propertyArea?: string
}

export default function InvestorInvestmentsPage() {
  const { scopedInvestorId } = useApp()

  // Fetch portfolio data
  const { data: portfolioData, isLoading: portfolioLoading } = useAPI<{
    summary: PortfolioSummary
    holdings: PortfolioHolding[]
  }>(scopedInvestorId ? `/api/portfolio/${scopedInvestorId}` : null)

  // Fetch deal rooms
  const { data: dealRooms = [], isLoading: dealsLoading } = useAPI<DealRoom[]>("/api/deal-rooms")

  // Fetch memos
  const { data: memos = [], isLoading: memosLoading } = useAPI<MemoSummary[]>(
    "/api/investor/memos",
    {
      headers: { "x-role": "investor" },
    }
  )

  const isLoading = portfolioLoading || dealsLoading || memosLoading

  // Calculate summary metrics
  const summaryMetrics = React.useMemo(() => {
    const summary = portfolioData?.summary ?? {
      propertyCount: 0,
      totalValue: 0,
      totalCost: 0,
      appreciationPct: 0,
      totalMonthlyIncome: 0,
      netAnnualIncome: 0,
      avgYieldPct: 0,
      avgOccupancy: 0,
    }

    const holdings = portfolioData?.holdings ?? []

    // Calculate total invested capital
    const totalInvested = summary.totalValue

    // Calculate capital committed (approved memos)
    const approvedMemos = memos.filter((m) => m.state === "approved")
    const totalCommitted = approvedMemos.reduce(
      (sum, m) => sum + (m.propertyPrice ?? 0),
      0
    )

    // Active deals count and value
    const activeDeals = dealRooms.filter((d) => d.status !== "completed")
    const activeDealCount = activeDeals.length
    const pipelineValue = activeDeals.reduce(
      (sum, d) => sum + (d.ticketSizeAed ?? 0),
      0
    )

    // Calculate overall ROI (simplified: appreciation + income to date)
    const totalAppreciation = summary.totalValue - summary.totalCost
    const estimatedIncomeToDate = holdings.reduce((sum, h) => {
      const monthsHeld = Math.floor(
        (Date.now() - new Date(h.financials.purchaseDate).getTime()) /
          (1000 * 60 * 60 * 24 * 30)
      )
      const monthlyNet =
        h.financials.monthlyRent * h.financials.occupancyRate -
        h.financials.annualExpenses / 12
      return sum + monthlyNet * monthsHeld
    }, 0)
    const totalReturn = totalAppreciation + estimatedIncomeToDate
    const overallROI = summary.totalCost > 0 ? (totalReturn / summary.totalCost) * 100 : 0

    return {
      totalInvested,
      totalCommitted,
      activeDealCount,
      pipelineValue,
      overallROI,
      portfolioCount: summary.propertyCount,
    }
  }, [portfolioData, memos, dealRooms])

  // Prepare data for components
  const approvedMemosData = React.useMemo(() => {
    return memos
      .filter((m) => m.state === "approved")
      .map((m) => ({
        id: m.id,
        propertyTitle: m.propertyTitle || "Property",
        propertyPrice: m.propertyPrice,
        area: m.propertyArea,
        approvedAt: m.updatedAt,
      }))
  }, [memos])

  const activeDealsData = React.useMemo(() => {
    return dealRooms.filter((d) => d.status !== "completed")
  }, [dealRooms])

  // Create timeline items
  const timelineItems = React.useMemo(() => {
    const items: Array<{
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
    }> = []

    // Add holdings
    portfolioData?.holdings.forEach((holding) => {
      items.push({
        id: holding.id,
        type: "holding",
        date: holding.financials.purchaseDate,
        title: holding.property?.title || "Property",
        area: holding.property?.area,
        value: holding.financials.currentValue,
        link: `/investor/portfolio/${holding.id}`,
        metadata: {
          yield: holding.financials.netYieldPct,
          appreciation: holding.financials.appreciationPct,
        },
      })
    })

    // Add deals
    dealRooms
      .filter((d) => d.status !== "completed")
      .forEach((deal) => {
        items.push({
          id: deal.id,
          type: "deal",
          date: deal.createdAt,
          title: deal.title,
          subtitle: deal.propertyTitle,
          value: deal.ticketSizeAed,
          status: deal.status,
          link: `/investor/deal-rooms/${deal.id}`,
        })
      })

    // Add approved memos
    memos
      .filter((m) => m.state === "approved")
      .forEach((memo) => {
        items.push({
          id: memo.id,
          type: "memo",
          date: memo.updatedAt,
          title: memo.propertyTitle || "Investment Memo",
          area: memo.propertyArea,
          value: memo.propertyPrice,
          link: `/investor/memos/${memo.id}`,
          metadata: {
            memoVersion: memo.currentVersion,
          },
        })
      })

    return items
  }, [portfolioData, dealRooms, memos])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="mx-auto size-8 animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Loading investments...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100/30">
      {/* Header */}
      <div className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/investor/dashboard">
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Briefcase className="size-6 text-primary" />
                All Investments
              </h1>
              <p className="text-sm text-gray-500">
                Comprehensive view of your portfolio, active deals, and pipeline
              </p>
            </div>
            <AskAIBankerWidget
              agentId="portfolio_advisor"
              title="Investment Advisor"
              description="Get insights on your investments"
              suggestedQuestions={[
                "How is my overall investment performance?",
                "Which deals should I prioritize?",
                "What's my capital deployment strategy?",
              ]}
              pagePath="/investor/investments"
              scopedInvestorId={scopedInvestorId}
              variant="inline"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Summary Header */}
        <div className="mb-6">
          <InvestmentsSummaryHeader
            totalInvested={summaryMetrics.totalInvested}
            totalCommitted={summaryMetrics.totalCommitted}
            activeDealCount={summaryMetrics.activeDealCount}
            pipelineValue={summaryMetrics.pipelineValue}
            overallROI={summaryMetrics.overallROI}
            portfolioCount={summaryMetrics.portfolioCount}
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="all">All Investments</TabsTrigger>
            <TabsTrigger value="holdings">
              Portfolio ({portfolioData?.holdings.length ?? 0})
            </TabsTrigger>
            <TabsTrigger value="pipeline">
              Pipeline ({approvedMemosData.length + activeDealsData.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            <InvestmentTimeline items={timelineItems} />
          </TabsContent>

          <TabsContent value="holdings" className="space-y-6">
            <HoldingsGrid
              holdings={portfolioData?.holdings ?? []}
              mandateYieldTarget={8.5}
            />
          </TabsContent>

          <TabsContent value="pipeline" className="space-y-6">
            <PipelineView
              approvedMemos={approvedMemosData}
              activeDeals={activeDealsData}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
