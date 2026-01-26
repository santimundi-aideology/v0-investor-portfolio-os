/**
 * Scrape multiple areas from Bayut using browser snapshots
 * 
 * Run with: npx tsx scripts/scrape-all-areas.ts
 */

import * as fs from "fs"
import * as path from "path"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const BROWSER_LOGS_DIR = "/Users/santimundifalgueras/.cursor/browser-logs"

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

function extractFromSnapshot(content: string, areaName: string, url: string): Listing[] {
  const listings: Listing[] = []
  const lines = content.split("\n")
  
  const prices: number[] = []
  const sizes: number[] = []
  
  for (const line of lines) {
    // Match prices like "name: AED 2,900,000"
    const priceMatch = line.match(/name:\s*AED\s*([\d,]+)/i)
    if (priceMatch) {
      const price = parseInt(priceMatch[1].replace(/,/g, ""))
      if (price >= 100000 && price < 500000000) {
        prices.push(price)
      }
    }
    
    // Match sizes like "name: 1,913 sqft"
    const sizeMatch = line.match(/name:\s*([\d,]+)\s*sqft/i)
    if (sizeMatch) {
      const sqft = parseInt(sizeMatch[1].replace(/,/g, ""))
      if (sqft > 0 && sqft < 100000) {
        sizes.push(Math.round(sqft * 0.0929))
      }
    }
  }
  
  const count = Math.min(prices.length, sizes.length)
  
  for (let i = 0; i < count; i++) {
    const price = prices[i]
    const sizeSqm = sizes[i]
    
    // Estimate bedrooms from size
    let bedrooms = 0
    if (sizeSqm > 200) bedrooms = 4
    else if (sizeSqm > 150) bedrooms = 3
    else if (sizeSqm > 100) bedrooms = 2
    else if (sizeSqm > 50) bedrooms = 1
    
    const listing: Listing = {
      portal: "bayut",
      listing_id: `BAY-${areaName.replace(/\s+/g, "-")}-${Date.now()}-${i}`,
      listing_url: url,
      property_type: sizeSqm > 300 ? "villa" : "apartment",
      bedrooms,
      bathrooms: Math.max(1, bedrooms),
      size_sqm: sizeSqm,
      area_name: areaName,
      building_name: null,
      project_name: null,
      listing_type: "sale",
      asking_price: price,
      price_per_sqm: Math.round(price / sizeSqm),
      has_parking: price > 2000000,
      furnished: null,
      listed_date: new Date().toISOString().split("T")[0],
      agency_name: "Bayut",
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
  // Find all snapshot files
  const files = fs.readdirSync(BROWSER_LOGS_DIR)
    .filter(f => f.startsWith("snapshot-") && f.endsWith(".log"))
    .sort()
    .reverse() // Most recent first
  
  console.log(`Found ${files.length} snapshot files\n`)
  
  // Area mapping based on URL
  const areaMap: Record<string, string> = {
    "dubai-marina": "Marsa Dubai",
    "business-bay": "Business Bay",
    "palm-jumeirah": "Palm Jumeirah",
    "downtown-dubai": "Burj Khalifa",
    "jumeirah-village-circle": "Al Barsha South Fourth",
    "jvc": "Al Barsha South Fourth",
    "dubai-hills": "Hadaeq Sheikh Mohammed Bin Rashid",
    "arabian-ranches": "Wadi Al Safa 5",
    "jbr": "Marsa Dubai",
    "al-barsha": "Al Barsha",
  }
  
  const allListings: Listing[] = []
  const processedUrls = new Set<string>()
  
  for (const file of files.slice(0, 10)) { // Process up to 10 most recent
    const filepath = path.join(BROWSER_LOGS_DIR, file)
    const content = fs.readFileSync(filepath, "utf-8")
    
    // Extract URL from content
    const urlMatch = content.match(/Page URL:\s*(https?:\/\/[^\s]+)/i) ||
                     content.match(/url:\s*(https?:\/\/[^\s]+)/i)
    
    if (!urlMatch) continue
    
    const url = urlMatch[1]
    if (processedUrls.has(url)) continue
    processedUrls.add(url)
    
    // Determine area from URL
    let areaName = "Unknown"
    for (const [slug, name] of Object.entries(areaMap)) {
      if (url.toLowerCase().includes(slug)) {
        areaName = name
        break
      }
    }
    
    if (areaName === "Unknown") continue
    
    const listings = extractFromSnapshot(content, areaName, url)
    
    if (listings.length > 0) {
      console.log(`📍 ${areaName}: ${listings.length} listings`)
      allListings.push(...listings)
    }
  }
  
  console.log(`\n📊 Total extracted: ${allListings.length} listings`)
  
  if (allListings.length > 0) {
    const saved = await saveToDB(allListings)
    console.log(`💾 Saved ${saved} listings to database`)
    
    // Stats by area
    const byArea = allListings.reduce((acc, l) => {
      if (!acc[l.area_name]) {
        acc[l.area_name] = { count: 0, totalPrice: 0, totalPsm: 0 }
      }
      acc[l.area_name].count++
      acc[l.area_name].totalPrice += l.asking_price
      acc[l.area_name].totalPsm += l.price_per_sqm || 0
      return acc
    }, {} as Record<string, { count: number; totalPrice: number; totalPsm: number }>)
    
    console.log("\n📈 Summary by area:")
    for (const [area, stats] of Object.entries(byArea)) {
      const avgPrice = Math.round(stats.totalPrice / stats.count)
      const avgPsm = Math.round(stats.totalPsm / stats.count)
      console.log(`  ${area}: ${stats.count} listings, avg AED ${avgPrice.toLocaleString()}, ${avgPsm.toLocaleString()}/sqm`)
    }
    
    // Check DB totals
    const { count } = await supabase
      .from("portal_listings")
      .select("*", { count: "exact", head: true })
    console.log(`\n📦 Total listings in database: ${count}`)
  }
}

main().catch(console.error)
