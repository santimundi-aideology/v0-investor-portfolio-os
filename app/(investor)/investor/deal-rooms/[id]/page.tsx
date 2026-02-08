"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  DollarSign,
  FileText,
  FolderKanban,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Target,
  Users,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AskAIBankerWidget } from "@/components/ai/ask-ai-banker-widget"
import { EmptyState } from "@/components/layout/empty-state"
import { useApp } from "@/components/providers/app-provider"
import { useAPI } from "@/lib/hooks/use-api"
import { cn } from "@/lib/utils"
import type { DealRoom, ChecklistItem, TimelineEvent, DealParty } from "@/lib/types"

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

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `AED ${(value / 1000000).toFixed(1)}M`
  }
  return `AED ${value.toLocaleString()}`
}

export default function DealRoomDetailPage() {
  const { scopedInvestorId } = useApp()
  const params = useParams()
  const dealId = params.id as string
  const { data: deal, error, isLoading } = useAPI<DealRoom>(
    dealId ? `/api/deal-rooms/${dealId}` : null,
  )

  // Group checklist by category
  const checklistByCategory = React.useMemo(() => {
    if (!deal) return new Map<string, ChecklistItem[]>()
    const grouped = new Map<string, ChecklistItem[]>()
    for (const item of deal.checklist) {
      const list = grouped.get(item.category) ?? []
      list.push(item)
      grouped.set(item.category, list)
    }
    return grouped
  }, [deal])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100/30 flex items-center justify-center gap-3">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading deal room...</span>
      </div>
    )
  }

  if (error || !deal) {
    return (
      <div className="min-h-screen bg-gray-100/30 flex items-center justify-center">
        <EmptyState
          title="Deal Room Not Found"
          description="The deal room you're looking for doesn't exist or you don't have access."
          icon={<FolderKanban className="size-5" />}
          action={
            <Button asChild>
              <Link href="/investor/deal-rooms">Back to Deal Rooms</Link>
            </Button>
          }
        />
      </div>
    )
  }

  const status = statusConfig[deal.status]
  const completedChecklist = deal.checklist.filter((c) => c.completed).length
  const totalChecklist = deal.checklist.length
  const checklistProgress = totalChecklist > 0 ? Math.round((completedChecklist / totalChecklist) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-100/30">
      {/* Header */}
      <div className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" asChild className="mt-1">
              <Link href="/investor/deal-rooms">
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">{deal.title}</h1>
                <Badge
                  variant="outline"
                  className={cn(
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
              <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                <MapPin className="size-3.5" />
                <span>{deal.propertyTitle}</span>
              </div>
            </div>
            <AskAIBankerWidget
              agentId="portfolio_advisor"
              title="Deal Advisor"
              description="Get help with this deal"
              suggestedQuestions={[
                "What's the current status of this deal?",
                "What are the next steps?",
                "Are there any risks I should know about?",
              ]}
              pagePath={`/investor/deal-rooms/${dealId}`}
              scopedInvestorId={scopedInvestorId}
              variant="inline"
            />
          </div>

          {/* Progress Bar */}
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Deal Progress</span>
              <span className="font-medium">{status.progress}%</span>
            </div>
            <Progress value={status.progress} className="h-2" />
            <div className="flex justify-between text-xs text-gray-400">
              <span>Preparation</span>
              <span>Due Diligence</span>
              <span>Negotiation</span>
              <span>Closing</span>
              <span>Complete</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Key Metrics */}
            <div className="grid gap-4 sm:grid-cols-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <DollarSign className="size-5 mx-auto text-green-600 mb-1" />
                  <p className="text-lg font-bold">
                    {deal.ticketSizeAed ? formatCurrency(deal.ticketSizeAed) : "—"}
                  </p>
                  <p className="text-xs text-gray-500">Deal Value</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Target className="size-5 mx-auto text-blue-600 mb-1" />
                  <p className="text-lg font-bold">
                    {deal.offerPriceAed ? formatCurrency(deal.offerPriceAed) : "—"}
                  </p>
                  <p className="text-xs text-gray-500">Offer Price</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Calendar className="size-5 mx-auto text-purple-600 mb-1" />
                  <p className="text-lg font-bold">
                    {deal.targetCloseDate
                      ? new Date(deal.targetCloseDate).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })
                      : "—"}
                  </p>
                  <p className="text-xs text-gray-500">Target Close</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Clock className="size-5 mx-auto text-amber-600 mb-1" />
                  <p className="text-lg font-bold">{deal.probability ?? 0}%</p>
                  <p className="text-xs text-gray-500">Probability</p>
                </CardContent>
              </Card>
            </div>

            {/* Next Step */}
            {deal.nextStep && (
              <Card className="border-amber-500/30 bg-amber-50/50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Clock className="size-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-900">Next Step</p>
                      <p className="text-sm text-amber-800 mt-1">{deal.nextStep}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tabs */}
            <Tabs defaultValue="checklist">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="checklist" className="gap-2">
                  <CheckCircle2 className="size-4" />
                  Checklist
                </TabsTrigger>
                <TabsTrigger value="timeline" className="gap-2">
                  <Clock className="size-4" />
                  Timeline
                </TabsTrigger>
                <TabsTrigger value="documents" className="gap-2">
                  <FileText className="size-4" />
                  Documents
                </TabsTrigger>
              </TabsList>

              <TabsContent value="checklist" className="mt-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Due Diligence Checklist</CardTitle>
                      <Badge variant="outline">
                        {completedChecklist}/{totalChecklist} completed
                      </Badge>
                    </div>
                    <Progress value={checklistProgress} className="h-2 mt-2" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {Array.from(checklistByCategory.entries()).map(
                        ([category, items]) => (
                          <div key={category}>
                            <h4 className="font-medium text-sm text-gray-500 uppercase tracking-wider mb-3">
                              {category}
                            </h4>
                            <div className="space-y-2">
                              {items.map((item) => (
                                <div
                                  key={item.id}
                                  className={cn(
                                    "flex items-start gap-3 rounded-lg border p-3",
                                    item.completed && "bg-green-50/50 border-green-200"
                                  )}
                                >
                                  {item.completed ? (
                                    <CheckCircle2 className="size-5 text-green-600 mt-0.5" />
                                  ) : (
                                    <Circle className="size-5 text-gray-300 mt-0.5" />
                                  )}
                                  <div className="flex-1">
                                    <p
                                      className={cn(
                                        "font-medium",
                                        item.completed && "text-green-700"
                                      )}
                                    >
                                      {item.title}
                                    </p>
                                    {item.dueDate && !item.completed && (
                                      <p className="text-xs text-gray-500 mt-1">
                                        Due: {new Date(item.dueDate).toLocaleDateString()}
                                      </p>
                                    )}
                                  </div>
                                  {!item.completed && (
                                    <Badge variant="outline" className="text-xs">
                                      Pending
                                    </Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="timeline" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Deal Timeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {deal.timeline.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-8">
                        No timeline events yet
                      </p>
                    ) : (
                      <div className="relative">
                        <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-200" />
                        <div className="space-y-4">
                          {deal.timeline.map((event, index) => (
                            <div key={event.id} className="relative pl-10">
                              <div
                                className={cn(
                                  "absolute left-2.5 size-3 rounded-full border-2 border-white",
                                  event.type === "milestone"
                                    ? "bg-green-500"
                                    : event.type === "document"
                                      ? "bg-blue-500"
                                      : "bg-gray-400"
                                )}
                              />
                              <div className="rounded-lg border bg-white p-3">
                                <div className="flex items-start justify-between">
                                  <p className="font-medium">{event.title}</p>
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {event.type}
                                  </Badge>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(event.date).toLocaleDateString("en-GB", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="documents" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Documents</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EmptyState
                      title="No documents yet"
                      description="Documents will appear here as they are added to the deal room."
                      icon={<FileText className="size-5" />}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Summary */}
            {deal.summary && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700">{deal.summary}</p>
                </CardContent>
              </Card>
            )}

            {/* Parties */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="size-4" />
                  Parties ({deal.parties.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {deal.parties.map((party) => (
                    <div key={party.id} className="flex items-start gap-3">
                      <div className="size-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium">
                        {party.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{party.name}</p>
                        <p className="text-xs text-gray-500">{party.role}</p>
                        <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                          <a
                            href={`mailto:${party.email}`}
                            className="flex items-center gap-1 hover:text-primary"
                          >
                            <Mail className="size-3" />
                            Email
                          </a>
                          {party.phone && (
                            <a
                              href={`tel:${party.phone}`}
                              className="flex items-center gap-1 hover:text-primary"
                            >
                              <Phone className="size-3" />
                              Call
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Property */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="size-4" />
                  Property
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <div className="size-16 mx-auto rounded-lg bg-gray-100 flex items-center justify-center mb-3">
                    <Building2 className="size-8 text-gray-400" />
                  </div>
                  <p className="font-medium">{deal.propertyTitle}</p>
                  <p className="text-xs text-gray-500 mt-1">ID: {deal.propertyId}</p>
                </div>
              </CardContent>
            </Card>

            {/* Activity */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-500 space-y-2">
                  <p>
                    <span className="font-medium text-gray-700">Created:</span>{" "}
                    {new Date(deal.createdAt).toLocaleDateString()}
                  </p>
                  {deal.lastUpdatedAt && (
                    <p>
                      <span className="font-medium text-gray-700">Last Updated:</span>{" "}
                      {new Date(deal.lastUpdatedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
