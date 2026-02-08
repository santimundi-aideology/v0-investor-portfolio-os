"use client"

import * as React from "react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Sparkles, MapPin, Bed, Bath, Maximize, Eye } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MarketSignalItem } from "@/lib/types"

interface PropertySignalCardProps {
  signal: MarketSignalItem
  listing?: {
    photos?: string[]
    building_name?: string | null
    area_name?: string | null
    property_type?: string | null
    bedrooms?: number | null
    bathrooms?: number | null
    size_sqm?: number | null
    asking_price?: number
    furnished?: string | null
    has_parking?: boolean | null
    amenities?: string[] | null
    agent_name?: string | null
    agent_avatar?: string | null
    agent_title?: string | null
  } | null
  onView: () => void
}

function formatPrice(price: number): string {
  if (price >= 1_000_000) {
    return `AED ${(price / 1_000_000).toFixed(1)}M`
  }
  if (price >= 1_000) {
    return `AED ${(price / 1_000).toFixed(0)}K`
  }
  return `AED ${price.toLocaleString()}`
}

function sqmToSqft(sqm: number): number {
  return Math.round(sqm * 10.764)
}

export function PropertySignalCard({ signal, listing, onView }: PropertySignalCardProps) {
  const photos = listing?.photos || []
  const mainPhoto = photos[0] || ""
  const buildingName = listing?.building_name || signal.propertyTitle || "Property"
  const areaName = listing?.area_name || signal.geoName
  const propertyType = listing?.property_type || signal.segment
  const bedrooms = listing?.bedrooms
  const bathrooms = listing?.bathrooms
  const sizeSqm = listing?.size_sqm || 0
  const sizeSqft = sizeSqm > 0 ? sqmToSqft(sizeSqm) : 0
  const askingPrice = listing?.asking_price || signal.currentValue || 0
  const amenities = listing?.amenities || []
  const furnished = listing?.furnished
  const hasParking = listing?.has_parking
  const agentName = listing?.agent_name
  const agentTitle = listing?.agent_title || "Senior Realtor"
  
  // Get trust/confidence score (0-100)
  const trustScore = Math.round(signal.confidenceScore * 100)
  
  // Determine badges based on signal type and status
  const isFeatured = signal.severity === "urgent"
  const listingType = signal.sourceType === "portal" ? "For sale" : "DLD Data"
  const propertyCategory = propertyType?.toLowerCase().includes("office") || propertyType?.toLowerCase().includes("commercial") 
    ? "Commercial" 
    : propertyType?.toLowerCase().includes("villa") 
      ? "Residential" 
      : "Unit"
  
  return (
    <Card className="overflow-hidden hover:shadow-xl transition-shadow border-gray-200">
      {/* Property Image with Badges */}
      <div className="relative h-52 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200">
        {mainPhoto ? (
          <Image 
            src={mainPhoto} 
            alt={buildingName} 
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 400px"
            onError={(e) => {
              e.currentTarget.style.display = "none"
            }}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <MapPin className="h-16 w-16 text-gray-300" />
          </div>
        )}
        {/* Badges overlaid on image */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          {isFeatured && (
            <Badge className="bg-green-500 text-white hover:bg-green-600 shadow-md">
              Featured
            </Badge>
          )}
          <Badge className="bg-white/95 text-gray-900 hover:bg-white shadow-md">
            {listingType}
          </Badge>
          <Badge className="bg-white/95 text-gray-900 hover:bg-white shadow-md">
            {propertyCategory}
          </Badge>
        </div>
      </div>
      
      <CardContent className="p-5 space-y-4">
        {/* Ready for Memo Badge */}
        {signal.status === "new" && (
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-green-500" />
            <span className="text-sm font-semibold text-green-600 uppercase tracking-wide">
              Ready for Memo
            </span>
          </div>
        )}
        
        {/* Property Title */}
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-1 line-clamp-1">
            {buildingName}
          </h3>
          <div className="flex items-start gap-1.5 text-gray-600">
            <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span className="text-sm line-clamp-1">
              {areaName}
            </span>
          </div>
        </div>
        
        {/* Property Specs */}
        <div className="flex items-center gap-4 text-gray-700">
          <div className="flex items-center gap-1.5">
            <Bed className="h-5 w-5 text-gray-400" />
            <span className="text-sm">
              {bedrooms === 0 ? "Studio" : bedrooms !== null && bedrooms !== undefined ? `${bedrooms}` : "—"} {bedrooms > 0 ? "beds" : ""}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Bath className="h-5 w-5 text-gray-400" />
            <span className="text-sm">
              {bathrooms !== null && bathrooms !== undefined ? `${bathrooms}` : "—"} {bathrooms > 0 ? "baths" : ""}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Maximize className="h-5 w-5 text-gray-400" />
            <span className="text-sm">
              {sizeSqft > 0 ? sizeSqft.toLocaleString() : "—"} {sizeSqft > 0 ? "sqft" : ""}
            </span>
          </div>
        </div>
        
        {/* Area Badge */}
        <div>
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            {areaName}
          </Badge>
        </div>
        
        {/* Amenities */}
        {(amenities.length > 0 || furnished || hasParking) && (
          <ul className="space-y-1.5 text-sm text-gray-600">
            {amenities.slice(0, 3).map((amenity, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0" />
                <span className="capitalize">{amenity.replace(/_/g, " ")}</span>
              </li>
            ))}
            {furnished && (
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0" />
                <span className="capitalize">{furnished.replace(/_/g, " ")}</span>
              </li>
            )}
            {hasParking && (
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0" />
                <span>Parking included</span>
              </li>
            )}
          </ul>
        )}
        
        {/* Price and Trust Score */}
        <div className="pt-3 border-t border-gray-100">
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-3xl font-bold text-gray-900">
                {formatPrice(askingPrice)}
              </p>
              <p className="text-sm text-gray-500 mt-0.5">
                Trust score {trustScore}/100
              </p>
            </div>
          </div>
          
          {/* View Details Button */}
          <Button 
            type="button"
            variant="outline" 
            className="w-full gap-2"
            onClick={onView}
          >
            <Eye className="h-4 w-4" />
            View details
          </Button>
        </div>
        
        {/* Agent Info */}
        {agentName && (
          <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
              {agentName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{agentName}</p>
              <p className="text-sm text-gray-500">{agentTitle}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
