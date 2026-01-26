/**
 * Extract Bayut listings from browser snapshot files
 * Run with: npx tsx scripts/extract-bayut-browser.ts
 */

import * as fs from "fs"
import * as path from "path"
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

interface ExtractedListing {
  price: number
  size_sqft: number
  bedrooms: number
  bathrooms: number
  property_type: string
  location: string
  title: string
}

function parsePrice(text: string): number | null {
  const match = text.match(/AED\s*([\d,]+)/i)
  if (match) {
    return parseInt(match[1].replace(/,/g, ""))
  }
  return null
}

function parseSqft(text: string): number | null {
  const match = text.match(/([\d,]+)\s*sqft/i)
  if (match) {
    return parseInt(match[1].replace(/,/g, ""))
  }
  return null
}

function extractListingsFromSnapshot(content: string): ExtractedListing[] {
  const listings: ExtractedListing[] = []
  const lines = content.split("\n")
  
  let currentListing: Partial<ExtractedListing> = {}
  let inListingSection = false
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Look for price patterns
    const price = parsePrice(line)
    if (price && price > 100000) {
      if (currentListing.price && currentListing.size_sqft) {
        // Save previous listing if complete
        listings.push(currentListing as ExtractedListing)
      }
      currentListing = { price }
      inListingSection = true
      continue
    }
    
    // Look for size
    const size = parseSqft(line)
    if (size && inListingSection) {
      currentListing.size_sqft = size
      continue
    }
    
    // Look for property type
    if (line.includes("Villa") && !line.includes("Villas for sale")) {
      currentListing.property_type = "Villa"
    } else if (line.includes("Apartment") && !line.includes("Apartments for sale")) {
      currentListing.property_type = "Apartment"
    } else if (line.includes("Townhouse")) {
      currentListing.property_type = "Townhouse"
    } else if (line.includes("Penthouse")) {
      currentListing.property_type = "Penthouse"
    }
    
    // Look for location (Dubai areas)
    const dubaiAreas = [
      "Dubai Marina", "Downtown Dubai", "Palm Jumeirah", "JVC", "JBR", 
      "Business Bay", "Arabian Ranches", "Dubai Hills", "DAMAC Hills",
      "Jumeirah Village Circle", "Jumeirah Lake Towers", "Emirates Hills",
      "The Oasis", "Dubai South", "Al Barsha", "Meydan", "MBR City"
    ]
    
    for (const area of dubaiAreas) {
      if (line.includes(area)) {
        currentListing.location = area
        break
      }
    }
    
    // Look for bedrooms
    const bedsMatch = line.match(/(\d+)\s*(?:Beds?|BR|Bedroom)/i)
    if (bedsMatch) {
      currentListing.bedrooms = parseInt(bedsMatch[1])
    }
    
    // Look for bathrooms
    const bathsMatch = line.match(/(\d+)\s*(?:Baths?|BA|Bathroom)/i)
    if (bathsMatch) {
      currentListing.bathrooms = parseInt(bathsMatch[1])
    }
  }
  
  // Don't forget the last listing
  if (currentListing.price && currentListing.size_sqft) {
    listings.push(currentListing as ExtractedListing)
  }
  
  return listings
}

async function main() {
  const snapshotDir = path.join(process.env.HOME!, ".cursor/browser-logs")
  
  // Find the most recent snapshot files
  const files = fs.readdirSync(snapshotDir)
    .filter(f => f.startsWith("snapshot-") && f.endsWith(".log"))
    .sort()
    .reverse()
    .slice(0, 5) // Last 5 snapshots
  
  console.log(`Found ${files.length} snapshot files`)
  
  const allListings: ExtractedListing[] = []
  
  for (const file of files) {
    const content = fs.readFileSync(path.join(snapshotDir, file), "utf-8")
    const listings = extractListingsFromSnapshot(content)
    console.log(`Extracted ${listings.length} listings from ${file}`)
    allListings.push(...listings)
  }
  
  console.log(`\nTotal extracted: ${allListings.length} listings`)
  
  // Deduplicate by price + size
  const seen = new Set<string>()
  const unique = allListings.filter(l => {
    const key = `${l.price}-${l.size_sqft}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  
  console.log(`Unique listings: ${unique.length}`)
  
  // Show sample
  console.log("\nSample listings:")
  unique.slice(0, 10).forEach((l, i) => {
    console.log(`${i + 1}. AED ${l.price.toLocaleString()} | ${l.size_sqft} sqft | ${l.property_type || "?"} | ${l.location || "Dubai"}`)
  })
  
  // Import to database
  if (unique.length > 0) {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
    
    const toInsert = unique.map((l, idx) => ({
      portal: "bayut",
      listing_id: `browser-${Date.now()}-${idx}`,
      listing_url: "https://www.bayut.com/for-sale/property/dubai/",
      property_type: l.property_type || "Apartment",
      bedrooms: l.bedrooms || null,
      bathrooms: l.bathrooms || null,
      size_sqm: l.size_sqft ? Math.round(l.size_sqft * 0.092903 * 100) / 100 : null,
      area_name: l.location || "Dubai",
      building_name: null,
      project_name: null,
      listing_type: "sale",
      asking_price: l.price,
      price_per_sqm: l.size_sqft ? Math.round(l.price / (l.size_sqft * 0.092903)) : null,
      amenities: [],
      has_parking: null,
      furnished: null,
      listed_date: new Date().toISOString().split("T")[0],
      agent_name: null,
      agency_name: null,
      is_active: true,
      scraped_at: new Date().toISOString(),
    }))
    
    const { error } = await supabase
      .from("portal_listings")
      .upsert(toInsert, { onConflict: "portal,listing_id" })
    
    if (error) {
      console.error("Insert error:", error.message)
    } else {
      console.log(`\nInserted ${toInsert.length} listings to database`)
    }
  }
}

main().catch(console.error)
