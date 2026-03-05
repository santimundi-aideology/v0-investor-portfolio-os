"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar, ArrowRight, FolderKanban, TrendingUp, CheckCircle2 } from "lucide-react"
import type { DealRoom } from "@/lib/types"

interface DealRoomsTabProps {
  dealRooms: DealRoom[]
}

const statusConfig: Record<DealRoom["status"], { label: string; color: string; bg: string; dot: string }> = {
  preparation:    { label: "Preparation",    color: "text-gray-600",    bg: "bg-gray-50 border-gray-200",     dot: "bg-gray-400" },
  "due-diligence":{ label: "Due Diligence",  color: "text-amber-700",   bg: "bg-amber-50 border-amber-200",   dot: "bg-amber-400" },
  negotiation:    { label: "Negotiation",    color: "text-blue-700",    bg: "bg-blue-50 border-blue-200",     dot: "bg-blue-400" },
  closing:        { label: "Closing",        color: "text-purple-700",  bg: "bg-purple-50 border-purple-200", dot: "bg-purple-400" },
  completed:      { label: "Completed",      color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", dot: "bg-emerald-400" },
}

function formatDate(dateStr?: string) {
  if (!dateStr) return null
  try {
    const d = new Date(dateStr)
    if (Number.isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString("en-AE", { day: "numeric", month: "short", year: "numeric" })
  } catch {
    return dateStr
  }
}

export function DealRoomsTab({ dealRooms }: DealRoomsTabProps) {
  const pathname = usePathname()
  const basePath = pathname?.startsWith("/realtor") ? "/realtor" : ""

  const ongoing = dealRooms.filter((d) => d.status !== "completed")
  const completed = dealRooms.filter((d) => d.status === "completed")

  if (dealRooms.length === 0) {
    return (
      <Card className="border-gray-100">
        <CardContent className="flex h-44 flex-col items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50">
            <FolderKanban className="h-6 w-6 text-gray-300" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">No deal rooms yet</p>
            <p className="text-xs text-gray-400 mt-1">Deal rooms are created when an investor approves an IC Memo</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      {/* Active deals */}
      {ongoing.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">Active ({ongoing.length})</span>
          </div>
          {ongoing.map((deal) => (
            <DealCard key={deal.id} deal={deal} basePath={basePath} />
          ))}
        </div>
      )}

      {/* Completed deals */}
      {completed.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-semibold text-gray-700">Completed ({completed.length})</span>
          </div>
          {completed.map((deal) => (
            <DealCard key={deal.id} deal={deal} basePath={basePath} />
          ))}
        </div>
      )}
    </div>
  )
}

function DealCard({ deal, basePath }: { deal: DealRoom; basePath: string }) {
  const cfg = statusConfig[deal.status] ?? statusConfig.preparation
  const displayDate = deal.lastUpdatedAt || deal.createdAt

  return (
    <div className="group rounded-xl border border-gray-100 bg-white shadow-sm transition-all hover:border-gray-200 hover:shadow">
      <div className="flex items-start gap-4 p-4">
        {/* Icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
          <FolderKanban className="h-5 w-5" />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 truncate">{deal.title}</span>
            <Badge
              variant="outline"
              className={`${cfg.bg} ${cfg.color} border text-xs font-medium gap-1.5 shrink-0`}
            >
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </Badge>
          </div>

          {deal.propertyTitle && (
            <p className="text-xs text-gray-400 truncate">{deal.propertyTitle}</p>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
            {displayDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {deal.lastUpdatedAt ? `Updated ${formatDate(displayDate)}` : `Created ${formatDate(displayDate)}`}
              </span>
            )}
            {typeof deal.ticketSizeAed === "number" && (
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                AED {deal.ticketSizeAed.toLocaleString()}
              </span>
            )}
            {typeof deal.probability === "number" && (
              <span className="text-purple-500 font-medium">{deal.probability}% probability</span>
            )}
          </div>

          {deal.nextStep && (
            <div className="mt-2 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-xs text-gray-600">
              <span className="font-medium text-gray-500">Next: </span>
              {deal.nextStep}
            </div>
          )}

          {deal.targetCloseDate && (
            <p className="text-xs text-gray-400">Target close: {formatDate(deal.targetCloseDate)}</p>
          )}
        </div>

        {/* Arrow */}
        <Button variant="ghost" size="icon" asChild className="shrink-0 h-8 w-8 text-gray-300 hover:text-purple-500 hover:bg-purple-50">
          <Link href={`${basePath}/deal-room/${deal.id}`}>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
