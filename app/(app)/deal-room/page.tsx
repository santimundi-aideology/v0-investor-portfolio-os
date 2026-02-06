"use client"

import * as React from "react"
import Link from "next/link"
import { ExternalLink, FolderKanban, Kanban, LayoutGrid, MapPin, TrendingUp, Users } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useApp } from "@/components/providers/app-provider"
import { getDealRooms, getDealRoomsByInvestorId, getOngoingDealRooms, mockProperties } from "@/lib/mock-data"
import { DealPipelineKanban } from "@/components/deals/deal-pipeline-kanban"
import type { DealRoom } from "@/lib/types"

const statusColors: Record<DealRoom["status"], string> = {
  preparation: "bg-gray-100 text-gray-600",
  "due-diligence": "bg-amber-50 text-amber-600 border-amber-200",
  negotiation: "bg-blue-50 text-blue-600 border-blue-200",
  closing: "bg-purple-50 text-purple-600 border-purple-200",
  completed: "bg-green-50 text-green-600 border-green-200",
}

function getPropertyForDeal(propertyId?: string) {
  if (!propertyId) return null
  return mockProperties.find(p => p.id === propertyId)
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
  const [viewMode, setViewMode] = React.useState<"kanban" | "grid">("kanban")
  const [deals, setDeals] = React.useState<DealRoom[]>([])

  React.useEffect(() => {
    if (role === "investor") {
      setDeals(getDealRoomsByInvestorId(scopedInvestorId ?? "inv-1"))
    } else {
      setDeals(getDealRooms())
    }
  }, [role, scopedInvestorId])

  const ongoing = React.useMemo(() => {
    return [...deals].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [deals])

  const handleMoveStage = (dealId: string, newStage: DealRoom["status"]) => {
    setDeals(prev => prev.map(d =>
      d.id === dealId
        ? { ...d, status: newStage, lastUpdatedAt: new Date().toISOString().split("T")[0] }
        : d
    ))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-green-50 text-green-600">
              <FolderKanban className="size-5" />
            </span>
            <span>Deal Pipeline</span>
          </span>
        }
        subtitle={role === "investor" ? "Your ongoing deals and next steps." : "All deals across investors — drag to progress."}
        badges={
          <Badge variant="secondary" className="bg-green-50 text-green-700">
            {ongoing.filter(d => d.status !== "completed").length} active
          </Badge>
        }
        primaryAction={
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "kanban" | "grid")}>
            <TabsList className="h-9">
              <TabsTrigger value="kanban" className="text-xs gap-1.5 px-3">
                <Kanban className="size-3.5" />
                Pipeline
              </TabsTrigger>
              <TabsTrigger value="grid" className="text-xs gap-1.5 px-3">
                <LayoutGrid className="size-3.5" />
                Grid
              </TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      {viewMode === "kanban" ? (
        <DealPipelineKanban
          deals={ongoing}
          isInvestorView={role === "investor"}
          getPropertyImage={(pid) => getPropertyForDeal(pid)?.imageUrl}
          getPropertyArea={(pid) => getPropertyForDeal(pid)?.area}
          onMoveStage={handleMoveStage}
        />
      ) : (
        /* Grid View (existing) */
        ongoing.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FolderKanban className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-sm text-gray-500">No ongoing deals.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ongoing.map((deal) => {
              const property = getPropertyForDeal(deal.propertyId)
              return (
                <Link key={deal.id} href={`/deal-room/${deal.id}`} className="group block">
                  <Card className="overflow-hidden border-gray-100 transition-all hover:shadow-lg hover:-translate-y-0.5 h-full">
                    {/* Property Image */}
                    <div className="relative h-40 overflow-hidden bg-gray-100">
                      {property?.imageUrl ? (
                        <img
                          src={property.imageUrl}
                          alt={property.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <FolderKanban className="h-12 w-12 text-gray-300" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                      
                      <Badge 
                        variant="outline" 
                        className={`absolute top-3 right-3 shadow-sm border ${statusColors[deal.status]}`}
                      >
                        {statusLabel(deal.status)}
                      </Badge>
                      
                      <div className="absolute bottom-3 left-3 right-3">
                        <div className="text-sm font-semibold text-white truncate">{deal.propertyTitle}</div>
                        {property && (
                          <div className="flex items-center gap-2 text-xs text-white/80 mt-0.5">
                            <MapPin className="h-3 w-3" />
                            <span>{property.area}</span>
                            {property.roi && (
                              <>
                                <span>·</span>
                                <TrendingUp className="h-3 w-3" />
                                <span>{property.roi}% ROI</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors truncate">
                            {deal.title}
                          </h3>
                          {role !== "investor" && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                              <Users className="h-3.5 w-3.5" />
                              <span>{deal.investorName}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <span className="text-xs text-gray-500">Created {deal.createdAt}</span>
                          <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-green-600 transition-colors" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
