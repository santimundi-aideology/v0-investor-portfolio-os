/**
 * Ingest Bayut Listings
 * 
 * Fetches listings from Bayut (via API or mock data) and stores them in portal_listings table.
 * These listings are then compared against DLD transaction data to identify opportunities.
 * 
 * Usage:
 *   npx tsx scripts/ingest-bayut-listings.ts [--mock] [--area=AREA_NAME] [--count=N]
 * 
 * Examples:
 *   npx tsx scripts/ingest-bayut-listings.ts --mock --count=200
 *   npx tsx scripts/ingest-bayut-listings.ts --area="Dubai Marina"
 */

import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const rapidApiKey = process.env.RAPIDAPI_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Parse command line args
const args = process.argv.slice(2)
const useMock = args.includes("--mock") || !rapidApiKey
const areaArg = args.find(a => a.startsWith("--area="))?.split("=")[1]
const countArg = args.find(a => a.startsWith("--count="))?.split("=")[1]
const listingCount = countArg ? parseInt(countArg, 10) : 100

// Popular Dubai areas for realistic mock data
const DUBAI_AREAS = [
  "Dubai Marina",
  "Downtown Dubai",
  "Palm Jumeirah",
  "Business Bay",
  "Jumeirah Beach Residence",
  "Dubai Hills Estate",
  "Arabian Ranches",
  "Jumeirah Village Circle",
  "Dubai Silicon Oasis",
  "Al Barsha",
  "Motor City",
  "DIFC",
  "Jumeirah Lake Towers",
  "The Springs",
  "Al Warsan First",
  "Mirdif",
  "Al Nahda",
  "International City",
  "Discovery Gardens",
  "Dubai Sports City",
]

const PROPERTY_TYPES = [
  { type: "Apartment", subTypes: ["Apartment", "Studio", "Penthouse", "Duplex"] },
  { type: "Villa", subTypes: ["Villa", "Townhouse"] },
  { type: "Office", subTypes: ["Office"] },
]

const AGENCIES = [
  "Emaar Properties",
  "Damac Properties",
  "Fam Properties",
  "Allsopp & Allsopp",
  "Betterhomes",
  "Haus & Haus",
  "Metropolitan Premium Properties",
  "LuxuryProperty.com",
  "Driven Properties",
  "Provident Real Estate",
]

interface BayutListing {
  portal: string
  listing_id: string
  listing_url: string
  area_name: string
  building_name: string | null
  project_name: string | null
  property_type: string
  bedrooms: number
  bathrooms: number
  size_sqm: number
  asking_price: number
  price_per_sqm: number
  listing_type: string
  is_active: boolean
  listed_date: string
  days_on_market: number
  agent_name: string | null
  agency_name: string
  has_parking: boolean
  furnished: string
}

/**
 * Generate realistic mock Bayut listings based on DLD area data
 */
async function generateMockListings(count: number, areaFilter?: string): Promise<BayutListing[]> {
  console.log(`Generating ${count} mock Bayut listings...`)
  
  // Fetch DLD area medians to make listings realistic
  const { data: areaMedians } = await supabase
    .from("dld_area_medians")
    .select("area_name_en, property_type_en, median_price, median_price_per_sqm, transaction_count")
    .order("transaction_count", { ascending: false })
    .limit(50)
  
  // Build price reference map from DLD data
  const priceMap = new Map<string, { median: number; psm: number }>()
  for (const row of areaMedians || []) {
    const key = `${row.area_name_en}||${row.property_type_en}`
    priceMap.set(key, {
      median: row.median_price || 1500000,
      psm: row.median_price_per_sqm || 15000,
    })
  }
  
  const listings: BayutListing[] = []
  const areas = areaFilter ? [areaFilter] : DUBAI_AREAS
  const today = new Date()
  
  for (let i = 0; i < count; i++) {
    const area = areas[Math.floor(Math.random() * areas.length)]
    const propTypeGroup = PROPERTY_TYPES[Math.floor(Math.random() * PROPERTY_TYPES.length)]
    const propertyType = propTypeGroup.subTypes[Math.floor(Math.random() * propTypeGroup.subTypes.length)]
    const agency = AGENCIES[Math.floor(Math.random() * AGENCIES.length)]
    
    // Get reference price from DLD data
    const priceKey = `${area}||${propTypeGroup.type}`
    const ref = priceMap.get(priceKey) || { median: 1500000, psm: 15000 }
    
    // Generate property details
    let bedrooms: number
    let sizeSqm: number
    
    if (propertyType === "Studio") {
      bedrooms = 0
      sizeSqm = 30 + Math.floor(Math.random() * 30) // 30-60 sqm
    } else if (propertyType === "Apartment") {
      bedrooms = 1 + Math.floor(Math.random() * 4) // 1-4 BR
      sizeSqm = 60 + bedrooms * 30 + Math.floor(Math.random() * 40)
    } else if (propertyType === "Villa" || propertyType === "Townhouse") {
      bedrooms = 3 + Math.floor(Math.random() * 4) // 3-6 BR
      sizeSqm = 200 + bedrooms * 50 + Math.floor(Math.random() * 100)
    } else if (propertyType === "Penthouse") {
      bedrooms = 2 + Math.floor(Math.random() * 4) // 2-5 BR
      sizeSqm = 150 + bedrooms * 50 + Math.floor(Math.random() * 100)
    } else {
      bedrooms = 0
      sizeSqm = 50 + Math.floor(Math.random() * 200) // Office
    }
    
    const bathrooms = Math.max(1, Math.floor(bedrooms * 0.8) + Math.floor(Math.random() * 2))
    
    // Calculate price with some variance from DLD median
    // Add variance: -20% to +30% from median (more likely to be slightly above)
    const variance = -0.2 + Math.random() * 0.5
    const pricePerSqm = ref.psm * (1 + variance)
    const askingPrice = Math.round(sizeSqm * pricePerSqm / 1000) * 1000 // Round to nearest 1000
    
    // Generate listing date (within last 90 days)
    const daysAgo = Math.floor(Math.random() * 90)
    const listedDate = new Date(today)
    listedDate.setDate(listedDate.getDate() - daysAgo)
    
    listings.push({
      portal: "bayut",
      listing_id: `BYT-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
      listing_url: `https://www.bayut.com/for-sale/property/${area.toLowerCase().replace(/\s/g, "-")}/${i}`,
      area_name: area,
      building_name: Math.random() > 0.3 ? `${area} Tower ${Math.floor(Math.random() * 10) + 1}` : null,
      project_name: null,
      property_type: propertyType,
      bedrooms,
      bathrooms,
      size_sqm: Math.round(sizeSqm * 100) / 100,
      asking_price: askingPrice,
      price_per_sqm: Math.round(pricePerSqm),
      listing_type: "sale",
      is_active: true,
      listed_date: listedDate.toISOString().slice(0, 10),
      days_on_market: daysAgo,
      agent_name: null,
      agency_name: agency,
      has_parking: Math.random() > 0.2,
      furnished: Math.random() > 0.6 ? "furnished" : "unfurnished",
    })
  }
  
  return listings
}

/**
 * Fetch listings from Bayut API via RapidAPI
 */
async function fetchBayutListings(area: string, count: number): Promise<BayutListing[]> {
  if (!rapidApiKey) {
    console.warn("No RAPIDAPI_KEY found, falling back to mock data")
    return generateMockListings(count, area)
  }
  
  console.log(`Fetching Bayut listings for ${area}...`)
  
  // Note: This is a placeholder - actual implementation depends on RapidAPI endpoint structure
  const BAYUT_API_BASE = process.env.BAYUT_API_BASE_URL || "https://uae-real-estate2.p.rapidapi.com"
  
  try {
    const response = await fetch(`${BAYUT_API_BASE}/properties_search`, {
      method: "POST",
      headers: {
        "x-rapidapi-host": "uae-real-estate2.p.rapidapi.com",
        "x-rapidapi-key": rapidApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        location_ids: [], // Would need to map area name to location ID
        purpose: "for-sale",
        category: "residential",
        page: 1,
      }),
    })
    
    if (!response.ok) {
      console.warn(`Bayut API error: ${response.status}, falling back to mock data`)
      return generateMockListings(count, area)
    }
    
    const data = await response.json()
    
    // Transform API response to our format
    const listings: BayutListing[] = (data.results || []).slice(0, count).map((p: Record<string, unknown>) => ({
      portal: "bayut",
      listing_id: String(p.id),
      listing_url: (p.meta as Record<string, unknown>)?.url as string || "",
      area_name: (p.location as Record<string, unknown>)?.community?.name || area,
      building_name: (p.location as Record<string, unknown>)?.sub_community?.name || null,
      project_name: null,
      property_type: (p.type as Record<string, unknown>)?.sub || (p.type as Record<string, unknown>)?.main || "Apartment",
      bedrooms: (p.details as Record<string, unknown>)?.bedrooms || 0,
      bathrooms: (p.details as Record<string, unknown>)?.bathrooms || 1,
      size_sqm: ((p.area as Record<string, unknown>)?.built_up || 0) * 0.092903, // Convert sqft to sqm
      asking_price: p.price as number || 0,
      price_per_sqm: 0, // Will calculate
      listing_type: "sale",
      is_active: true,
      listed_date: ((p.meta as Record<string, unknown>)?.created_at as string)?.split(" ")[0] || new Date().toISOString().slice(0, 10),
      days_on_market: 0,
      agent_name: (p.agent as Record<string, unknown>)?.name || null,
      agency_name: (p.agency as Record<string, unknown>)?.name || "Unknown",
      has_parking: ((p.amenities as string[]) || []).some((a: string) => a.toLowerCase().includes("parking")),
      furnished: (p.details as Record<string, unknown>)?.is_furnished ? "furnished" : "unfurnished",
    }))
    
    // Calculate price per sqm
    for (const l of listings) {
      if (l.size_sqm > 0) {
        l.price_per_sqm = Math.round(l.asking_price / l.size_sqm)
      }
    }
    
    return listings
  } catch (err) {
    console.warn("Bayut API error:", err)
    return generateMockListings(count, area)
  }
}

/**
 * Upsert listings to database
 */
async function upsertListings(listings: BayutListing[]): Promise<number> {
  if (listings.length === 0) return 0
  
  console.log(`Upserting ${listings.length} listings to portal_listings...`)
  
  const BATCH_SIZE = 100
  let upserted = 0
  
  for (let i = 0; i < listings.length; i += BATCH_SIZE) {
    const batch = listings.slice(i, i + BATCH_SIZE)
    
    const { error, count } = await supabase
      .from("portal_listings")
      .upsert(batch, {
        onConflict: "portal,listing_id",
        ignoreDuplicates: false,
      })
    
    if (error) {
      console.error(`Error upserting batch ${i / BATCH_SIZE + 1}:`, error.message)
    } else {
      upserted += batch.length
      console.log(`  Batch ${i / BATCH_SIZE + 1}: ${batch.length} listings`)
    }
  }
  
  return upserted
}

/**
 * Display summary of ingested listings
 */
async function displaySummary() {
  const { data: summary, error } = await supabase
    .from("portal_listings")
    .select("area_name, property_type, asking_price")
    .eq("is_active", true)
  
  if (error || !summary) {
    console.warn("Could not fetch summary:", error?.message)
    return
  }
  
  // Group by area
  const areaStats = new Map<string, { count: number; totalPrice: number }>()
  for (const l of summary) {
    const area = l.area_name || "Unknown"
    const stats = areaStats.get(area) || { count: 0, totalPrice: 0 }
    stats.count++
    stats.totalPrice += l.asking_price || 0
    areaStats.set(area, stats)
  }
  
  console.log("\n--- Portal Listings Summary ---\n")
  console.log("Listings by area:")
  console.log("-".repeat(60))
  
  const sorted = [...areaStats.entries()].sort((a, b) => b[1].count - a[1].count)
  for (const [area, stats] of sorted.slice(0, 15)) {
    const avgPrice = stats.totalPrice / stats.count
    console.log(
      `${area.padEnd(30)} | ${String(stats.count).padStart(4)} listings | ` +
      `Avg: AED ${Math.round(avgPrice).toLocaleString().padStart(12)}`
    )
  }
  
  console.log("-".repeat(60))
  console.log(`Total: ${summary.length} active listings`)
}

async function main() {
  console.log("=== Bayut Listings Ingestion ===\n")
  console.log(`Mode: ${useMock ? "Mock data" : "API fetch"}`)
  console.log(`Count: ${listingCount}`)
  if (areaArg) console.log(`Area filter: ${areaArg}`)
  console.log()
  
  let listings: BayutListing[]
  
  if (useMock) {
    listings = await generateMockListings(listingCount, areaArg)
  } else {
    listings = await fetchBayutListings(areaArg || "Dubai", listingCount)
  }
  
  console.log(`\nGenerated/fetched ${listings.length} listings`)
  
  // Show sample
  if (listings.length > 0) {
    console.log("\nSample listing:")
    console.log(JSON.stringify(listings[0], null, 2))
  }
  
  // Upsert to database
  const count = await upsertListings(listings)
  console.log(`\n✓ Upserted ${count} listings to portal_listings`)
  
  // Display summary
  await displaySummary()
  
  console.log("\n✓ Done")
}

main().catch(console.error)
