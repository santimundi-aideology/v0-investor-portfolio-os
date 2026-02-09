"use client"

import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Building2, Calendar, FolderKanban, Mail, Phone, Sparkles, MapPin } from "lucide-react"
import type { Investor } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { EditableAvatar } from "@/components/ui/editable-avatar"

interface InvestorCardProps {
  investor: Investor
}

// Preferred properties would be fetched from API per investor; empty for now
function getInvestorPreferredProperties(_investor: Investor) {
  return [] as { id: string; imageUrl?: string; title: string }[]
}

export function InvestorCard({ investor }: InvestorCardProps) {
  const statusColors = {
    active: "bg-green-50 text-green-600 border-green-200",
    pending: "bg-amber-50 text-amber-600 border-amber-200",
    inactive: "bg-gray-100 text-gray-500",
  }

  const preferredProperties = getInvestorPreferredProperties(investor)

  const strategy = investor.mandate?.strategy
  const yieldTarget = investor.mandate?.yieldTarget
  const preferredAreasCount = investor.mandate?.preferredAreas?.length ?? 0
  // No deal_rooms DB table yet — always 0
  const ongoingDeals = 0
  const aumLabel = typeof investor.aumAed === "number" ? `AED ${(investor.aumAed / 1_000_000).toFixed(0)}M AUM` : null

  return (
    <Card className="group border-gray-100 transition-all hover:-translate-y-0.5 hover:shadow-lg overflow-hidden">
      {/* Property thumbnails header */}
      {preferredProperties.length > 0 && (
        <div className="relative h-20 overflow-hidden bg-gray-100">
          <div className="absolute inset-0 flex">
            {preferredProperties.map((prop, i) => (
              <div
                key={prop.id}
                className="relative flex-1"
                style={{ clipPath: i === 0 ? undefined : "polygon(10% 0, 100% 0, 100% 100%, 0% 100%)" }}
              >
                <Image
                  src={prop.imageUrl || "/placeholder.svg"}
                  alt={prop.title}
                  fill
                  className="object-cover"
                  sizes="33vw"
                  unoptimized={(prop.imageUrl || "/placeholder.svg").endsWith(".svg")}
                  onError={(e) => { e.currentTarget.style.display = "none" }}
                />
              </div>
            ))}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-2 left-2 flex items-center gap-1 text-xs text-white">
            <MapPin className="h-3 w-3" />
            <span>{investor.mandate?.preferredAreas?.slice(0, 2).join(", ")}</span>
          </div>
        </div>
      )}
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <EditableAvatar
              storageKey={`investor:${investor.id}`}
              name={investor.name}
              src={investor.avatar}
              size={40}
              editable={false}
              className="shrink-0 ring-2 ring-white shadow-sm"
            />
            <div className="min-w-0">
              <CardTitle className="text-base">
                <Link href={`/investors/${investor.id}`} className="hover:text-green-600 transition-colors">
                  {investor.name}
                </Link>
              </CardTitle>
              <div className="mt-0.5 flex items-center gap-1 text-sm text-gray-500">
                <Building2 className="h-3 w-3" />
                <span className="truncate">{investor.company}</span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <Badge variant="outline" className={statusColors[investor.status]}>
              {investor.status === "active" ? "Active" : investor.status === "pending" ? "Watching" : "Closed"}
            </Badge>
            {strategy ? (
              <Badge variant="secondary" className="hidden sm:inline-flex bg-green-50 text-green-700">
                {strategy}
              </Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="grid gap-3">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-500">
              <Mail className="h-3.5 w-3.5" />
              <span className="truncate">{investor.email}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <Phone className="h-3.5 w-3.5" />
              <span className="truncate">{investor.phone}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm">
            <div className="space-y-1">
              <div className="text-xs text-gray-500">Yield target</div>
              <div className="font-semibold text-gray-900">{yieldTarget ?? "—"}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-gray-500">Deals</div>
              <div className="font-semibold text-gray-900">{ongoingDeals ? `${ongoingDeals} active` : preferredAreasCount ? `${preferredAreasCount} areas` : "—"}</div>
            </div>
          </div>

          {aumLabel ? <div className="text-xs font-medium text-green-600">{aumLabel}</div> : null}

          <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" />
              <span>Last contact: {investor.lastContact}</span>
            </div>
            <span className="font-medium text-gray-700">{investor.totalDeals} deals</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" asChild className="flex-1 sm:flex-none">
              <Link href={`/investors/${investor.id}`}>Open</Link>
            </Button>
            <Button size="sm" asChild className="flex-1 sm:flex-none bg-green-500 hover:bg-green-600 text-white">
              <Link href={`/recommendations/new?investorId=${investor.id}`}>
                <Sparkles className="mr-2 h-4 w-4" />
                Recommend
              </Link>
            </Button>
            {ongoingDeals ? (
              <Button size="sm" variant="ghost" asChild className="flex-1 sm:flex-none">
                <Link href={`/investors/${investor.id}#dealRooms`}>
                  <FolderKanban className="mr-2 h-4 w-4" />
                  Deals
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
