/**
 * Extract Bayut listings from browser snapshot files
 * 
 * Run with: npx tsx scripts/extract-bayut-snapshot.ts
 */

import * as fs from "fs"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

interface Listing {
  portal: string
  listing_id: string
  listing_url: string
  property_type: string
  bedrooms: number | null
  bathrooms: number | null
  size_sqm: number | null
  area_name: string
  building_name: string | null
  project_name: string | null
  listing_type: string
  asking_price: number
  price_per_sqm: number | null
  has_parking: boolean
  furnished: string | null
  listed_date: string | null
  agency_name: string | null
}

function parsePrice(text: string): number {
  const match = text.match(/AED\s*([\d,]+)/i)
  if (match) {
    return parseInt(match[1].replace(/,/g, ""))
  }
  return 0
}

function parseSqft(text: string): number | null {
  const match = text.match(/([\d,]+)\s*sqft/i)
  if (match) {
    const sqft = parseInt(match[1].replace(/,/g, ""))
    return Math.round(sqft * 0.0929) // Convert to sqm
  }
  return null
}

function extractFromSnapshot(content: string, areaName: string): Listing[] {
  const listings: Listing[] = []
  const lines = content.split("\n")
  
  // Find all price entries (AED X,XXX,XXX pattern)
  const prices: number[] = []
  const sizes: number[] = []
  
  for (const line of lines) {
    const priceMatch = line.match(/name:\s*AED\s*([\d,]+)/i)
    if (priceMatch) {
      const price = parseInt(priceMatch[1].replace(/,/g, ""))
      if (price >= 100000) { // Minimum realistic price
        prices.push(price)
      }
    }
    
    const sizeMatch = line.match(/name:\s*([\d,]+)\s*sqft/i)
    if (sizeMatch) {
      const sqft = parseInt(sizeMatch[1].replace(/,/g, ""))
      sizes.push(Math.round(sqft * 0.0929))
    }
  }
  
  console.log(`Found ${prices.length} prices and ${sizes.length} sizes`)
  
  // Pair prices with sizes (they should alternate)
  const count = Math.min(prices.length, sizes.length)
  
  for (let i = 0; i < count; i++) {
    const price = prices[i]
    const sizeSqm = sizes[i]
    
    const listing: Listing = {
      portal: "bayut",
      listing_id: `BAY-${areaName.replace(/\s+/g, "-")}-${Date.now()}-${i}`,
      listing_url: `https://www.bayut.com/for-sale/property/dubai/`,
      property_type: "apartment",
      bedrooms: sizeSqm > 150 ? 3 : sizeSqm > 100 ? 2 : sizeSqm > 50 ? 1 : 0,
      bathrooms: null,
      size_sqm: sizeSqm,
      area_name: areaName,
      building_name: null,
      project_name: null,
      listing_type: "sale",
      asking_price: price,
      price_per_sqm: sizeSqm ? Math.round(price / sizeSqm) : null,
      has_parking: false,
      furnished: null,
      listed_date: new Date().toISOString().split("T")[0],
      agency_name: null,
    }
    
    listings.push(listing)
  }
  
  return listings
}

async function saveToDB(listings: Listing[]) {
  if (listings.length === 0) return 0
  
  const { error } = await supabase
    .from("portal_listings")
    .upsert(listings, { onConflict: "listing_id" })
  
  if (error) {
    console.error("DB error:", error.message)
    return 0
  }
  
  return listings.length
}

async function main() {
  // Read the snapshot file
  const snapshotPath = "/Users/santimundifalgueras/.cursor/browser-logs/snapshot-2026-01-25T12-35-36-000Z.log"
  
  if (!fs.existsSync(snapshotPath)) {
    console.error("Snapshot file not found:", snapshotPath)
    console.log("Please run browser_navigate to Bayut first")
    process.exit(1)
  }
  
  const content = fs.readFileSync(snapshotPath, "utf-8")
  
  // Extract for Dubai Marina
  const areaName = "Marsa Dubai" // Dubai Marina in Arabic
  const listings = extractFromSnapshot(content, areaName)
  
  console.log(`\n📊 Extracted ${listings.length} listings from Dubai Marina`)
  
  if (listings.length > 0) {
    // Show sample
    console.log("\n📋 Sample listings:")
    listings.slice(0, 5).forEach(l => {
      console.log(`  - ${l.bedrooms || "Studio"} BR, ${l.size_sqm} sqm: AED ${l.asking_price.toLocaleString()} (${l.price_per_sqm?.toLocaleString()}/sqm)`)
    })
    
    // Save to DB
    const saved = await saveToDB(listings)
    console.log(`\n💾 Saved ${saved} listings to database`)
    
    // Summary stats
    const avgPrice = listings.reduce((sum, l) => sum + l.asking_price, 0) / listings.length
    const avgPsm = listings.reduce((sum, l) => sum + (l.price_per_sqm || 0), 0) / listings.length
    console.log(`\n📈 Average price: AED ${Math.round(avgPrice).toLocaleString()}`)
    console.log(`📈 Average price/sqm: AED ${Math.round(avgPsm).toLocaleString()}`)
  }
}

main().catch(console.error)
