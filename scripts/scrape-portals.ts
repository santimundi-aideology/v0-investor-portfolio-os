/**
 * Web scraper for Dubai real estate portals using Playwright
 * 
 * DISCLAIMER: Web scraping may violate Terms of Service.
 * Use responsibly and at your own risk.
 * 
 * Run with: npx tsx scripts/scrape-portals.ts
 */

import { chromium, Browser, Page } from "playwright"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

interface ScrapedListing {
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

// Areas to scrape with their URL slugs
const BAYUT_AREAS = [
  { slug: "dubai-marina", name: "Marsa Dubai" },
  { slug: "business-bay", name: "Business Bay" },
  { slug: "palm-jumeirah", name: "Palm Jumeirah" },
  { slug: "downtown-dubai", name: "Burj Khalifa" },
  { slug: "jumeirah-village-circle-jvc", name: "Al Barsha South Fourth" },
]

const PF_AREAS = [
  { slug: "dubai-marina", name: "Marsa Dubai" },
  { slug: "business-bay", name: "Business Bay" },
  { slug: "palm-jumeirah", name: "Palm Jumeirah" },
  { slug: "downtown-dubai", name: "Burj Khalifa" },
]

function parsePrice(text: string): number {
  const cleaned = text.replace(/[^0-9]/g, "")
  return parseInt(cleaned) || 0
}

function parseSize(text: string): number | null {
  // Look for sqft pattern
  const sqftMatch = text.match(/([\d,]+)\s*(?:sqft|sq\.?\s*ft)/i)
  if (sqftMatch) {
    const sqft = parseInt(sqftMatch[1].replace(/,/g, ""))
    return Math.round(sqft * 0.0929)
  }
  // Look for sqm pattern
  const sqmMatch = text.match(/([\d,]+)\s*(?:sqm|m²)/i)
  if (sqmMatch) {
    return parseInt(sqmMatch[1].replace(/,/g, ""))
  }
  return null
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function scrapeBayut(browser: Browser): Promise<ScrapedListing[]> {
  const listings: ScrapedListing[] = []
  const page = await browser.newPage()
  
  try {
    for (const area of BAYUT_AREAS) {
      const url = `https://www.bayut.com/for-sale/property/dubai/${area.slug}/`
      console.log(`📍 Bayut: Scraping ${area.name}...`)
      
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 })
      await delay(2000) // Wait for JS rendering
      
      // Wait for listings to load
      try {
        await page.waitForSelector('[aria-label*="Listing"], article, [class*="property-card"]', { timeout: 10000 })
      } catch {
        console.log(`   No listings found for ${area.name}`)
        continue
      }
      
      // Extract listings
      const pageListings = await page.evaluate((areaName) => {
        const results: Array<{
          price: string
          beds: string
          baths: string
          size: string
          title: string
          link: string
          agency: string
        }> = []
        
        // Try multiple selector strategies
        const cards = document.querySelectorAll('[aria-label*="Listing"], article[class*="property"], [class*="property-card"], [data-testid*="property"]')
        
        cards.forEach((card) => {
          try {
            // Price - look for AED
            const priceEl = card.querySelector('[aria-label*="Price"], [class*="price"], span[class*="Price"]')
            let price = priceEl?.textContent || ""
            if (!price) {
              const allText = card.textContent || ""
              const priceMatch = allText.match(/AED[\s\d,]+/i)
              price = priceMatch ? priceMatch[0] : ""
            }
            
            // Bedrooms
            const bedsEl = card.querySelector('[aria-label*="Bed"], [class*="bed"]')
            const beds = bedsEl?.textContent || ""
            
            // Bathrooms
            const bathsEl = card.querySelector('[aria-label*="Bath"], [class*="bath"]')
            const baths = bathsEl?.textContent || ""
            
            // Size
            const sizeEl = card.querySelector('[aria-label*="Area"], [aria-label*="Size"], [class*="size"], [class*="area"]')
            const size = sizeEl?.textContent || ""
            
            // Title/Type
            const titleEl = card.querySelector('h2, h3, [class*="title"]')
            const title = titleEl?.textContent || ""
            
            // Link
            const linkEl = card.querySelector('a[href*="property"]') as HTMLAnchorElement | null
            const link = linkEl?.href || ""
            
            // Agency
            const agencyEl = card.querySelector('[class*="agency"], [aria-label*="Agency"]')
            const agency = agencyEl?.textContent || ""
            
            if (price) {
              results.push({ price, beds, baths, size, title, link, agency })
            }
          } catch {
            // Skip
          }
        })
        
        return results
      }, area.name)
      
      // Process each listing
      for (const item of pageListings) {
        const price = parsePrice(item.price)
        if (!price || price < 100000) continue
        
        const sizeSqm = parseSize(item.size)
        const bedsMatch = item.beds.match(/(\d+)/)
        const bathsMatch = item.baths.match(/(\d+)/)
        
        let propertyType = "apartment"
        const titleLower = item.title.toLowerCase()
        if (titleLower.includes("villa")) propertyType = "villa"
        else if (titleLower.includes("townhouse")) propertyType = "townhouse"
        else if (titleLower.includes("penthouse")) propertyType = "penthouse"
        else if (titleLower.includes("land") || titleLower.includes("plot")) propertyType = "land"
        
        const listing: ScrapedListing = {
          portal: "bayut",
          listing_id: `BAY-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          listing_url: item.link,
          property_type: propertyType,
          bedrooms: bedsMatch ? parseInt(bedsMatch[1]) : null,
          bathrooms: bathsMatch ? parseInt(bathsMatch[1]) : null,
          size_sqm: sizeSqm,
          area_name: area.name,
          building_name: null,
          project_name: null,
          listing_type: "sale",
          asking_price: price,
          price_per_sqm: sizeSqm ? Math.round(price / sizeSqm) : null,
          has_parking: titleLower.includes("parking"),
          furnished: titleLower.includes("furnished") ? "furnished" : null,
          listed_date: new Date().toISOString().split("T")[0],
          agency_name: item.agency || null,
        }
        
        listings.push(listing)
      }
      
      console.log(`   Found ${pageListings.length} listings`)
      await delay(3000) // Be respectful
    }
  } finally {
    await page.close()
  }
  
  return listings
}

async function scrapePropertyFinder(browser: Browser): Promise<ScrapedListing[]> {
  const listings: ScrapedListing[] = []
  const page = await browser.newPage()
  
  try {
    for (const area of PF_AREAS) {
      const url = `https://www.propertyfinder.ae/en/buy/${area.slug}-dubai.html`
      console.log(`📍 Property Finder: Scraping ${area.name}...`)
      
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 })
      await delay(2000)
      
      try {
        await page.waitForSelector('[class*="property-card"], [class*="listing-card"], article', { timeout: 10000 })
      } catch {
        console.log(`   No listings found for ${area.name}`)
        continue
      }
      
      const pageListings = await page.evaluate((areaName) => {
        const results: Array<{
          price: string
          beds: string
          baths: string
          size: string
          title: string
          link: string
          agency: string
        }> = []
        
        const cards = document.querySelectorAll('[class*="card"], article')
        
        cards.forEach((card) => {
          try {
            const priceEl = card.querySelector('[class*="price"]')
            let price = priceEl?.textContent || ""
            
            const bedsEl = card.querySelector('[class*="bed"]')
            const beds = bedsEl?.textContent || ""
            
            const bathsEl = card.querySelector('[class*="bath"]')
            const baths = bathsEl?.textContent || ""
            
            const sizeEl = card.querySelector('[class*="area"], [class*="size"]')
            const size = sizeEl?.textContent || ""
            
            const titleEl = card.querySelector('h2, h3, [class*="title"]')
            const title = titleEl?.textContent || ""
            
            const linkEl = card.querySelector('a[href*="property"]') as HTMLAnchorElement | null
            const link = linkEl?.href || ""
            
            if (price && price.includes("AED")) {
              results.push({ price, beds, baths, size, title, link, agency: "" })
            }
          } catch {
            // Skip
          }
        })
        
        return results
      }, area.name)
      
      for (const item of pageListings) {
        const price = parsePrice(item.price)
        if (!price || price < 100000) continue
        
        const sizeSqm = parseSize(item.size)
        const bedsMatch = item.beds.match(/(\d+)/)
        const bathsMatch = item.baths.match(/(\d+)/)
        
        let propertyType = "apartment"
        const titleLower = (item.title || "").toLowerCase()
        if (titleLower.includes("villa")) propertyType = "villa"
        else if (titleLower.includes("townhouse")) propertyType = "townhouse"
        else if (titleLower.includes("penthouse")) propertyType = "penthouse"
        
        const listing: ScrapedListing = {
          portal: "property_finder",
          listing_id: `PF-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          listing_url: item.link,
          property_type: propertyType,
          bedrooms: bedsMatch ? parseInt(bedsMatch[1]) : null,
          bathrooms: bathsMatch ? parseInt(bathsMatch[1]) : null,
          size_sqm: sizeSqm,
          area_name: area.name,
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
      
      console.log(`   Found ${pageListings.length} listings`)
      await delay(3000)
    }
  } finally {
    await page.close()
  }
  
  return listings
}

async function saveToDB(listings: ScrapedListing[]) {
  if (listings.length === 0) return 0
  
  // Generate unique IDs based on URL hash to avoid duplicates
  const processed = listings.map(l => ({
    ...l,
    listing_id: l.listing_url ? `${l.portal.toUpperCase()}-${hashCode(l.listing_url)}` : l.listing_id,
  }))
  
  // Remove duplicates
  const unique = processed.filter((l, i, arr) => 
    arr.findIndex(x => x.listing_id === l.listing_id) === i
  )
  
  const { error } = await supabase
    .from("portal_listings")
    .upsert(unique, { onConflict: "listing_id" })
  
  if (error) {
    console.error("DB error:", error.message)
    return 0
  }
  
  return unique.length
}

function hashCode(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

async function main() {
  console.log("🏠 Starting Portal Scraper (Playwright)")
  console.log("⚠️  Note: Web scraping may violate Terms of Service")
  console.log("=" .repeat(50) + "\n")
  
  const browser = await chromium.launch({ 
    headless: true,
  })
  
  try {
    // Scrape Bayut
    console.log("\n📦 Scraping Bayut...")
    const bayutListings = await scrapeBayut(browser)
    
    // Scrape Property Finder
    console.log("\n📦 Scraping Property Finder...")
    const pfListings = await scrapePropertyFinder(browser)
    
    const allListings = [...bayutListings, ...pfListings]
    
    console.log("\n" + "=".repeat(50))
    console.log(`📊 Total: ${allListings.length} listings`)
    console.log(`   Bayut: ${bayutListings.length}`)
    console.log(`   Property Finder: ${pfListings.length}`)
    
    if (allListings.length > 0) {
      const saved = await saveToDB(allListings)
      console.log(`💾 Saved ${saved} unique listings to database`)
      
      // Show sample
      console.log("\n📋 Sample listings:")
      allListings.slice(0, 5).forEach(l => {
        console.log(`  [${l.portal}] ${l.property_type} in ${l.area_name}: AED ${l.asking_price.toLocaleString()}`)
      })
      
      // Check totals in DB
      const { count } = await supabase
        .from("portal_listings")
        .select("*", { count: "exact", head: true })
      console.log(`\n📈 Total listings in database: ${count}`)
    } else {
      console.log("\n⚠️  No listings scraped. The portals may be blocking scrapers.")
    }
  } finally {
    await browser.close()
  }
}

main().catch(console.error)
