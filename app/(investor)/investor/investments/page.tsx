"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Briefcase,
  Loader2,
  MapPin,
  Sparkles,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
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

type ShortlistResponse = {
  items: Array<{
    id: string
    listingId: string
    matchScore: number | null
    matchExplanation: string | null
    tradeoffs: string[]
    agentNotes: string | null
    rank: number | null
    addedAt: string
    property: {
      title: string | null
      area: string | null
      type: string | null
      price: number | null
      size: number | null
      bedrooms: number | null
      imageUrl: string | null
      status: string | null
    } | null
  }>
}

function formatCurrency(amount: number) {
  if (amount >= 1_000_000) return `AED ${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `AED ${(amount / 1_000).toFixed(0)}K`
  return `AED ${amount.toLocaleString()}`
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

  // Fetch shortlist-backed recommendations
  const { data: shortlistData, isLoading: shortlistLoading } = useAPI<ShortlistResponse>(
    scopedInvestorId ? `/api/investors/${scopedInvestorId}/shortlist` : null
  )

  const isLoading = portfolioLoading || dealsLoading || memosLoading || shortlistLoading

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

  const recommendationsData = React.useMemo(() => {
    const shortlistItems = shortlistData?.items ?? []
    const holdingsListingIds = new Set(
      (portfolioData?.holdings ?? []).map((holding) => holding.listingId).filter(Boolean)
    )
    const approvedMemoListingIds = new Set(
      memos
        .filter((memo) => memo.state === "approved")
        .map((memo) => memo.listingId)
        .filter((listingId): listingId is string => Boolean(listingId))
    )

    return shortlistItems
      .filter((item) => item.listingId && !holdingsListingIds.has(item.listingId))
      .filter((item) => !approvedMemoListingIds.has(item.listingId))
      .map((item) => ({
        id: item.id,
        listingId: item.listingId,
        title: item.property?.title || "Recommended property",
        area: item.property?.area || "Area not specified",
        type: item.property?.type || "property",
        price: item.property?.price ?? 0,
        matchScore: item.matchScore ?? 0,
        rationale:
          item.matchExplanation ||
          item.agentNotes ||
          item.tradeoffs?.[0] ||
          "Matches your current investment mandate.",
        addedAt: item.addedAt,
      }))
  }, [shortlistData, portfolioData, memos])

  const holdingsCount = portfolioData?.holdings.length ?? 0
  const recommendationsCount = recommendationsData.length
  const pipelineCount = approvedMemosData.length + activeDealsData.length
  const allInvestmentsCount = holdingsCount + recommendationsCount + pipelineCount

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
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="all">All Investments ({allInvestmentsCount})</TabsTrigger>
            <TabsTrigger value="holdings">
              Portfolio ({holdingsCount})
            </TabsTrigger>
            <TabsTrigger value="recommendations">
              Recommendations ({recommendationsCount})
            </TabsTrigger>
            <TabsTrigger value="pipeline">
              Pipeline ({pipelineCount})
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

          <TabsContent value="recommendations" className="space-y-4">
            {recommendationsData.length === 0 ? (
              <div className="rounded-lg border border-dashed p-10 text-center">
                <Sparkles className="mx-auto size-8 text-muted-foreground/60" />
                <p className="mt-3 text-sm font-medium">No recommendations right now</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  New opportunities will appear here once they match your mandate and are not already in your portfolio or pipeline.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {recommendationsData.map((recommendation) => (
                  <Link
                    key={recommendation.id}
                    href={`/properties/${recommendation.listingId}`}
                    className="block"
                  >
                    <Card className="h-full transition-all hover:border-primary/50 hover:shadow-md">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate font-semibold">{recommendation.title}</h3>
                            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="size-3" />
                              <span className="truncate">{recommendation.area}</span>
                            </div>
                          </div>
                          <Badge variant="secondary">Score {recommendation.matchScore}</Badge>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge variant="outline" className="capitalize">
                            {recommendation.type}
                          </Badge>
                          <Badge variant="outline" className="bg-primary/5 text-primary">
                            Recommended
                          </Badge>
                        </div>

                        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                          {recommendation.rationale}
                        </p>

                        <div className="mt-4 flex items-center justify-between text-sm">
                          <span className="font-semibold">{formatCurrency(recommendation.price)}</span>
                          <span className="text-xs text-muted-foreground">
                            Added {new Date(recommendation.addedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
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
