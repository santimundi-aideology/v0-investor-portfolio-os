"use client"

import * as React from "react"
import Link from "next/link"
import { ExternalLink, FolderKanban } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useApp } from "@/components/providers/app-provider"
import { getDealRooms, getDealRoomsByInvestorId, getOngoingDealRooms } from "@/lib/mock-data"
import type { DealRoom } from "@/lib/types"

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

export default function DealRoomsIndexPage() {
  const { role, scopedInvestorId } = useApp()

  const allDeals = React.useMemo(() => {
    if (role === "investor") return getDealRoomsByInvestorId(scopedInvestorId ?? "inv-1")
    return getDealRooms()
  }, [role, scopedInvestorId])

  const ongoing = React.useMemo(() => {
    const deals = getOngoingDealRooms(allDeals)
    return [...deals].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [allDeals])

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FolderKanban className="size-5" />
            </span>
            <span>Deal Rooms</span>
          </span>
        }
        subtitle={role === "investor" ? "Your ongoing deals and next steps." : "All ongoing deals across investors."}
        badges={
          <Badge variant="secondary">
            {ongoing.length} ongoing
          </Badge>
        }
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Ongoing deals</CardTitle>
        </CardHeader>
        <CardContent>
          {ongoing.length === 0 ? (
            <div className="text-sm text-muted-foreground">No ongoing deals.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Deal</TableHead>
                    {role !== "investor" ? <TableHead>Investor</TableHead> : null}
                    <TableHead>Property</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Open</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ongoing.map((deal) => (
                    <TableRow key={deal.id}>
                      <TableCell className="font-medium">{deal.title}</TableCell>
                      {role !== "investor" ? <TableCell>{deal.investorName}</TableCell> : null}
                      <TableCell className="text-muted-foreground">{deal.propertyTitle}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[deal.status]}>
                          {statusLabel(deal.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{deal.createdAt}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/deal-room/${deal.id}`}>
                            Open <ExternalLink className="ml-1 h-3 w-3" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


