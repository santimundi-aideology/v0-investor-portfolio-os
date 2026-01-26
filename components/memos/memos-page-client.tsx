"use client"

import Link from "next/link"

import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/layout/empty-state"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowRight, Building2, Calendar, FileText, User, TrendingUp } from "lucide-react"
import { mockMemos, mockProperties } from "@/lib/mock-data"
import { useApp } from "@/components/providers/app-provider"

function getPropertyForMemo(propertyId?: string) {
  if (!propertyId) return null
  return mockProperties.find(p => p.id === propertyId)
}

function getStatusVariant(status: string) {
  switch (status) {
    case "approved":
      return "default"
    case "review":
      return "secondary"
    case "draft":
      return "outline"
    case "rejected":
      return "destructive"
    default:
      return "outline"
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-AE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function MemosPageClient() {
  const { role, scopedInvestorId } = useApp()

  const visible = role === "investor" && scopedInvestorId ? mockMemos.filter((m) => m.investorId === scopedInvestorId) : mockMemos

  return (
    <div className="space-y-6">
      <PageHeader
        title="IC Memos"
        subtitle={`${visible.length} investment committee memos`}
        primaryAction={
          <Button asChild>
            <Link href="/memos/new">Generate memo</Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visible.map((memo) => {
          const property = getPropertyForMemo(memo.propertyId)
          return (
            <Link key={memo.id} href={`/memos/${memo.id}`} className="group block">
              <Card className="overflow-hidden border-gray-100 transition-all hover:shadow-lg hover:-translate-y-0.5">
                {/* Property Image Header */}
                {property?.imageUrl && (
                  <div className="relative h-36 overflow-hidden">
                    <img
                      src={property.imageUrl}
                      alt={property.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                    
                    {/* Status Badge */}
                    <Badge 
                      variant={getStatusVariant(memo.status)} 
                      className="absolute top-3 right-3 capitalize shadow-sm"
                    >
                      {memo.status}
                    </Badge>
                    
                    {/* Property Info Overlay */}
                    <div className="absolute bottom-3 left-3 right-3">
                      <div className="text-sm font-medium text-white truncate">{property.title}</div>
                      <div className="flex items-center gap-2 text-xs text-white/80">
                        <span>{property.area}</span>
                        {property.roi && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-0.5">
                              <TrendingUp className="h-3 w-3" />
                              {property.roi}% ROI
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-50">
                        <FileText className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-sm line-clamp-1 group-hover:text-green-600 transition-colors">
                          {memo.title}
                        </CardTitle>
                        {!property && (
                          <CardDescription className="line-clamp-1 text-xs">{memo.propertyTitle}</CardDescription>
                        )}
                      </div>
                    </div>
                    {!property?.imageUrl && (
                      <Badge variant={getStatusVariant(memo.status)} className="shrink-0 capitalize text-xs">
                        {memo.status}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      <span className="truncate max-w-[120px]">{memo.investorName}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{formatDate(memo.updatedAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-xs text-gray-500">View memo details</span>
                    <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-green-600 transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="No memos yet"
          description="Investment committee memos will appear here once created."
          icon={<FileText className="size-5" />}
          action={
            <Button asChild>
              <Link href="/memos/new">Generate memo</Link>
            </Button>
          }
        />
      ) : null}
    </div>
  )
}
