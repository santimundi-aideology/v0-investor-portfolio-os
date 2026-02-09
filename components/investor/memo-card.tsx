"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import {
  Building2,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Eye,
  MapPin,
  ShieldCheck,
  X,
  AlertTriangle,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface MemoCardProps {
  memo: {
    id: string
    title: string
    investorId: string
    investorName: string
    propertyId: string
    propertyTitle: string
    status: "draft" | "review" | "approved" | "sent"
    createdAt: string
    updatedAt: string
    listingId?: string
    state?: string
    currentVersion?: number
    trustStatus?: "verified" | "unknown" | "flagged"
  }
  property?: {
    title: string
    area?: string
    price?: number
    imageUrl?: string
    type?: string
  } | null
}

const statusConfig = {
  draft: {
    label: "Draft",
    color: "bg-gray-100 text-gray-600 border-gray-200",
    icon: Clock,
  },
  review: {
    label: "Review",
    color: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/50 dark:text-amber-300",
    icon: Eye,
  },
  approved: {
    label: "Approved",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300",
    icon: Check,
  },
  sent: {
    label: "Sent",
    color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300",
    icon: ChevronRight,
  },
}

const trustStatusConfig = {
  verified: {
    label: "Verified",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: ShieldCheck,
  },
  unknown: {
    label: "Unverified",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    icon: AlertTriangle,
  },
  flagged: {
    label: "Flagged",
    color: "bg-red-50 text-red-700 border-red-200",
    icon: AlertTriangle,
  },
}

export function MemoCard({ memo, property }: MemoCardProps) {
  const status = memo.status || memo.state || "draft"
  const statusInfo = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft
  const StatusIcon = statusInfo.icon

  const trustStatus = memo.trustStatus || "unknown"
  const trustInfo = trustStatusConfig[trustStatus]
  const TrustIcon = trustInfo.icon

  const formatCurrency = (amount: number) => {
    if (amount >= 1_000_000) {
      return `AED ${(amount / 1_000_000).toFixed(1)}M`
    }
    if (amount >= 1_000) {
      return `AED ${(amount / 1_000).toFixed(0)}K`
    }
    return `AED ${amount.toLocaleString()}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <Link href={`/investor/memos/${memo.id}`}>
      <Card className="group overflow-hidden transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer">
        <div className="flex flex-col sm:flex-row">
          {/* Property Image */}
          <div className="relative h-48 sm:h-auto sm:w-48 flex-shrink-0 bg-muted">
            {property?.imageUrl ? (
              <Image
                src={property.imageUrl}
                alt={property.title || "Property"}
                fill
                className="object-cover transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Building2 className="size-12 text-muted-foreground/50" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            
            {/* Status Badge */}
            <Badge
              variant="outline"
              className={cn(
                "absolute top-3 left-3 gap-1.5 border",
                statusInfo.color
              )}
            >
              <StatusIcon className="size-3" />
              {statusInfo.label}
            </Badge>

            {/* Trust Badge */}
            <Badge
              variant="outline"
              className={cn(
                "absolute top-3 right-3 gap-1.5 border",
                trustInfo.color
              )}
            >
              <TrustIcon className="size-3" />
              {trustInfo.label}
            </Badge>
          </div>

          {/* Content */}
          <CardContent className="flex-1 p-4 sm:p-6">
            <div className="space-y-3">
              {/* Title and Location */}
              <div>
                <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
                  {property?.title || memo.propertyTitle || memo.title}
                </h3>
                {property?.area && (
                  <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                    <MapPin className="size-3.5" />
                    {property.area}
                  </div>
                )}
              </div>

              {/* Property Details */}
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {property?.price && (
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-foreground">
                      {formatCurrency(property.price)}
                    </span>
                  </div>
                )}
                {property?.type && (
                  <Badge variant="secondary" className="capitalize">
                    {property.type}
                  </Badge>
                )}
                {memo.currentVersion && (
                  <Badge variant="outline" className="text-xs">
                    v{memo.currentVersion}
                  </Badge>
                )}
              </div>

              {/* Dates */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Calendar className="size-3" />
                  <span>Created {formatDate(memo.createdAt)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="size-3" />
                  <span>Updated {formatDate(memo.updatedAt)}</span>
                </div>
              </div>

              {/* Action Button for pending review */}
              {(status === "review" || status === "sent") && (
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                  >
                    Review Memo
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </div>
      </Card>
    </Link>
  )
}
