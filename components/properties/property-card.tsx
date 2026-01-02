"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { toast } from "sonner"
import { Bath, BedDouble, Heart, MapPin, Ruler, Share2, Sparkles } from "lucide-react"

import type { Property } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

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
}: PropertyCardProps) {
  const [favorited, setFavorited] = useState(isFavorited)

  useEffect(() => {
    setFavorited(isFavorited)
  }, [isFavorited])

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

  return (
    <Link href={`/properties/${property.id}`} className="block h-full">
      <div className={cn("property-card group", featured && "ring-2 ring-emerald-500/40")}>
        <div className="property-card__image-container">
          <Image
            src={property.imageUrl || "/placeholder.svg"}
            alt={property.title}
            fill
            className="property-card__image"
            sizes="(max-width: 768px) 100vw, 400px"
            priority={featured}
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
        </div>

        <div className="property-card__content">
          <div className="property-card__type">
            <Sparkles className="h-4 w-4 text-emerald-600" />
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
            <div className="text-sm text-muted-foreground">
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
            </div>
            <div className="property-card__cta">View details</div>
          </div>

          {agent ? (
            <div className="property-card__agent">
              <Avatar className="h-10 w-10">
                <AvatarImage src={agent.avatar || "/placeholder.svg"} />
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


