"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ArrowRight,
  Bed,
  Building2,
  MapPin,
  Maximize2,
  Plus,
  TrendingUp,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/layout/empty-state"
import type { ShortlistItem } from "@/lib/types"

interface PropertiesTabProps {
  items: ShortlistItem[]
  investorId: string
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; className: string }> = {
  pending:      { label: "Candidate",    dot: "bg-gray-400",    className: "bg-gray-50 text-gray-600 border-gray-200" },
  presented:    { label: "Presented",    dot: "bg-blue-400",    className: "bg-blue-50 text-blue-700 border-blue-200" },
  interested:   { label: "Interested",   dot: "bg-emerald-400", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected:     { label: "Rejected",     dot: "bg-red-400",     className: "bg-red-50 text-red-600 border-red-200" },
  "under-offer":{ label: "Under Offer",  dot: "bg-amber-400",   className: "bg-amber-50 text-amber-700 border-amber-200" },
  acquired:     { label: "Acquired",     dot: "bg-purple-400",  className: "bg-purple-50 text-purple-700 border-purple-200" },
}

function formatAED(value: number) {
  if (value >= 1_000_000) return `AED ${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `AED ${(value / 1_000).toFixed(0)}K`
  return `AED ${value.toLocaleString()}`
}

export function PropertiesTab({ items, investorId }: PropertiesTabProps) {
  const pathname = usePathname()
  const basePath = pathname?.startsWith("/realtor") ? "/realtor" : ""

  if (items.length === 0) {
    return (
      <EmptyState
        title="No properties yet"
        description="Add candidate properties to track and present to this investor."
        icon={<Building2 className="size-5" />}
        action={
          <Button asChild size="sm" className="bg-green-500 hover:bg-green-600 text-white">
            <Link href={`${basePath}/properties/new?investorId=${investorId}&returnTo=investor`}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Property
            </Link>
          </Button>
        }
      />
    )
  }

  const byStatus = {
    active: items.filter((i) => !["rejected"].includes(i.status)),
    rejected: items.filter((i) => i.status === "rejected"),
  }

  return (
    <div className="space-y-6">
      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryChip label="Total" value={items.length} />
        <SummaryChip label="Interested" value={items.filter((i) => i.status === "interested" || i.status === "under-offer" || i.status === "acquired").length} color="emerald" />
        <SummaryChip label="Presented" value={items.filter((i) => i.status === "presented").length} color="blue" />
        <SummaryChip label="Candidates" value={items.filter((i) => i.status === "pending").length} color="gray" />
      </div>

      {/* Add button */}
      <div className="flex justify-end">
        <Button asChild size="sm" className="bg-green-500 hover:bg-green-600 text-white">
          <Link href={`${basePath}/properties/new?investorId=${investorId}&returnTo=investor`}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Property
          </Link>
        </Button>
      </div>

      {/* Active properties */}
      {byStatus.active.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">
            Active ({byStatus.active.length})
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {byStatus.active.map((item) => (
              <PropertyCard key={item.id} item={item} basePath={basePath} />
            ))}
          </div>
        </div>
      )}

      {/* Rejected properties */}
      {byStatus.rejected.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-400">
            Not interested ({byStatus.rejected.length})
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {byStatus.rejected.map((item) => (
              <PropertyCard key={item.id} item={item} basePath={basePath} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PropertyCard({ item, basePath }: { item: ShortlistItem; basePath: string }) {
  const p = item.property
  const config = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending
  const hasImage = !!(p as unknown as { imageUrl?: string }).imageUrl
  const imageUrl = (p as unknown as { imageUrl?: string }).imageUrl

  return (
    <div className="group overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-all hover:border-gray-200 hover:shadow-md">
      {/* Image area */}
      <div className="relative h-36 w-full bg-gray-100 overflow-hidden">
        {hasImage ? (
          <Image
            src={imageUrl!}
            alt={p.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, 50vw"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Building2 className="h-10 w-10 text-gray-300" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {/* Status badge top-left */}
        <div className="absolute top-2.5 left-2.5">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium backdrop-blur-sm ${config.className} border-white/30`}>
            <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
            {config.label}
          </span>
        </div>

        {/* Match score top-right */}
        {item.score > 0 && (
          <div className="absolute top-2.5 right-2.5">
            <span className="inline-flex items-center rounded-full bg-white/90 backdrop-blur-sm px-2 py-0.5 text-[11px] font-semibold text-gray-800">
              {item.score}% match
            </span>
          </div>
        )}

        {/* Price bottom-left */}
        <div className="absolute bottom-2.5 left-2.5">
          <span className="text-sm font-bold text-white drop-shadow-md">{formatAED(p.price)}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3.5 space-y-2">
        <div>
          <h4 className="text-sm font-semibold text-gray-900 truncate group-hover:text-green-700 transition-colors">
            {p.title}
          </h4>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400 truncate">
            <MapPin className="h-3 w-3 shrink-0" />
            {p.area}
          </p>
        </div>

        {/* Details chips */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
          <span className="flex items-center gap-1 capitalize">
            <Building2 className="h-3 w-3 text-gray-400" />
            {p.type}
          </span>
          <span className="flex items-center gap-1">
            <Maximize2 className="h-3 w-3 text-gray-400" />
            {p.size.toLocaleString()} sqft
          </span>
          {(p as unknown as { bedrooms?: number }).bedrooms != null && (
            <span className="flex items-center gap-1">
              <Bed className="h-3 w-3 text-gray-400" />
              {(p as unknown as { bedrooms?: number }).bedrooms} BR
            </span>
          )}
          {p.roi && (
            <span className="flex items-center gap-1 font-medium text-green-600">
              <TrendingUp className="h-3 w-3" />
              {p.roi}% yield
            </span>
          )}
        </div>

        {/* Notes */}
        {item.notes && (
          <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-xs text-gray-600">
            {item.notes}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-50">
          <Badge variant="outline" className="text-[10px] font-normal">
            Score {item.score}/100
          </Badge>
          <Link
            href={`${basePath}/properties/${p.id}`}
            className="inline-flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}

function SummaryChip({ label, value, color }: { label: string; value: number; color?: string }) {
  const bgMap: Record<string, string> = {
    emerald: "border-emerald-200 bg-emerald-50/40",
    blue:    "border-blue-200 bg-blue-50/40",
    gray:    "border-gray-200 bg-gray-50/40",
  }
  const textMap: Record<string, string> = {
    emerald: "text-emerald-700",
    blue:    "text-blue-700",
    gray:    "text-gray-500",
  }
  return (
    <div className={`rounded-xl border px-4 py-3 ${color ? bgMap[color] ?? "" : "border-gray-100"}`}>
      <div className={`text-2xl font-bold ${color ? textMap[color] ?? "text-gray-900" : "text-gray-900"}`}>{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  )
}
