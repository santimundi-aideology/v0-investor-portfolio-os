"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
import { toast } from "sonner"
import { ArrowDown, ArrowUp, Bath, BedDouble, Camera, Check, Heart, Loader2, MapPin, Minus, Ruler, Share2, Sparkles, TrendingDown, TrendingUp, X } from "lucide-react"

import type { Property, PriceContrast } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

/**
 * Format price for display
 */
function formatPrice(value: number | undefined): string {
  if (!value) return "—"
  if (value >= 1_000_000) return `AED ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `AED ${(value / 1_000).toFixed(0)}K`
  return `AED ${Math.round(value).toLocaleString()}`
}

/**
 * Get badge variant for price assessment
 */
function getPriceContrastVariant(assessment: PriceContrast['assessment']): "default" | "secondary" | "destructive" | "outline" {
  switch (assessment) {
    case 'underpriced':
      return 'default' // Green-ish (good deal)
    case 'overpriced':
      return 'destructive' // Red (caution)
    case 'fair':
    default:
      return 'secondary'
  }
}

/**
 * Get icon for price contrast
 */
function PriceContrastIcon({ assessment }: { assessment: PriceContrast['assessment'] }) {
  switch (assessment) {
    case 'underpriced':
      return <TrendingDown className="h-3 w-3" />
    case 'overpriced':
      return <TrendingUp className="h-3 w-3" />
    case 'fair':
    default:
      return <Minus className="h-3 w-3" />
  }
}

interface PropertyCardProps {
  property: Property
  featured?: boolean
  isNew?: boolean
  isFavorited?: boolean
  agent?: {
    name: string
    role?: string
    avatar?: string
  }
  onFavoriteToggle?: (propertyId: string) => void
  onShare?: (propertyId: string) => void
  onPhotoChange?: (propertyId: string, newUrl: string) => void
}

const readinessLabels: Record<Property["readinessStatus"], string> = {
  DRAFT: "Draft",
  NEEDS_VERIFICATION: "Needs Verification",
  READY_FOR_MEMO: "Ready for Memo",
}

export function PropertyCard({
  property,
  featured = false,
  isNew = false,
  isFavorited = false,
  agent,
  onFavoriteToggle,
  onShare,
  onPhotoChange,
}: PropertyCardProps) {
  const pathname = usePathname()
  const basePath = pathname?.startsWith("/realtor") ? "/realtor" : ""
  const isRealtorContext = basePath === "/realtor"
  const [favorited, setFavorited] = useState(isFavorited)
  const [imageSrc, setImageSrc] = useState<string>(property.imageUrl || "/placeholder.svg")

  // Photo editing state
  const [photoEditOpen, setPhotoEditOpen] = useState(false)
  const [photoUrl, setPhotoUrl] = useState("")
  const [photoSaving, setPhotoSaving] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setFavorited(isFavorited)
  }, [isFavorited])

  useEffect(() => {
    setImageSrc(property.imageUrl || "/placeholder.svg")
  }, [property.imageUrl])

  const priceLabel = useMemo(() => {
    if (!property.price) return "Price on request"
    const formatted =
      property.price >= 1_000_000 ? `AED ${(property.price / 1_000_000).toFixed(1)}M` : `AED ${(property.price / 1_000).toFixed(0)}K`
    return (property.listingType ?? "sale") === "rent" ? `${formatted}/yr` : formatted
  }, [property.price, property.listingType])

  const whyItFits = useMemo(() => {
    if (property.features?.length) return property.features.slice(0, 3)
    const fallback = [
      `Located in ${property.area}`,
      `${property.size.toLocaleString()} sqft`,
      `${property.type === "residential" ? "Tenant-ready" : "Grade A"}`,
    ]
    return fallback
  }, [property.area, property.features, property.size, property.type])

  const handleFavorite = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const next = !favorited
    setFavorited(next)
    onFavoriteToggle?.(property.id)
    toast.info(next ? "Added to favorites" : "Removed from favorites", {
      description: property.title,
    })
  }

  const handleShare = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    onShare?.(property.id)
    toast.success("Share link copied", { description: property.title })
  }

  const handleOpenPhotoEdit = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setPhotoUrl(imageSrc === "/placeholder.svg" ? "" : imageSrc)
    setPhotoEditOpen(true)
    setTimeout(() => photoInputRef.current?.focus(), 50)
  }

  const handleCancelPhotoEdit = (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setPhotoEditOpen(false)
    setPhotoUrl("")
  }

  const handleSavePhoto = async (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const trimmed = photoUrl.trim()
    if (!trimmed) return

    setPhotoSaving(true)
    try {
      const res = await fetch(`/api/listings/${property.id}/image`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: trimmed }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to update image")
      }
      setImageSrc(trimmed)
      onPhotoChange?.(property.id, trimmed)
      toast.success("Photo updated", { description: property.title })
      setPhotoEditOpen(false)
      setPhotoUrl("")
    } catch (err) {
      toast.error("Could not update photo", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setPhotoSaving(false)
    }
  }

  return (
    <Link href={`${basePath}/properties/${property.id}`} className="block h-full">
      <div className={cn("property-card group", featured && "ring-2 ring-green-500/30")}>
        <div className="property-card__image-container">
          <Image
            src={imageSrc}
            alt={property.title}
            fill
            className="property-card__image"
            sizes="(max-width: 768px) 100vw, 400px"
            priority={featured}
            unoptimized={imageSrc.endsWith(".svg")}
            onError={() => setImageSrc("/placeholder.svg")}
          />
          <div className="property-card__image-overlay" />

          <div className="property-card__badges">
            {featured && <span className="property-badge property-badge--featured">Featured</span>}
            {isNew && <span className="property-badge property-badge--new">New</span>}
            <span className="property-badge">{(property.listingType ?? "sale") === "rent" ? "For rent" : "For sale"}</span>
            <span className="property-badge capitalize">{property.type}</span>
          </div>

          <div className="property-card__actions">
            <button
              type="button"
              aria-label="Favorite property"
              className={cn("property-card__action-btn", favorited && "property-card__action-btn--active")}
              onClick={handleFavorite}
            >
              <Heart className="h-4 w-4" fill={favorited ? "currentColor" : "none"} />
            </button>
            <button type="button" aria-label="Share property" className="property-card__action-btn" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
            </button>
          </div>

          {/* Change photo button — realtor context only */}
          {isRealtorContext && !photoEditOpen && (
            <button
              type="button"
              aria-label="Change photo"
              onClick={handleOpenPhotoEdit}
              className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 rounded-lg bg-black/60 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-black/80"
            >
              <Camera className="h-3.5 w-3.5" />
              Change photo
            </button>
          )}

          {/* Inline URL editor */}
          {isRealtorContext && photoEditOpen && (
            <div
              className="absolute inset-x-3 bottom-3 z-20 flex items-center gap-1.5 rounded-xl bg-black/80 px-3 py-2 backdrop-blur-sm"
              onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
            >
              <Camera className="h-4 w-4 shrink-0 text-white/70" />
              <input
                ref={photoInputRef}
                type="url"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="Paste image URL…"
                className="min-w-0 flex-1 bg-transparent text-xs text-white placeholder:text-white/50 focus:outline-none"
                onKeyDown={(e) => {
                  e.stopPropagation()
                  if (e.key === "Enter") handleSavePhoto(e as unknown as React.MouseEvent)
                  if (e.key === "Escape") handleCancelPhotoEdit(e as unknown as React.MouseEvent)
                }}
              />
              <button
                type="button"
                disabled={!photoUrl.trim() || photoSaving}
                onClick={handleSavePhoto}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-teal-500 text-white disabled:opacity-50 hover:bg-teal-400 transition-colors"
                aria-label="Save photo"
              >
                {photoSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                onClick={handleCancelPhotoEdit}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/20 text-white hover:bg-white/30 transition-colors"
                aria-label="Cancel"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="property-card__content">
          <div className="property-card__type">
            <Sparkles className="h-4 w-4 text-primary" />
            {readinessLabels[property.readinessStatus ?? "DRAFT"]}
          </div>

          <h3 className="property-card__title">{property.title}</h3>

          <div className="property-card__location">
            <MapPin className="h-4 w-4" />
            <span>{property.address}</span>
          </div>

          <div className="property-card__features">
            <div className="property-feature">
              <BedDouble />
              <span className="property-feature__value">{property.bedrooms ?? "—"}</span>
              <span>beds</span>
            </div>
            <div className="property-feature">
              <Bath />
              <span className="property-feature__value">{property.bathrooms ?? "—"}</span>
              <span>baths</span>
            </div>
            <div className="property-feature">
              <Ruler />
              <span className="property-feature__value">{property.size.toLocaleString()}</span>
              <span>sqft</span>
            </div>
          </div>

          <div className="space-y-2">
            <Badge variant="secondary" className="rounded-full">
              {property.area}
            </Badge>
            <div className="text-sm text-gray-500">
              {whyItFits.map((reason, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>{reason}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="property-card__footer">
            <div className="property-card__price">
              <div className="property-card__price-amount">{priceLabel}</div>
              <div className="property-card__price-label">
                {property.trustScore ? `Trust score ${property.trustScore}/100` : "Trust score pending"}
              </div>
              {/* Price Contrast Section */}
              {property.priceContrast && property.priceContrast.dldMedianPrice && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>DLD Market:</span>
                    <span className="font-medium">{formatPrice(property.priceContrast.dldMedianPrice)}</span>
                    {property.priceContrast.dldQuarter && (
                      <span className="text-[10px]">({property.priceContrast.dldQuarter})</span>
                    )}
                  </div>
                  {property.priceContrast.assessment && (
                    <Badge 
                      variant={getPriceContrastVariant(property.priceContrast.assessment)}
                      className="gap-1 text-[10px]"
                    >
                      <PriceContrastIcon assessment={property.priceContrast.assessment} />
                      {property.priceContrast.assessmentLabel || property.priceContrast.assessment}
                    </Badge>
                  )}
                  {property.priceContrast.estimatedGrossYield && (
                    <div className="text-[10px] text-gray-500">
                      Est. yield: {(property.priceContrast.estimatedGrossYield * 100).toFixed(1)}%
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="property-card__cta">View details</div>
          </div>

          {agent ? (
            <div className="property-card__agent">
              <Avatar className="h-10 w-10">
                <AvatarImage src={agent.avatar || "/placeholder.svg"} alt={`${agent.name} avatar`} />
                <AvatarFallback>
                  {agent.name
                    .split(" ")
                    .map((n) => n.charAt(0))
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="property-card__agent-info">
                <div className="property-card__agent-name">{agent.name}</div>
                <div className="property-card__agent-role">{agent.role ?? "Relationship lead"}</div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </Link>
  )
}

export default PropertyCard


