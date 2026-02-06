"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowRight,
  ArrowLeft,
  Building2,
  Calendar,
  DollarSign,
  FolderKanban,
  GripVertical,
  MapPin,
  MoreHorizontal,
  Percent,
  TrendingUp,
  Users,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import type { DealRoom } from "@/lib/types"

type PipelineStage = DealRoom["status"]

const STAGES: { key: PipelineStage; label: string; color: string; bgColor: string; borderColor: string }[] = [
  { key: "preparation", label: "Preparation", color: "text-gray-600", bgColor: "bg-gray-50", borderColor: "border-gray-200" },
  { key: "due-diligence", label: "Due Diligence", color: "text-amber-600", bgColor: "bg-amber-50", borderColor: "border-amber-200" },
  { key: "negotiation", label: "Negotiation", color: "text-blue-600", bgColor: "bg-blue-50", borderColor: "border-blue-200" },
  { key: "closing", label: "Closing", color: "text-purple-600", bgColor: "bg-purple-50", borderColor: "border-purple-200" },
  { key: "completed", label: "Completed", color: "text-emerald-600", bgColor: "bg-emerald-50", borderColor: "border-emerald-200" },
]

interface DealPipelineKanbanProps {
  deals: DealRoom[]
  isInvestorView?: boolean
  getPropertyImage?: (propertyId: string) => string | undefined
  getPropertyArea?: (propertyId: string) => string | undefined
  onMoveStage?: (dealId: string, newStage: PipelineStage) => void
}

function formatAED(amount: number): string {
  if (amount >= 1_000_000) return `AED ${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `AED ${(amount / 1_000).toFixed(0)}K`
  return `AED ${amount.toLocaleString()}`
}

function DealCard({
  deal,
  isInvestorView,
  propertyImage,
  propertyArea,
  onMoveForward,
  onMoveBack,
  canMoveForward,
  canMoveBack,
}: {
  deal: DealRoom
  isInvestorView?: boolean
  propertyImage?: string
  propertyArea?: string
  onMoveForward?: () => void
  onMoveBack?: () => void
  canMoveForward: boolean
  canMoveBack: boolean
}) {
  const checklistCompleted = deal.checklist.filter((c) => c.done).length
  const checklistTotal = deal.checklist.length
  const progressPct = checklistTotal > 0 ? (checklistCompleted / checklistTotal) * 100 : 0

  return (
    <div className="group relative">
      <Link href={`/deal-room/${deal.id}`}>
        <Card className="overflow-hidden transition-all hover:shadow-md hover:border-primary/40 cursor-pointer">
          {/* Mini property image */}
          {propertyImage && (
            <div className="relative h-24 overflow-hidden bg-muted">
              <img
                src={propertyImage}
                alt={deal.propertyTitle}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-2 left-2 right-2">
                <div className="text-xs font-medium text-white truncate">{deal.propertyTitle}</div>
              </div>
            </div>
          )}

          <CardContent className={cn("p-3 space-y-2", !propertyImage && "pt-3")}>
            {/* Title */}
            <div>
              <h4 className="text-sm font-semibold leading-tight line-clamp-1">{deal.title}</h4>
              {!isInvestorView && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <Users className="size-3" />
                  {deal.investorName}
                </div>
              )}
            </div>

            {/* Ticket Size */}
            {deal.ticketSizeAed && (
              <div className="flex items-center gap-1 text-xs">
                <DollarSign className="size-3 text-muted-foreground" />
                <span className="font-medium">{formatAED(deal.ticketSizeAed)}</span>
              </div>
            )}

            {/* Probability */}
            {deal.probability !== undefined && (
              <div className="flex items-center gap-2 text-xs">
                <Percent className="size-3 text-muted-foreground" />
                <span className={cn(
                  "font-medium",
                  deal.probability >= 70 ? "text-emerald-600" : deal.probability >= 40 ? "text-amber-600" : "text-gray-500"
                )}>
                  {deal.probability}%
                </span>
                <div className="flex-1">
                  <Progress value={deal.probability} className="h-1" />
                </div>
              </div>
            )}

            {/* Next Step */}
            {deal.nextStep && (
              <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1 line-clamp-1">
                Next: {deal.nextStep}
              </div>
            )}

            {/* Progress */}
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{checklistCompleted}/{checklistTotal} tasks</span>
              {deal.targetCloseDate && (
                <span className="flex items-center gap-0.5">
                  <Calendar className="size-2.5" />
                  {deal.targetCloseDate}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Quick actions (visible on hover) */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" className="size-7 rounded-full shadow-sm">
              <MoreHorizontal className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {canMoveBack && (
              <DropdownMenuItem onClick={(e) => { e.preventDefault(); onMoveBack?.() }}>
                <ArrowLeft className="mr-2 size-3.5" />
                Move Back
              </DropdownMenuItem>
            )}
            {canMoveForward && (
              <DropdownMenuItem onClick={(e) => { e.preventDefault(); onMoveForward?.() }}>
                <ArrowRight className="mr-2 size-3.5" />
                Move Forward
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/deal-room/${deal.id}`}>
                Open Deal Room
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

export function DealPipelineKanban({
  deals,
  isInvestorView,
  getPropertyImage,
  getPropertyArea,
  onMoveStage,
}: DealPipelineKanbanProps) {
  // Group deals by stage
  const dealsByStage = React.useMemo(() => {
    const grouped: Record<PipelineStage, DealRoom[]> = {
      preparation: [],
      "due-diligence": [],
      negotiation: [],
      closing: [],
      completed: [],
    }
    deals.forEach((deal) => {
      if (grouped[deal.status]) {
        grouped[deal.status].push(deal)
      }
    })
    return grouped
  }, [deals])

  // Pipeline stats
  const pipelineValue = deals.reduce((sum, d) => sum + (d.ticketSizeAed || 0), 0)
  const weightedValue = deals.reduce((sum, d) => sum + (d.ticketSizeAed || 0) * ((d.probability || 50) / 100), 0)

  const handleMoveStage = (dealId: string, direction: "forward" | "back") => {
    const deal = deals.find((d) => d.id === dealId)
    if (!deal) return

    const stageIdx = STAGES.findIndex((s) => s.key === deal.status)
    const newIdx = direction === "forward" ? stageIdx + 1 : stageIdx - 1
    if (newIdx < 0 || newIdx >= STAGES.length) return

    onMoveStage?.(dealId, STAGES[newIdx].key)
  }

  return (
    <div className="space-y-4">
      {/* Pipeline Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="py-3 px-4">
            <div className="text-xs text-muted-foreground">Active Deals</div>
            <div className="text-xl font-bold">
              {deals.filter((d) => d.status !== "completed").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <div className="text-xs text-muted-foreground">Pipeline Value</div>
            <div className="text-xl font-bold">{formatAED(pipelineValue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <div className="text-xs text-muted-foreground">Weighted Value</div>
            <div className="text-xl font-bold">{formatAED(weightedValue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <div className="text-xs text-muted-foreground">Completed</div>
            <div className="text-xl font-bold text-emerald-600">
              {dealsByStage.completed.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage, stageIdx) => (
          <div key={stage.key} className="flex-shrink-0 w-72">
            {/* Column Header */}
            <div className={cn(
              "flex items-center justify-between rounded-t-lg px-3 py-2 border",
              stage.bgColor,
              stage.borderColor
            )}>
              <div className="flex items-center gap-2">
                <span className={cn("text-sm font-semibold", stage.color)}>
                  {stage.label}
                </span>
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  {dealsByStage[stage.key].length}
                </Badge>
              </div>
              {dealsByStage[stage.key].length > 0 && (
                <span className="text-[10px] text-muted-foreground">
                  {formatAED(
                    dealsByStage[stage.key].reduce((s, d) => s + (d.ticketSizeAed || 0), 0)
                  )}
                </span>
              )}
            </div>

            {/* Column Body */}
            <div className={cn(
              "min-h-[300px] rounded-b-lg border border-t-0 p-2 space-y-2",
              stage.borderColor,
              "bg-muted/20"
            )}>
              {dealsByStage[stage.key].length === 0 ? (
                <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">
                  No deals
                </div>
              ) : (
                dealsByStage[stage.key].map((deal) => (
                  <DealCard
                    key={deal.id}
                    deal={deal}
                    isInvestorView={isInvestorView}
                    propertyImage={getPropertyImage?.(deal.propertyId)}
                    propertyArea={getPropertyArea?.(deal.propertyId)}
                    canMoveForward={stageIdx < STAGES.length - 1}
                    canMoveBack={stageIdx > 0}
                    onMoveForward={() => handleMoveStage(deal.id, "forward")}
                    onMoveBack={() => handleMoveStage(deal.id, "back")}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
