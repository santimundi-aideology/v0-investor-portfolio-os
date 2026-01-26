"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  FolderKanban,
  MapPin,
  Users,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EmptyState } from "@/components/layout/empty-state"
import { AskAIBankerWidget } from "@/components/ai/ask-ai-banker-widget"
import { cn } from "@/lib/utils"
import { getDealRoomsByInvestorId } from "@/lib/mock-data"
import type { DealRoom } from "@/lib/types"

// Mock investor ID - in production this would come from auth
const INVESTOR_ID = "inv-1"

const statusConfig: Record<
  DealRoom["status"],
  { label: string; color: string; progress: number }
> = {
  preparation: { label: "Preparation", color: "bg-gray-500", progress: 20 },
  "due-diligence": { label: "Due Diligence", color: "bg-amber-500", progress: 40 },
  negotiation: { label: "Negotiation", color: "bg-blue-500", progress: 60 },
  closing: { label: "Closing", color: "bg-purple-500", progress: 80 },
  completed: { label: "Completed", color: "bg-green-500", progress: 100 },
}

export default function InvestorDealRoomsPage() {
  // Get deal rooms for this investor
  const dealRooms = React.useMemo(() => getDealRoomsByInvestorId(INVESTOR_ID), [])
  
  const activeDealRooms = React.useMemo(
    () => dealRooms.filter((d) => d.status !== "completed"),
    [dealRooms]
  )
  const completedDealRooms = React.useMemo(
    () => dealRooms.filter((d) => d.status === "completed"),
    [dealRooms]
  )

  // Stats
  const stats = React.useMemo(() => {
    const activeCount = activeDealRooms.length
    const completedCount = completedDealRooms.length
    const totalValue = dealRooms.reduce((sum, d) => sum + (d.ticketSizeAed ?? 0), 0)
    const avgProbability =
      activeDealRooms.length > 0
        ? Math.round(
            activeDealRooms.reduce((sum, d) => sum + (d.probability ?? 0), 0) /
              activeDealRooms.length
          )
        : 0
    return { activeCount, completedCount, totalValue, avgProbability }
  }, [dealRooms, activeDealRooms, completedDealRooms])

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
              <h1 className="text-2xl font-bold tracking-tight">Deal Rooms</h1>
              <p className="text-sm text-gray-500">
                Track your active deals and transactions
              </p>
            </div>
            <AskAIBankerWidget
              agentId="portfolio_advisor"
              title="Deal Advisor AI"
              description="Get insights on your active deals"
              suggestedQuestions={[
                "What's the status of my active deals?",
                "Which deals are closest to closing?",
                "What are the next steps for my deals?",
              ]}
              pagePath="/investor/deal-rooms"
              scopedInvestorId={INVESTOR_ID}
              variant="inline"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Summary Cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10">
                <FolderKanban className="size-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.activeCount}</p>
                <p className="text-sm text-gray-500">Active Deals</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex size-12 items-center justify-center rounded-lg bg-green-500/10">
                <CheckCircle2 className="size-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completedCount}</p>
                <p className="text-sm text-gray-500">Completed</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex size-12 items-center justify-center rounded-lg bg-blue-500/10">
                <Building2 className="size-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.totalValue >= 1000000
                    ? `AED ${(stats.totalValue / 1000000).toFixed(1)}M`
                    : `AED ${stats.totalValue.toLocaleString()}`}
                </p>
                <p className="text-sm text-gray-500">Total Value</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex size-12 items-center justify-center rounded-lg bg-amber-500/10">
                <Clock className="size-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.avgProbability}%</p>
                <p className="text-sm text-gray-500">Avg Probability</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="active" className="space-y-4">
          <TabsList>
            <TabsTrigger value="active" className="gap-2">
              <FolderKanban className="size-4" />
              Active ({activeDealRooms.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-2">
              <CheckCircle2 className="size-4" />
              Completed ({completedDealRooms.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {activeDealRooms.length === 0 ? (
              <EmptyState
                title="No active deals"
                description="You don't have any active deals at the moment."
                icon={<FolderKanban className="size-5" />}
              />
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {activeDealRooms.map((deal) => (
                  <DealRoomCard key={deal.id} deal={deal} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedDealRooms.length === 0 ? (
              <EmptyState
                title="No completed deals"
                description="You haven't completed any deals yet."
                icon={<CheckCircle2 className="size-5" />}
              />
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {completedDealRooms.map((deal) => (
                  <DealRoomCard key={deal.id} deal={deal} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function DealRoomCard({ deal }: { deal: DealRoom }) {
  const status = statusConfig[deal.status]
  const completedChecklist = deal.checklist.filter((c) => c.completed).length
  const totalChecklist = deal.checklist.length

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-lg truncate">{deal.title}</CardTitle>
            <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
              <MapPin className="size-3.5" />
              <span className="truncate">{deal.propertyTitle}</span>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "shrink-0",
              deal.status === "completed"
                ? "border-green-500/30 bg-green-500/10 text-green-700"
                : deal.status === "closing"
                  ? "border-purple-500/30 bg-purple-500/10 text-purple-700"
                  : deal.status === "negotiation"
                    ? "border-blue-500/30 bg-blue-500/10 text-blue-700"
                    : deal.status === "due-diligence"
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-700"
                      : ""
            )}
          >
            {status.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Deal Progress</span>
            <span className="font-medium">{status.progress}%</span>
          </div>
          <Progress value={status.progress} className="h-2" />
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg border bg-gray-50/50 p-2">
            <p className="text-xs text-gray-500">Value</p>
            <p className="font-semibold text-sm">
              {deal.ticketSizeAed
                ? `AED ${(deal.ticketSizeAed / 1000000).toFixed(1)}M`
                : "—"}
            </p>
          </div>
          <div className="rounded-lg border bg-gray-50/50 p-2">
            <p className="text-xs text-gray-500">Probability</p>
            <p className="font-semibold text-sm">
              {deal.probability ? `${deal.probability}%` : "—"}
            </p>
          </div>
          <div className="rounded-lg border bg-gray-50/50 p-2">
            <p className="text-xs text-gray-500">Close Date</p>
            <p className="font-semibold text-sm">
              {deal.targetCloseDate
                ? new Date(deal.targetCloseDate).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })
                : "—"}
            </p>
          </div>
        </div>

        {/* Checklist Progress */}
        <div className="flex items-center justify-between rounded-lg border bg-gray-50/50 p-3">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-gray-500" />
            <span className="text-sm">Checklist</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-sm">
              <span className="font-medium">{completedChecklist}</span>
              <span className="text-gray-500">/ {totalChecklist}</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {Math.round((completedChecklist / totalChecklist) * 100)}%
            </Badge>
          </div>
        </div>

        {/* Next Step */}
        {deal.nextStep && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-50/50 p-3">
            <div className="flex items-start gap-2">
              <Clock className="size-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-amber-600">Next Step</p>
                <p className="text-sm text-amber-900">{deal.nextStep}</p>
              </div>
            </div>
          </div>
        )}

        {/* Parties */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Users className="size-4 text-gray-500" />
            <span className="text-sm text-gray-500">
              {deal.parties.length} parties
            </span>
          </div>
          <div className="flex -space-x-2">
            {deal.parties.slice(0, 4).map((party, i) => (
              <div
                key={party.id}
                className="size-7 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-xs font-medium"
                title={party.name}
              >
                {party.name.charAt(0)}
              </div>
            ))}
            {deal.parties.length > 4 && (
              <div className="size-7 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-500">
                +{deal.parties.length - 4}
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Updated{" "}
            {deal.lastUpdatedAt
              ? new Date(deal.lastUpdatedAt).toLocaleDateString()
              : "—"}
          </div>
          <Button variant="ghost" size="sm" className="gap-1.5" asChild>
            <Link href={`/investor/deal-rooms/${deal.id}`}>
              View Details
              <ChevronRight className="size-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
