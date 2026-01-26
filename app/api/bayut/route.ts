import { NextResponse } from "next/server"
import { searchProperties, searchLocations, bayutToPortalListing } from "@/lib/api/bayut"
import { getSupabaseAdminClient } from "@/lib/db/client"

/**
 * GET /api/bayut - Search Bayut listings
 * Query params:
 * - area: Area name to search (e.g., "Dubai Marina")
 * - purpose: "for-sale" or "for-rent"
 * - bedrooms: Number of bedrooms
 * - price_min, price_max: Price range
 * - page: Page number
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const area = searchParams.get("area") || "Dubai Marina"
    const purpose = (searchParams.get("purpose") as "for-sale" | "for-rent") || "for-sale"
    const bedrooms = searchParams.get("bedrooms")
    const priceMin = searchParams.get("price_min")
    const priceMax = searchParams.get("price_max")
    const page = parseInt(searchParams.get("page") || "1")

    // First, get the location ID for the area
    const locations = await searchLocations(area)
    
    if (!locations.results || locations.results.length === 0) {
      return NextResponse.json({ 
        error: "Area not found",
        suggestions: "Try: Dubai Marina, Palm Jumeirah, Downtown Dubai, JBR, Business Bay"
      }, { status: 404 })
    }

    // Get the first matching community-level location
    const location = locations.results.find(l => l.level === "community") || locations.results[0]

    // Search properties
    const properties = await searchProperties({
      location_ids: [location.id],
      purpose,
      category: "residential",
      bedrooms_min: bedrooms ? parseInt(bedrooms) : undefined,
      bedrooms_max: bedrooms ? parseInt(bedrooms) : undefined,
      price_min: priceMin ? parseInt(priceMin) : undefined,
      price_max: priceMax ? parseInt(priceMax) : undefined,
      page,
    })

    // Filter to Dubai only and convert to our format
    const dubaiProperties = properties.results?.filter(p => 
      p.location?.city?.name === "Dubai"
    ) || []
    const listings = dubaiProperties.map(bayutToPortalListing)

    return NextResponse.json({
      location: {
        id: location.id,
        name: location.name,
        coordinates: location.coordinates,
      },
      total: properties.total || listings.length,
      page,
      listings,
    })
  } catch (error) {
    console.error("Bayut API error:", error)
    return NextResponse.json({ 
      error: "Failed to fetch Bayut listings",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

/**
 * POST /api/bayut - Import Bayut listings to database
 * Body: { area: string, pages?: number, price_min?: number }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { area, pages = 1, price_min = 1000000 } = body

    if (!area) {
      return NextResponse.json({ error: "Area is required" }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient()

    // Get location ID - prefer exact name match, then city level for broad searches
    const locations = await searchLocations(area)
    const location = locations.results?.find(l => l.name.toLowerCase() === area.toLowerCase())
      || locations.results?.find(l => l.level === "city")
      || locations.results?.find(l => l.level === "community") 
      || locations.results?.[0]

    if (!location) {
      return NextResponse.json({ error: "Area not found" }, { status: 404 })
    }

    let totalImported = 0
    let totalDubai = 0
    const errors: string[] = []

    // Fetch multiple pages
    for (let page = 1; page <= Math.min(pages, 5); page++) {
      try {
        const properties = await searchProperties({
          location_ids: [location.id],
          purpose: "for-sale",
          price_min: price_min,
          page,
        })

        if (!properties.results?.length) break

        // Filter to Dubai only (exclude sponsored listings from other emirates)
        const dubaiProperties = properties.results.filter(p => 
          p.location?.city?.name === "Dubai"
        )

        if (!dubaiProperties.length) continue

        // Convert and prepare for upsert
        const listings = dubaiProperties.map(p => {
          const converted = bayutToPortalListing(p)
          return {
            portal: converted.portal,
            listing_id: converted.listing_id,
            listing_url: converted.listing_url,
            property_type: converted.property_type,
            bedrooms: converted.bedrooms,
            bathrooms: converted.bathrooms,
            size_sqm: converted.size_sqm,
            area_name: converted.area_name,
            building_name: converted.building_name,
            project_name: converted.project_name,
            listing_type: converted.listing_type,
            asking_price: converted.asking_price,
            price_per_sqm: converted.price_per_sqm,
            amenities: converted.amenities,
            has_parking: converted.has_parking,
            furnished: converted.furnished,
            listed_date: converted.listed_date,
            agent_name: converted.agent_name,
            agency_name: converted.agency_name,
            is_active: true,
            scraped_at: new Date().toISOString(),
          }
        })

        // Upsert to database
        const { error } = await supabase
          .from("portal_listings")
          .upsert(listings, { 
            onConflict: "portal,listing_id",
            ignoreDuplicates: false 
          })

        if (error) {
          errors.push(`Page ${page}: ${error.message}`)
        } else {
          totalImported += listings.length
          totalDubai += dubaiProperties.length
        }

        // Be nice to the API - small delay between pages
        if (page < pages) {
          await new Promise(r => setTimeout(r, 500))
        }
      } catch (err) {
        errors.push(`Page ${page}: ${err instanceof Error ? err.message : "Unknown error"}`)
      }
    }

    return NextResponse.json({
      success: true,
      area: location.name,
      imported: totalImported,
      dubai_listings: totalDubai,
      pages_fetched: Math.min(pages, 5),
      note: totalDubai < totalImported ? "Some non-Dubai listings were filtered out" : undefined,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error("Bayut import error:", error)
    return NextResponse.json({ 
      error: "Failed to import listings",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
