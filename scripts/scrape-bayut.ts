/**
 * Web scraper for Bayut real estate listings
 * 
 * DISCLAIMER: Web scraping may violate Terms of Service.
 * Use responsibly and consider getting official API access.
 * 
 * Run with: npx tsx scripts/scrape-bayut.ts
 */

import * as cheerio from "cheerio"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Areas to scrape
const AREAS = [
  "dubai-marina",
  "business-bay", 
  "palm-jumeirah",
  "downtown-dubai",
  "jumeirah-village-circle-jvc",
  "dubai-hills-estate",
  "arabian-ranches",
  "jumeirah-beach-residence-jbr",
  "dubai-sports-city",
  "al-barsha",
]

// Map Bayut area slugs to our DB area names
const AREA_MAP: Record<string, string> = {
  "dubai-marina": "Marsa Dubai",
  "business-bay": "Business Bay",
  "palm-jumeirah": "Palm Jumeirah",
  "downtown-dubai": "Burj Khalifa",
  "jumeirah-village-circle-jvc": "Al Barsha South Fourth",
  "dubai-hills-estate": "Hadaeq Sheikh Mohammed Bin Rashid",
  "arabian-ranches": "Wadi Al Safa 5",
  "jumeirah-beach-residence-jbr": "Marsa Dubai",
  "dubai-sports-city": "Al Hebiah Fourth",
  "al-barsha": "Al Barsha",
}

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

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
      },
    })
    
    if (!response.ok) {
      console.error(`Failed to fetch ${url}: ${response.status}`)
      return null
    }
    
    return await response.text()
  } catch (err) {
    console.error(`Error fetching ${url}:`, err)
    return null
  }
}

function parsePrice(priceStr: string): number {
  // Remove "AED", commas, and whitespace
  const cleaned = priceStr.replace(/[AED,\s]/gi, "")
  return parseInt(cleaned) || 0
}

function parseSize(sizeStr: string): number | null {
  // Extract sqft and convert to sqm
  const match = sizeStr.match(/([\d,]+)\s*(?:sqft|sq\.?\s*ft)/i)
  if (match) {
    const sqft = parseInt(match[1].replace(/,/g, ""))
    return Math.round(sqft * 0.0929) // sqft to sqm
  }
  return null
}

function parseBedrooms(text: string): number | null {
  if (text.toLowerCase().includes("studio")) return 0
  const match = text.match(/(\d+)\s*(?:bed|br|bedroom)/i)
  return match ? parseInt(match[1]) : null
}

function parseBathrooms(text: string): number | null {
  const match = text.match(/(\d+)\s*(?:bath|ba|bathroom)/i)
  return match ? parseInt(match[1]) : null
}

async function scrapeBayutArea(areaSlug: string): Promise<ScrapedListing[]> {
  const listings: ScrapedListing[] = []
  const url = `https://www.bayut.com/for-sale/property/dubai/${areaSlug}/`
  
  console.log(`Scraping: ${url}`)
  
  const html = await fetchPage(url)
  if (!html) return listings
  
  const $ = cheerio.load(html)
  
  // Find listing cards - Bayut uses article elements with specific classes
  $('article[aria-label*="Listing"]').each((_, element) => {
    try {
      const $el = $(element)
      
      // Get listing link and ID
      const linkEl = $el.find('a[href*="/property/details"]').first()
      const listingUrl = linkEl.attr("href") || ""
      const listingId = listingUrl.match(/details-(\d+)/)?.[1] || `bayut-${Date.now()}-${Math.random()}`
      
      // Get price
      const priceText = $el.find('[aria-label*="Price"]').text() || 
                        $el.find('span:contains("AED")').first().text()
      const price = parsePrice(priceText)
      
      if (!price) return // Skip if no price found
      
      // Get property details
      const titleText = $el.find('h2, [aria-label*="Title"]').text()
      
      // Bedrooms/bathrooms
      const bedsText = $el.find('[aria-label*="Bed"]').text() || titleText
      const bathsText = $el.find('[aria-label*="Bath"]').text() || titleText
      const bedrooms = parseBedrooms(bedsText)
      const bathrooms = parseBathrooms(bathsText)
      
      // Size
      const sizeText = $el.find('[aria-label*="Area"], [aria-label*="Size"]').text() || ""
      const sizeSqm = parseSize(sizeText)
      
      // Property type from title
      let propertyType = "apartment"
      if (titleText.toLowerCase().includes("villa")) propertyType = "villa"
      else if (titleText.toLowerCase().includes("townhouse")) propertyType = "townhouse"
      else if (titleText.toLowerCase().includes("penthouse")) propertyType = "penthouse"
      else if (titleText.toLowerCase().includes("land") || titleText.toLowerCase().includes("plot")) propertyType = "land"
      
      // Location/building
      const locationText = $el.find('[aria-label*="Location"]').text() || ""
      const buildingName = locationText.split(",")[0]?.trim() || null
      
      // Agency
      const agencyText = $el.find('[aria-label*="Agency"], [class*="agency"]').text() || null
      
      const listing: ScrapedListing = {
        portal: "bayut",
        listing_id: `BAY-${listingId}`,
        listing_url: listingUrl.startsWith("http") ? listingUrl : `https://www.bayut.com${listingUrl}`,
        property_type: propertyType,
        bedrooms,
        bathrooms,
        size_sqm: sizeSqm,
        area_name: AREA_MAP[areaSlug] || areaSlug,
        building_name: buildingName,
        project_name: null,
        listing_type: "sale",
        asking_price: price,
        price_per_sqm: sizeSqm ? Math.round(price / sizeSqm) : null,
        has_parking: titleText.toLowerCase().includes("parking"),
        furnished: titleText.toLowerCase().includes("furnished") ? "furnished" : "unfurnished",
        listed_date: new Date().toISOString().split("T")[0],
        agency_name: agencyText,
      }
      
      listings.push(listing)
    } catch (err) {
      console.error("Error parsing listing:", err)
    }
  })
  
  // Also try alternative selectors if the main one didn't work
  if (listings.length === 0) {
    // Try different selector patterns
    $('[class*="property-card"], [class*="listing-card"], li[class*="listing"]').each((_, element) => {
      try {
        const $el = $(element)
        const priceText = $el.find('[class*="price"]').text()
        const price = parsePrice(priceText)
        
        if (!price) return
        
        const titleText = $el.find('[class*="title"], h2, h3').first().text()
        const linkEl = $el.find('a[href*="property"]').first()
        const listingUrl = linkEl.attr("href") || ""
        
        const listing: ScrapedListing = {
          portal: "bayut",
          listing_id: `BAY-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          listing_url: listingUrl.startsWith("http") ? listingUrl : `https://www.bayut.com${listingUrl}`,
          property_type: "apartment",
          bedrooms: parseBedrooms(titleText),
          bathrooms: parseBathrooms(titleText),
          size_sqm: parseSize($el.text()),
          area_name: AREA_MAP[areaSlug] || areaSlug,
          building_name: null,
          project_name: null,
          listing_type: "sale",
          asking_price: price,
          price_per_sqm: null,
          has_parking: false,
          furnished: null,
          listed_date: new Date().toISOString().split("T")[0],
          agency_name: null,
        }
        
        if (listing.size_sqm) {
          listing.price_per_sqm = Math.round(price / listing.size_sqm)
        }
        
        listings.push(listing)
      } catch (err) {
        // Skip this one
      }
    })
  }
  
  console.log(`  Found ${listings.length} listings in ${areaSlug}`)
  return listings
}

async function saveToDB(listings: ScrapedListing[]) {
  if (listings.length === 0) return 0
  
  // Remove duplicates by listing_id
  const unique = listings.filter((l, i, arr) => 
    arr.findIndex(x => x.listing_id === l.listing_id) === i
  )
  
  const { data, error } = await supabase
    .from("portal_listings")
    .upsert(unique, { onConflict: "listing_id" })
  
  if (error) {
    console.error("DB error:", error.message)
    return 0
  }
  
  return unique.length
}

async function main() {
  console.log("🏠 Starting Bayut scraper...")
  console.log("⚠️  Note: Web scraping may violate Terms of Service\n")
  
  let totalListings: ScrapedListing[] = []
  
  for (const area of AREAS) {
    const listings = await scrapeBayutArea(area)
    totalListings.push(...listings)
    
    // Be respectful - wait between requests
    await delay(2000)
  }
  
  console.log(`\n📊 Total listings scraped: ${totalListings.length}`)
  
  if (totalListings.length > 0) {
    const saved = await saveToDB(totalListings)
    console.log(`💾 Saved ${saved} listings to database`)
    
    // Show sample
    console.log("\n📋 Sample listings:")
    totalListings.slice(0, 3).forEach(l => {
      console.log(`  - ${l.property_type} in ${l.area_name}: AED ${l.asking_price.toLocaleString()}`)
    })
  } else {
    console.log("\n⚠️  No listings found. Bayut may have changed their page structure.")
    console.log("   Try running with a browser automation tool like Playwright instead.")
  }
}

main().catch(console.error)
