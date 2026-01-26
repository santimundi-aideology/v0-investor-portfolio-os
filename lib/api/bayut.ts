/**
 * Bayut API Client
 * Uses the unofficial Bayut API via RapidAPI
 * Free tier: 750 calls/month
 */

const BAYUT_API_BASE = process.env.BAYUT_API_BASE_URL || "https://uae-real-estate2.p.rapidapi.com"
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || ""

interface BayutLocation {
  id: number
  name: string
  level: string
  coordinates: {
    lat: number
    lng: number
  }
  full: {
    country?: { id: number; name: string }
    city?: { id: number; name: string }
    community?: { id: number; name: string }
    sub_community?: { id: number; name: string }
  }
}

interface BayutProperty {
  id: number
  title: string
  reference_number: string
  purpose: string
  type: {
    main: string
    sub: string
  }
  price: number
  area: {
    built_up: number | null
    plot: number | null
    unit: string
  }
  details: {
    bedrooms: number
    bathrooms: number
    is_furnished: boolean
    completion_status: string
  }
  location: {
    country: { id: number; name: string }
    city: { id: number; name: string }
    community: { id: number; name: string }
    sub_community?: { id: number; name: string }
    coordinates: { lat: number; lng: number }
  }
  agency: {
    id: number
    name: string
  }
  agent: {
    id: number
    name: string
  }
  amenities: string[]
  media: {
    cover_photo: string
    photo_count: number
    photos: string[]
  }
  meta: {
    created_at: string
    updated_at: string
    url: string
  }
}

interface BayutSearchResponse {
  results: BayutProperty[]
  total?: number
  page?: number
}

async function bayutFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${BAYUT_API_BASE}${endpoint}`
  
  const response = await fetch(url, {
    ...options,
    headers: {
      "x-rapidapi-host": "uae-real-estate2.p.rapidapi.com",
      "x-rapidapi-key": RAPIDAPI_KEY,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Bayut API error: ${response.status} - ${errorText}`)
  }

  return response.json()
}

/**
 * Search for locations by query
 */
export async function searchLocations(query: string): Promise<{ results: BayutLocation[] }> {
  return bayutFetch(`/locations_search?query=${encodeURIComponent(query)}`)
}

/**
 * Search for properties
 */
export async function searchProperties(params: {
  location_ids: number[]
  purpose?: "for-sale" | "for-rent"
  category?: "residential" | "commercial"
  property_types?: string[]
  bedrooms_min?: number
  bedrooms_max?: number
  price_min?: number
  price_max?: number
  area_min?: number
  area_max?: number
  page?: number
  sort?: string
}): Promise<BayutSearchResponse> {
  const body = {
    location_ids: params.location_ids,
    purpose: params.purpose || "for-sale",
    category: params.category || "residential",
    property_types: params.property_types,
    bedrooms_min: params.bedrooms_min,
    bedrooms_max: params.bedrooms_max,
    price_min: params.price_min,
    price_max: params.price_max,
    area_min: params.area_min,
    area_max: params.area_max,
    page: params.page || 1,
    sort: params.sort || "date_desc",
  }

  return bayutFetch("/properties_search", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

/**
 * Get property details by ID
 */
export async function getProperty(propertyId: number): Promise<BayutProperty> {
  return bayutFetch(`/property/${propertyId}`)
}

/**
 * Convert Bayut property to our portal_listings format
 */
export function bayutToPortalListing(property: BayutProperty) {
  // Convert sqft to sqm (1 sqft = 0.092903 sqm)
  const sizeSqm = property.area.built_up 
    ? property.area.built_up * 0.092903 
    : null

  const pricePerSqm = sizeSqm && sizeSqm > 0
    ? property.price / sizeSqm
    : null

  return {
    portal: "bayut",
    listing_id: property.id.toString(),
    listing_url: property.meta.url,
    property_type: property.type.sub || property.type.main,
    bedrooms: property.details.bedrooms,
    bathrooms: property.details.bathrooms,
    size_sqm: sizeSqm ? Math.round(sizeSqm * 100) / 100 : null,
    area_name: property.location.community?.name || null,
    building_name: property.location.sub_community?.name || null,
    project_name: null,
    listing_type: property.purpose === "for-sale" ? "sale" : "rent",
    asking_price: property.price,
    price_per_sqm: pricePerSqm ? Math.round(pricePerSqm) : null,
    amenities: property.amenities,
    has_parking: property.amenities.some(a => 
      a.toLowerCase().includes("parking") || 
      a.toLowerCase().includes("covered parking")
    ),
    furnished: property.details.is_furnished ? "furnished" : "unfurnished",
    listed_date: property.meta.created_at?.split(" ")[0] || null,
    agent_name: property.agent?.name || null,
    agency_name: property.agency?.name || null,
    is_active: true,
    // Extra metadata
    latitude: property.location.coordinates?.lat,
    longitude: property.location.coordinates?.lng,
    photos: property.media?.photos?.slice(0, 5) || [],
    city: property.location.city?.name || "Dubai",
  }
}

// Export types
export type { BayutProperty, BayutLocation, BayutSearchResponse }
