import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

/**
 * Extract property data from Bayut/PropertyFinder URLs
 * POST /api/property-intake/extract
 * Body: { url: string } OR { url: string, pageContent: string }
 */

type PortalSource = 
  | "bayut" 
  | "propertyfinder" 
  | "dubizzle" 
  | "houza"
  | "unknown"

interface ExtractedProperty {
  source: PortalSource
  listingId: string | null
  title: string
  price: number
  pricePerSqft: number | null
  size: number | null
  bedrooms: number
  bathrooms: number
  propertyType: string
  area: string
  subArea: string | null
  address: string | null
  furnished: boolean
  parking: number | null
  amenities: string[]
  description: string | null
  images: string[]
  agentName: string | null
  agencyName: string | null
  listingUrl: string
  listedDate: string | null
  coordinates: { lat: number; lng: number } | null
  completionStatus?: "ready" | "off_plan" | "unknown"
  developer?: string | null
  handoverDate?: string | null
  serviceCharge?: number | null
  rentalPotential?: number | null
}

// Bayut API configuration
const BAYUT_API_BASE = process.env.BAYUT_API_BASE_URL || "https://uae-real-estate2.p.rapidapi.com"
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || ""

/**
 * Parse property ID from URL
 */
function parsePortalUrl(url: string): { source: PortalSource; propertyId: string | null } {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()

    if (hostname.includes("bayut.com")) {
      const match = url.match(/details-(\d+)/)
      return { source: "bayut", propertyId: match ? match[1] : null }
    }

    if (hostname.includes("propertyfinder.ae")) {
      const match = url.match(/-(\d+)\.html/) || url.match(/\/(\d+)$/)
      return { source: "propertyfinder", propertyId: match ? match[1] : null }
    }

    if (hostname.includes("dubizzle.com")) {
      const match = url.match(/\/(\d+)\//) || url.match(/-(\d+)\.html/)
      return { source: "dubizzle", propertyId: match ? match[1] : null }
    }

    return { source: "unknown", propertyId: null }
  } catch {
    return { source: "unknown", propertyId: null }
  }
}

function getPortalDisplayName(source: PortalSource): string {
  const names: Record<PortalSource, string> = {
    bayut: "Bayut",
    propertyfinder: "PropertyFinder",
    dubizzle: "Dubizzle",
    houza: "Houza",
    unknown: "Unknown Portal",
  }
  return names[source] || source
}

/**
 * Fetch property from Bayut RapidAPI
 */
async function fetchBayutProperty(propertyId: string): Promise<ExtractedProperty | null> {
  if (!RAPIDAPI_KEY) {
    console.log("RAPIDAPI_KEY not configured")
    return null
  }

  try {
    const response = await fetch(`${BAYUT_API_BASE}/property/${propertyId}`, {
      headers: {
        "x-rapidapi-host": "uae-real-estate2.p.rapidapi.com",
        "x-rapidapi-key": RAPIDAPI_KEY,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      console.error(`Bayut API error: ${response.status}`)
      return null
    }

    const property = await response.json()

    // Handle size conversion (sqm to sqft)
    const sizeSqft = property.area?.built_up
      ? Math.round(property.area.built_up * 10.764)
      : null

    const pricePerSqft = sizeSqft && sizeSqft > 0 && property.price
      ? Math.round(property.price / sizeSqft)
      : null

    // Safely check amenities - they might be objects, not strings
    let hasParking = false
    const amenityList: string[] = []
    if (Array.isArray(property.amenities)) {
      for (const a of property.amenities) {
        if (typeof a === 'string') {
          amenityList.push(a)
          if (a.toLowerCase().includes("parking")) {
            hasParking = true
          }
        } else if (a && typeof a === 'object' && a.text) {
          amenityList.push(a.text)
          if (a.text.toLowerCase().includes("parking")) {
            hasParking = true
          }
        }
      }
    }

    return {
      source: "bayut",
      listingId: property.id?.toString() || propertyId,
      title: property.title || "Untitled Property",
      price: property.price || 0,
      pricePerSqft,
      size: sizeSqft,
      bedrooms: property.details?.bedrooms || 0,
      bathrooms: property.details?.bathrooms || 0,
      propertyType: property.type?.sub || property.type?.main || "Apartment",
      area: property.location?.community?.name || "Dubai",
      subArea: property.location?.sub_community?.name || null,
      address: null,
      furnished: property.details?.is_furnished || false,
      parking: hasParking ? 1 : null,
      amenities: amenityList,
      description: property.description || null,
      images: property.media?.photos?.slice(0, 10) || [],
      agentName: property.agent?.name || null,
      agencyName: property.agency?.name || null,
      listingUrl: property.meta?.url || "",
      listedDate: property.meta?.created_at?.split(" ")[0] || null,
      coordinates: property.location?.coordinates || null,
    }
  } catch (error) {
    console.error("Error fetching from Bayut API:", error)
    return null
  }
}

/**
 * Use Claude to extract property data from page content
 * Accepts either raw HTML or pre-extracted text content
 */
async function extractWithClaude(
  content: string, 
  url: string, 
  source: PortalSource,
  propertyId: string | null
): Promise<ExtractedProperty | null> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) {
    console.error("ANTHROPIC_API_KEY not configured")
    return null
  }

  const anthropic = new Anthropic({ apiKey: anthropicKey })

  // Clean up content - remove excessive whitespace but keep structure
  let cleanContent = content
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')  // Remove HTML tags
    .replace(/\s+/g, ' ')
    .trim()

  // Limit content size
  cleanContent = cleanContent.slice(0, 25000)

  const systemPrompt = `You are a property data extraction expert specializing in UAE real estate listings.

Extract property information from the given Bayut listing content. The content may be messy HTML or text, but contains the property details.

Return ONLY a valid JSON object with these exact fields:
{
  "title": "string - the property headline/title",
  "price": number - price in AED (just the number, no commas or currency),
  "size": number - size in sqft (if in sqm, multiply by 10.764),
  "bedrooms": number (0 for studio),
  "bathrooms": number,
  "propertyType": "Apartment" | "Villa" | "Penthouse" | "Townhouse" | "Studio" | "Duplex",
  "area": "string - main area/community (e.g., Palm Jumeirah, Dubai Marina)",
  "subArea": "string or null - building or sub-community name",
  "furnished": boolean,
  "amenities": ["array of amenity strings like Pool, Gym, Parking, etc"],
  "description": "string - property description (max 400 chars)",
  "agentName": "string or null",
  "agencyName": "string or null",
  "developer": "string or null",
  "yearBuilt": number or null,
  "serviceCharge": number or null (AED per sqft),
  "averageRent": number or null (annual rent in AED)
}

IMPORTANT RULES:
1. For price, look for the main listing price (usually the largest AED amount near the title)
2. Common Dubai areas: Palm Jumeirah, Dubai Marina, Downtown Dubai, Business Bay, JVC, JBR, Dubai Hills, DIFC, Bluewaters, Arabian Ranches
3. Service charge is usually in format "AED X.XX / sqft"
4. Look for "Built-up Area" for the actual size
5. If bedrooms is not found, check for patterns like "3 Bedroom" or "3BR"
6. DO NOT make up data - use null if information is not found`

  try {
    const response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `Extract property data from this ${getPortalDisplayName(source)} listing. Return ONLY the JSON object, no explanations:\n\n${cleanContent}`
        }
      ],
      system: systemPrompt,
    })

    const textContent = response.content.find(block => block.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      console.error("No text content in Claude response")
      return null
    }

    // Extract JSON from response
    let jsonStr = textContent.text.trim()
    
    // Remove markdown code blocks if present
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7)
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3)
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3)
    }
    jsonStr = jsonStr.trim()

    const aiData = JSON.parse(jsonStr)

    // Build the property object
    const property: ExtractedProperty = {
      source,
      listingId: propertyId,
      title: aiData.title || "Property Listing",
      price: aiData.price || 0,
      pricePerSqft: null,
      size: aiData.size || null,
      bedrooms: aiData.bedrooms ?? 0,
      bathrooms: aiData.bathrooms ?? 0,
      propertyType: aiData.propertyType || "Apartment",
      area: aiData.area || "Dubai",
      subArea: aiData.subArea || null,
      address: null,
      furnished: aiData.furnished ?? false,
      parking: aiData.amenities?.some((a: string) => 
        a.toLowerCase().includes('parking')
      ) ? 1 : null,
      amenities: aiData.amenities || [],
      description: aiData.description || null,
      images: [],
      agentName: aiData.agentName || null,
      agencyName: aiData.agencyName || null,
      listingUrl: url,
      listedDate: null,
      coordinates: null,
      developer: aiData.developer || null,
      serviceCharge: aiData.serviceCharge || null,
      rentalPotential: aiData.averageRent || null,
    }

    // Calculate price per sqft
    if (property.price && property.size && property.size > 0) {
      property.pricePerSqft = Math.round(property.price / property.size)
    }

    console.log(`[Claude] Extracted: ${property.title} - AED ${property.price?.toLocaleString()} - ${property.area}`)

    return property
  } catch (error) {
    console.error("Claude extraction error:", error)
    return null
  }
}

/**
 * Fetch page content with browser-like headers
 */
async function fetchPageContent(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
      },
    })

    if (!response.ok) {
      console.error(`Failed to fetch page: ${response.status}`)
      return null
    }

    const html = await response.text()
    
    // Check if we got actual content
    if (html.length < 1000) {
      console.error("Page content too short, possibly blocked")
      return null
    }

    return html
  } catch (error) {
    console.error("Error fetching page:", error)
    return null
  }
}

/**
 * Extract images from HTML
 */
function extractImagesFromHtml(html: string): string[] {
  const images: string[] = []
  
  // Get og:image
  const ogMatch = html.match(/<meta property="og:image" content="([^"]+)"/)
  if (ogMatch) {
    images.push(ogMatch[1])
  }

  // Get images from srcset or src
  const imgMatches = html.matchAll(/(?:src|data-src)="(https:\/\/[^"]*bayut[^"]*\.(?:jpg|jpeg|png|webp)[^"]*)"/gi)
  for (const match of imgMatches) {
    if (match[1] && !images.includes(match[1]) && images.length < 10) {
      images.push(match[1])
    }
  }

  return images
}

const SUPPORTED_PORTALS = ["Bayut", "PropertyFinder", "Dubizzle"]

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { url, pageContent } = body

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      )
    }

    // Validate URL
    try {
      new URL(url)
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      )
    }

    const { source, propertyId } = parsePortalUrl(url)

    if (source === "unknown") {
      return NextResponse.json(
        { 
          error: `Unsupported portal. We support: ${SUPPORTED_PORTALS.join(", ")}.`,
          supportedPortals: SUPPORTED_PORTALS,
        },
        { status: 400 }
      )
    }

    let property: ExtractedProperty | null = null

    // Option 1: Client provided page content (best for Bayut)
    if (pageContent && typeof pageContent === "string" && pageContent.length > 100) {
      console.log(`Using client-provided page content (${pageContent.length} chars)`)
      property = await extractWithClaude(pageContent, url, source, propertyId)
      
      // Try to get images from the content
      if (property) {
        const images = extractImagesFromHtml(pageContent)
        if (images.length > 0) {
          property.images = images
        }
      }
    }

    // Option 2: Try Bayut RapidAPI (if available)
    if (!property && source === "bayut" && propertyId && RAPIDAPI_KEY) {
      console.log("Attempting Bayut RapidAPI extraction...")
      property = await fetchBayutProperty(propertyId)
    }

    // Option 3: Try server-side fetch with Claude
    if (!property) {
      console.log("Attempting server-side fetch + Claude extraction...")
      const html = await fetchPageContent(url)
      
      if (html) {
        property = await extractWithClaude(html, url, source, propertyId)
        
        // Extract images
        if (property) {
          const images = extractImagesFromHtml(html)
          if (images.length > 0) {
            property.images = images
          }
        }
      }
    }

    // If still no data, return error with helpful message
    if (!property) {
      return NextResponse.json(
        { 
          error: `Could not extract property data from ${getPortalDisplayName(source)}. The site may be blocking automated access. Try using the bookmarklet below to extract data directly from the page.`,
          portal: getPortalDisplayName(source),
          hint: "bookmarklet",
        },
        { status: 503 }
      )
    }

    // Ensure listing ID is set
    if (!property.listingId && propertyId) {
      property.listingId = propertyId
    }

    return NextResponse.json({
      success: true,
      property,
      source,
      portalName: getPortalDisplayName(source),
      propertyId,
    })
  } catch (error) {
    console.error("Property extraction error:", error)
    return NextResponse.json(
      { error: "Failed to extract property data. Please try again." },
      { status: 500 }
    )
  }
}
