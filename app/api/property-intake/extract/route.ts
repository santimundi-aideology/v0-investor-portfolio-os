import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@supabase/supabase-js"

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
  completionStatus?: "ready" | "off_plan" | "under_construction" | "unknown"
  developer?: string | null
  handoverDate?: string | null
  serviceCharge?: number | null
  rentalPotential?: number | null
  referenceNumber?: string | null
  permitNumber?: string | null
  purpose?: "for-sale" | "for-rent" | null
  buildingName?: string | null
  buildingFloors?: number | null
  totalParkingSpaces?: number | null
  elevators?: number | null
  floorPlanImages?: string[]
  paymentPlan?: {
    downPaymentPercent?: number | null
    preHandoverPercent?: number | null
    handoverPercent?: number | null
    postHandoverPercent?: number | null
  } | null
  verified?: boolean
  verifiedDate?: string | null
  plotSize?: number | null
  coverImageUrl?: string | null
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
 * Normalise completion status string from Bayut to our enum
 */
function normaliseCompletionStatus(raw?: string): "ready" | "off_plan" | "under_construction" | "unknown" {
  if (!raw) return "unknown"
  const s = raw.toLowerCase().replace(/[^a-z]/g, "")
  if (s.includes("underconstruction")) return "under_construction"
  if (s.includes("offplan")) return "off_plan"
  if (s === "ready" || s === "completed") return "ready"
  return "unknown"
}

/**
 * Flatten the grouped amenities structure returned by Bayut API.
 * Bayut returns amenities in several formats:
 *  - Flat strings: ["Pool", "Gym"]
 *  - Objects with .text: [{ text: "Pool" }]
 *  - Grouped objects: [{ type: "Features", items: ["Pool", "Gym"] }]
 *  - Nested arrays: [["Pool", "Gym"]]
 */
function flattenAmenities(raw: unknown): string[] {
  const out: string[] = []
  if (!Array.isArray(raw)) return out

  for (const item of raw) {
    if (typeof item === "string") {
      out.push(item)
    } else if (Array.isArray(item)) {
      // Nested array: [["Pool", "Gym"]]
      for (const sub of item) {
        if (typeof sub === "string") out.push(sub)
      }
    } else if (item && typeof item === "object") {
      // Grouped: { type, items: [...] }
      if (Array.isArray((item as Record<string, unknown>).items)) {
        for (const sub of (item as Record<string, unknown>).items as unknown[]) {
          if (typeof sub === "string") out.push(sub)
        }
      }
      // Grouped with items_ar (skip Arabic, we only want English)
      // Object with .text
      if (typeof (item as Record<string, unknown>).text === "string") {
        out.push((item as Record<string, unknown>).text as string)
      }
    }
  }

  // Deduplicate
  return [...new Set(out)]
}

/**
 * Flatten photos array from Bayut API.
 * May be: string[], string[][], or array of {url} objects.
 */
function flattenPhotos(raw: unknown): string[] {
  const out: string[] = []
  if (!Array.isArray(raw)) return out

  for (const item of raw) {
    if (typeof item === "string") {
      out.push(item)
    } else if (Array.isArray(item)) {
      for (const sub of item) {
        if (typeof sub === "string") out.push(sub)
      }
    } else if (item && typeof item === "object" && typeof (item as Record<string, unknown>).url === "string") {
      out.push((item as Record<string, unknown>).url as string)
    }
  }

  return out
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

    const p = await response.json()

    // ---------- Size ----------
    // Bayut API area.unit can be "sqft" or "sqm". Convert to sqft when needed.
    const rawBuiltUp = p.area?.built_up ?? null
    const areaUnit = (p.area?.unit || "sqft").toLowerCase()
    let sizeSqft: number | null = null
    if (typeof rawBuiltUp === "number" && rawBuiltUp > 0) {
      sizeSqft = areaUnit === "sqm" ? Math.round(rawBuiltUp * 10.764) : Math.round(rawBuiltUp)
    }

    const rawPlot = p.area?.plot ?? null
    let plotSizeSqft: number | null = null
    if (typeof rawPlot === "number" && rawPlot > 0) {
      plotSizeSqft = areaUnit === "sqm" ? Math.round(rawPlot * 10.764) : Math.round(rawPlot)
    }

    const pricePerSqft =
      sizeSqft && sizeSqft > 0 && p.price ? Math.round(p.price / sizeSqft) : null

    // ---------- Amenities ----------
    const amenityList = flattenAmenities(p.amenities)

    // Also merge keywords (e.g. ["parking", "private pool"])
    if (Array.isArray(p.keywords)) {
      for (const kw of p.keywords) {
        if (typeof kw === "string" && !amenityList.some((a) => a.toLowerCase() === kw.toLowerCase())) {
          amenityList.push(kw)
        }
      }
    }

    // ---------- Parking ----------
    // building_info.total_parking_space is the BUILDING total (e.g. 478),
    // not the individual unit's parking. Unit parking is inferred from amenities/keywords.
    const totalParkingFromBuilding = p.building_info?.total_parking_space ?? null
    const unitHasParking = amenityList.some((a) => a.toLowerCase().includes("parking"))
      || (Array.isArray(p.keywords) && p.keywords.some((k: string) => typeof k === "string" && k.toLowerCase().includes("parking")))
    const unitParking = unitHasParking ? 1 : null

    // ---------- Photos ----------
    const coverPhoto = p.media?.cover_photo || null
    const photos = flattenPhotos(p.media?.photos)
    // Ensure cover photo is first
    const allImages: string[] = []
    if (coverPhoto && !photos.includes(coverPhoto)) {
      allImages.push(coverPhoto)
    }
    allImages.push(...photos)
    // Limit to 15 images
    const finalImages = allImages.slice(0, 15)

    // ---------- Floor plans ----------
    const floorPlanImages: string[] = []
    if (p.floor_plan) {
      if (Array.isArray(p.floor_plan["2d_images"])) {
        floorPlanImages.push(...p.floor_plan["2d_images"])
      }
      if (Array.isArray(p.floor_plan["3d_images"])) {
        floorPlanImages.push(...p.floor_plan["3d_images"])
      }
    }

    // ---------- Completion ----------
    const completionStatus = normaliseCompletionStatus(
      p.details?.completion_status || p.project?.completion_status
    )

    // ---------- Handover date ----------
    const handoverRaw =
      p.details?.completion_details?.completion_date ||
      p.project?.completion_details?.completion_date ||
      null
    const handoverDate = handoverRaw ? String(handoverRaw).split("T")[0].split(" ")[0] : null

    // ---------- Payment plan ----------
    let paymentPlan: ExtractedProperty["paymentPlan"] = null
    if (Array.isArray(p.payment_plans) && p.payment_plans.length > 0) {
      const pp = p.payment_plans[0]
      paymentPlan = {
        downPaymentPercent: pp.down_payment_percent ?? pp.down_payment?.percent ?? null,
        preHandoverPercent: pp.pre_handover_percent ?? null,
        handoverPercent: pp.handover_percent ?? pp.handover?.percent ?? null,
        postHandoverPercent: pp.post_handover_percent ?? null,
      }
      // Also handle array-based pre_handover
      if (paymentPlan.preHandoverPercent == null && Array.isArray(pp.pre_handover)) {
        paymentPlan.preHandoverPercent = pp.pre_handover.reduce(
          (sum: number, p: { percent?: number }) => sum + (p.percent || 0),
          0
        )
      }
      if (paymentPlan.postHandoverPercent == null && Array.isArray(pp.post_handover)) {
        paymentPlan.postHandoverPercent = pp.post_handover.reduce(
          (sum: number, p: { percent?: number }) => sum + (p.percent || 0),
          0
        )
      }
    }

    // ---------- Purpose ----------
    const purposeRaw = (p.purpose || "").toLowerCase()
    const purpose: ExtractedProperty["purpose"] = purposeRaw.includes("rent")
      ? "for-rent"
      : purposeRaw.includes("sale")
        ? "for-sale"
        : null

    // ---------- Address / Building name ----------
    const buildingName =
      p.building_info?.name ||
      p.location?.cluster?.name ||
      null

    const address = buildingName
      ? `${buildingName}, ${p.location?.sub_community?.name || p.location?.community?.name || ""}`
      : p.location?.sub_community?.name
        ? `${p.location.sub_community.name}, ${p.location?.community?.name || ""}`
        : null

    console.log(
      `[Bayut API] Extracted: ${p.title || propertyId} — AED ${p.price?.toLocaleString()} — ${p.location?.community?.name} — ${sizeSqft} sqft — ${amenityList.length} amenities — ${finalImages.length} photos`
    )

    return {
      source: "bayut",
      listingId: p.id?.toString() || propertyId,
      title: p.title || "Untitled Property",
      price: p.price || 0,
      pricePerSqft,
      size: sizeSqft,
      bedrooms: p.details?.bedrooms ?? 0,
      bathrooms: p.details?.bathrooms ?? 0,
      propertyType: p.type?.sub || p.type?.main || "Apartment",
      area: p.location?.community?.name || p.location?.city?.name || "Dubai",
      subArea: p.location?.sub_community?.name || null,
      address,
      furnished: p.details?.is_furnished || false,
      parking: unitParking,
      amenities: amenityList,
      description: p.description || null,
      images: finalImages,
      agentName: p.agent?.name || null,
      agencyName: p.agency?.name || null,
      listingUrl: p.meta?.url || "",
      listedDate: p.meta?.created_at?.split("T")[0]?.split(" ")[0] || null,
      coordinates: p.location?.coordinates || null,

      // Extended fields
      completionStatus,
      developer: p.project?.developer?.name || null,
      handoverDate,
      serviceCharge: null, // Not returned by this API endpoint
      rentalPotential: null,
      referenceNumber: p.reference_number || null,
      permitNumber: p.legal?.permit_number || null,
      purpose,
      buildingName,
      buildingFloors: p.building_info?.floors ?? null,
      totalParkingSpaces: typeof totalParkingFromBuilding === "number" ? totalParkingFromBuilding : null,
      elevators: p.building_info?.elevators ?? null,
      floorPlanImages: floorPlanImages.length > 0 ? floorPlanImages : undefined,
      paymentPlan,
      verified: p.verification?.is_verified ?? false,
      verifiedDate: p.verification?.verified_at?.split("T")[0]?.split(" ")[0] || null,
      plotSize: plotSizeSqft,
      coverImageUrl: coverPhoto,
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

Extract property information from the given listing content. The content may be messy HTML or text, but contains the property details.

Return ONLY a valid JSON object with these exact fields:
{
  "title": "string - the property headline/title",
  "price": number - price in AED (just the number, no commas or currency),
  "size": number or null - built-up area size in sqft (if in sqm, multiply by 10.764),
  "plotSize": number or null - plot size in sqft (for villas/townhouses),
  "bedrooms": number (0 for studio),
  "bathrooms": number,
  "propertyType": "Apartment" | "Villa" | "Penthouse" | "Townhouse" | "Studio" | "Duplex",
  "area": "string - main area/community (e.g., Palm Jumeirah, Dubai Marina)",
  "subArea": "string or null - building or sub-community name",
  "buildingName": "string or null - the specific building/tower name",
  "address": "string or null - full address if available",
  "furnished": boolean,
  "parking": number or null - number of parking spaces,
  "amenities": ["array of amenity strings like Pool, Gym, Parking, Balcony, Sea View, etc."],
  "description": "string - property description (max 500 chars)",
  "agentName": "string or null",
  "agencyName": "string or null",
  "developer": "string or null - the developer company name",
  "completionStatus": "ready" | "off_plan" | "under_construction" | null,
  "handoverDate": "string or null - expected completion/handover date (YYYY-MM-DD if possible)",
  "serviceCharge": number or null (AED per sqft per year),
  "averageRent": number or null (annual rent estimate in AED),
  "referenceNumber": "string or null - the listing reference number",
  "permitNumber": "string or null - RERA/DLD permit number",
  "purpose": "for-sale" | "for-rent" | null,
  "buildingFloors": number or null - total floors in the building,
  "verified": boolean or null - whether the listing is verified,
  "paymentPlan": { "downPaymentPercent": number, "preHandoverPercent": number, "handoverPercent": number, "postHandoverPercent": number } or null
}

IMPORTANT RULES:
1. For price, look for the main listing price (usually the largest AED amount near the title)
2. Common Dubai areas: Palm Jumeirah, Dubai Marina, Downtown Dubai, Business Bay, JVC, JBR, Dubai Hills, DIFC, Bluewaters, Arabian Ranches
3. Service charge is usually in format "AED X.XX / sqft"
4. Look for "Built-up Area" for the actual size. "Plot" is the land area, separate from built-up.
5. If bedrooms is not found, check for patterns like "3 Bedroom" or "3BR"
6. Look for developer info (e.g., Emaar, Damac, Nakheel, Meraas, Sobha, etc.)
7. Check for completion status: "Ready", "Off-Plan", "Under Construction"
8. Look for payment plan details: "20/80", "60/40", down payment %, installments
9. Look for RERA permit number or DLD reference
10. DO NOT make up data - use null if information is not found`

  try {
    // Use streaming to avoid SDK timeout for long-running Opus requests
    const stream = anthropic.messages.stream({
      model: process.env.ANTHROPIC_MODEL || "claude-opus-4-20250514",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `Extract property data from this ${getPortalDisplayName(source)} listing. Return ONLY the JSON object, no explanations:\n\n${cleanContent}`
        }
      ],
      system: systemPrompt,
    })

    const response = await stream.finalMessage()

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
    const parkingCount = typeof aiData.parking === "number"
      ? aiData.parking
      : aiData.amenities?.some((a: string) => a.toLowerCase().includes("parking"))
        ? 1
        : null

    const size = typeof aiData.size === "number" && aiData.size > 0 ? aiData.size : null
    const pricePerSqft = size && aiData.price ? Math.round(aiData.price / size) : null

    const completionRaw = (aiData.completionStatus || "").toLowerCase()
    const completionStatus: ExtractedProperty["completionStatus"] = completionRaw.includes("under")
      ? "under_construction"
      : completionRaw.includes("off")
        ? "off_plan"
        : completionRaw === "ready"
          ? "ready"
          : "unknown"

    const purposeRaw = (aiData.purpose || "").toLowerCase()
    const purpose: ExtractedProperty["purpose"] = purposeRaw.includes("rent")
      ? "for-rent"
      : purposeRaw.includes("sale")
        ? "for-sale"
        : null

    const property: ExtractedProperty = {
      source,
      listingId: propertyId,
      title: aiData.title || "Property Listing",
      price: aiData.price || 0,
      pricePerSqft,
      size,
      bedrooms: aiData.bedrooms ?? 0,
      bathrooms: aiData.bathrooms ?? 0,
      propertyType: aiData.propertyType || "Apartment",
      area: aiData.area || "Dubai",
      subArea: aiData.subArea || null,
      address: aiData.address || null,
      furnished: aiData.furnished ?? false,
      parking: parkingCount,
      amenities: aiData.amenities || [],
      description: aiData.description || null,
      images: [],
      agentName: aiData.agentName || null,
      agencyName: aiData.agencyName || null,
      listingUrl: url,
      listedDate: null,
      coordinates: null,
      completionStatus,
      developer: aiData.developer || null,
      handoverDate: aiData.handoverDate || null,
      serviceCharge: aiData.serviceCharge || null,
      rentalPotential: aiData.averageRent || null,
      referenceNumber: aiData.referenceNumber || null,
      permitNumber: aiData.permitNumber || null,
      purpose,
      buildingName: aiData.buildingName || null,
      buildingFloors: typeof aiData.buildingFloors === "number" ? aiData.buildingFloors : null,
      totalParkingSpaces: typeof aiData.parking === "number" ? aiData.parking : null,
      verified: typeof aiData.verified === "boolean" ? aiData.verified : null,
      plotSize: typeof aiData.plotSize === "number" && aiData.plotSize > 0 ? aiData.plotSize : null,
      paymentPlan: aiData.paymentPlan || null,
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

// ─── Image mirroring to Supabase Storage ─────────────────────────────
const STORAGE_BUCKET = "listings"
const IMAGE_MIRROR_TIMEOUT = 8_000

/**
 * Download a single image and upload it to Supabase Storage.
 * Returns the public URL on success, or null on failure.
 */
async function mirrorImageToStorage(
  imageUrl: string,
  storagePath: string,
): Promise<string | null> {
  // Skip if already a Supabase Storage URL or data URI
  if (imageUrl.startsWith("data:")) return imageUrl
  if (imageUrl.includes("supabase.co/storage")) return imageUrl

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    console.warn("[mirror-images] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    return null
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), IMAGE_MIRROR_TIMEOUT)

    // Determine referer from image URL for CDN access
    let referer: string
    try {
      referer = new URL(imageUrl).origin
    } catch {
      referer = "https://www.bayut.com"
    }

    const res = await fetch(imageUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "image/jpeg,image/png,image/gif,image/*,*/*;q=0.8",
        Referer: referer,
      },
    })
    clearTimeout(timer)

    if (!res.ok) {
      console.warn(`[mirror-images] HTTP ${res.status} for ${imageUrl.slice(0, 80)}`)
      return null
    }

    const buffer = await res.arrayBuffer()
    if (buffer.byteLength < 100) return null // too small to be a real image

    // Determine content type
    let contentType = res.headers.get("content-type")?.split(";")[0]?.trim()
    if (!contentType || contentType === "application/octet-stream") {
      if (imageUrl.includes(".png")) contentType = "image/png"
      else if (imageUrl.includes(".gif")) contentType = "image/gif"
      else contentType = "image/jpeg"
    }

    // Determine extension
    const ext = contentType === "image/png" ? ".png" : contentType === "image/gif" ? ".gif" : ".jpg"
    const finalPath = storagePath.endsWith(ext) ? storagePath : `${storagePath}${ext}`

    const supabase = createClient(supabaseUrl, serviceKey)
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(finalPath, Buffer.from(buffer), {
        contentType,
        upsert: true,
      })

    if (error) {
      console.warn(`[mirror-images] Upload failed for ${finalPath}: ${error.message}`)
      return null
    }

    const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(finalPath)
    console.log(`[mirror-images] OK: ${finalPath} (${(buffer.byteLength / 1024).toFixed(0)} KB)`)
    return urlData.publicUrl
  } catch (err) {
    console.warn(`[mirror-images] Failed: ${imageUrl.slice(0, 80)}: ${err}`)
    return null
  }
}

/**
 * Mirror all images from a property to Supabase Storage.
 * Returns a new ExtractedProperty with updated image URLs.
 * Original URLs are kept as fallback if mirroring fails.
 */
async function mirrorPropertyImages(
  property: ExtractedProperty,
): Promise<ExtractedProperty> {
  const listingId = property.listingId || `unknown-${Date.now()}`
  const basePath = `intake/${listingId}`

  // Mirror all images in parallel
  const imagePromises = property.images.map(async (url, idx) => {
    const path = `${basePath}/img-${String(idx).padStart(2, "0")}`
    const mirroredUrl = await mirrorImageToStorage(url, path)
    return mirroredUrl ?? url // keep original as fallback
  })

  // Mirror cover image
  const coverPromise = property.coverImageUrl
    ? mirrorImageToStorage(property.coverImageUrl, `${basePath}/cover`).then(
        (r) => r ?? property.coverImageUrl,
      )
    : Promise.resolve(property.coverImageUrl)

  // Mirror floor plan images
  const floorPlanPromises = (property.floorPlanImages || []).map(
    async (url, idx) => {
      const path = `${basePath}/floorplan-${idx}`
      const mirroredUrl = await mirrorImageToStorage(url, path)
      return mirroredUrl ?? url
    },
  )

  const [images, coverImageUrl, ...floorPlanResults] = await Promise.all([
    Promise.all(imagePromises),
    coverPromise,
    ...floorPlanPromises,
  ])

  const floorPlanImages =
    floorPlanResults.length > 0 ? (floorPlanResults as string[]) : property.floorPlanImages

  console.log(
    `[mirror-images] Property ${listingId}: ${images.filter((u) => u.includes("supabase")).length}/${images.length} images mirrored`,
  )

  return {
    ...property,
    images,
    coverImageUrl: coverImageUrl ?? null,
    floorPlanImages,
  }
}

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

    // Mirror images to Supabase Storage for reliable access
    // (External CDNs like Bayut S3 often block cross-origin requests)
    if (property.images.length > 0 || property.coverImageUrl || property.floorPlanImages?.length) {
      try {
        property = await mirrorPropertyImages(property)
      } catch (err) {
        console.warn("[mirror-images] Image mirroring failed (non-fatal):", err)
        // Continue with original URLs
      }
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
