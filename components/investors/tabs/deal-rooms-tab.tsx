"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, ExternalLink, FolderKanban, TrendingUp } from "lucide-react"
import type { DealRoom } from "@/lib/types"

interface DealRoomsTabProps {
  dealRooms: DealRoom[]
}

const statusColors: Record<DealRoom["status"], string> = {
  preparation: "bg-muted text-muted-foreground",
  "due-diligence": "bg-amber-500/10 text-amber-600 border-amber-500/20",
  negotiation: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  closing: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
}

function statusLabel(status: DealRoom["status"]) {
  switch (status) {
    case "due-diligence":
      return "Due diligence"
    default:
      return status.charAt(0).toUpperCase() + status.slice(1)
  }
}

export function DealRoomsTab({ dealRooms }: DealRoomsTabProps) {
  const ongoing = dealRooms.filter((d) => d.status !== "completed")

  if (dealRooms.length === 0) {
    return (
      <Card>
        <CardContent className="flex h-40 items-center justify-center">
          <p className="text-muted-foreground">No deal rooms yet</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {ongoing.length === 0 ? (
        <Card>
          <CardContent className="flex h-32 items-center justify-center">
            <p className="text-muted-foreground">No ongoing deals</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {dealRooms.map((deal) => (
          <Card key={deal.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <FolderKanban className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">{deal.title}</CardTitle>
                    <p className="text-sm text-muted-foreground truncate">{deal.propertyTitle}</p>
                  </div>
                </div>
                <Badge variant="outline" className={statusColors[deal.status]}>
                  {statusLabel(deal.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 text-sm">
                <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {deal.lastUpdatedAt ? `Updated: ${deal.lastUpdatedAt}` : `Created: ${deal.createdAt}`}
                  </span>
                  {typeof deal.ticketSizeAed === "number" ? (
                    <span className="inline-flex items-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5" />
                      AED {deal.ticketSizeAed.toLocaleString()}
                    </span>
                  ) : null}
                  {typeof deal.probability === "number" ? (
                    <Badge variant="secondary" className="rounded-full">
                      {deal.probability}% probability
                    </Badge>
                  ) : null}
                </div>

                {deal.nextStep ? (
                  <div className="rounded-md border bg-muted/30 p-3 text-sm">
                    <div className="text-xs font-medium text-muted-foreground mb-1">Next step</div>
                    <div className="text-sm">{deal.nextStep}</div>
                  </div>
                ) : null}

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {deal.targetCloseDate ? `Target close: ${deal.targetCloseDate}` : " "}
                  </span>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/deal-room/${deal.id}`}>
                      Open <ExternalLink className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}


