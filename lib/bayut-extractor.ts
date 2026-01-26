/**
 * Bayut Property Extractor
 * Client-side extraction patterns for Bayut listings
 */

export interface BayutExtractedData {
  title: string | null
  price: number | null
  pricePerSqft: number | null
  size: number | null
  bedrooms: number | null
  bathrooms: number | null
  propertyType: string | null
  area: string | null
  subArea: string | null
  furnished: boolean
  amenities: string[]
  description: string | null
  images: string[]
  agentName: string | null
  agencyName: string | null
  developer: string | null
  yearBuilt: number | null
  serviceCharge: number | null
  permitNumber: string | null
  listingId: string | null
  averageRent: number | null
}

/**
 * Extract property data from Bayut page DOM
 * This runs in the browser context
 */
export function extractBayutDataFromPage(): BayutExtractedData {
  const data: BayutExtractedData = {
    title: null,
    price: null,
    pricePerSqft: null,
    size: null,
    bedrooms: null,
    bathrooms: null,
    propertyType: null,
    area: null,
    subArea: null,
    furnished: false,
    amenities: [],
    description: null,
    images: [],
    agentName: null,
    agencyName: null,
    developer: null,
    yearBuilt: null,
    serviceCharge: null,
    permitNumber: null,
    listingId: null,
    averageRent: null,
  }

  try {
    // Title - from h1 or page title
    const h1 = document.querySelector('h1')
    if (h1) {
      data.title = h1.textContent?.trim() || null
    }

    // Price - look for price patterns
    const priceElements = document.querySelectorAll('[class*="price"], [data-testid*="price"]')
    for (const el of priceElements) {
      const text = el.textContent || ''
      const priceMatch = text.match(/AED\s*([\d,]+)/i)
      if (priceMatch && !data.price) {
        data.price = parseInt(priceMatch[1].replace(/,/g, ''), 10)
      }
    }

    // Also check aria-labels and data attributes
    const allText = document.body.innerText
    
    // Extract price from page text
    if (!data.price) {
      const priceMatch = allText.match(/AED\s*([\d,]+(?:,\d{3})*)/i)
      if (priceMatch) {
        const priceVal = parseInt(priceMatch[1].replace(/,/g, ''), 10)
        // Only accept if it looks like a property price (> 100,000)
        if (priceVal > 100000) {
          data.price = priceVal
        }
      }
    }

    // Size - look for sqft patterns
    const sizeMatch = allText.match(/([\d,]+)\s*sqft/i)
    if (sizeMatch) {
      data.size = parseInt(sizeMatch[1].replace(/,/g, ''), 10)
    }

    // Built-up area specifically
    const builtUpMatch = allText.match(/Built-up Area\s*([\d,]+)\s*sqft/i)
    if (builtUpMatch) {
      data.size = parseInt(builtUpMatch[1].replace(/,/g, ''), 10)
    }

    // Bedrooms
    const bedroomMatch = allText.match(/(\d+)\s*(?:Bed(?:room)?s?|BR)/i)
    if (bedroomMatch) {
      data.bedrooms = parseInt(bedroomMatch[1], 10)
    }

    // Bathrooms
    const bathroomMatch = allText.match(/(\d+)\s*(?:Bath(?:room)?s?)/i)
    if (bathroomMatch) {
      data.bathrooms = parseInt(bathroomMatch[1], 10)
    }

    // Property Type
    const typeMatch = allText.match(/Type\s*(\w+)/i)
    if (typeMatch) {
      data.propertyType = typeMatch[1]
    }

    // Area/Location - from breadcrumb links
    const breadcrumbs = document.querySelectorAll('nav a, [class*="breadcrumb"] a')
    const areas: string[] = []
    breadcrumbs.forEach(a => {
      const text = a.textContent?.trim()
      if (text && !text.includes('Dubai') && text.length > 2 && text.length < 50) {
        areas.push(text)
      }
    })
    if (areas.length > 0) {
      data.area = areas[areas.length - 2] || areas[0] // Second to last is usually the area
      data.subArea = areas[areas.length - 1] // Last is usually the building
    }

    // Developer
    const developerMatch = allText.match(/Developer\s+([A-Z][^\n]+?)(?=\n|Ownership|$)/i)
    if (developerMatch) {
      data.developer = developerMatch[1].trim()
    }

    // Year Built
    const yearMatch = allText.match(/Year of Completion\s*(\d{4})/i)
    if (yearMatch) {
      data.yearBuilt = parseInt(yearMatch[1], 10)
    }

    // Service Charge
    const serviceMatch = allText.match(/Service charges\s*AED\s*([\d.]+)/i)
    if (serviceMatch) {
      data.serviceCharge = parseFloat(serviceMatch[1])
    }

    // Furnished status
    data.furnished = /furnished/i.test(allText) && !/unfurnished/i.test(allText)

    // Agent name - look for heading with agent info
    const agentHeadings = document.querySelectorAll('h2, h3')
    for (const h of agentHeadings) {
      const text = h.textContent?.trim() || ''
      // Skip generic headings
      if (text && text.length > 3 && text.length < 50 && 
          !text.includes('Property') && !text.includes('Mortgage') &&
          !text.includes('Trend') && !text.includes('Features') &&
          !text.includes('Building') && !text.includes('Useful') &&
          !text.includes('Similar') && !text.includes('Recommended')) {
        // Check if next to an agent image or call button
        const parent = h.closest('section, div[class*="agent"], div[class*="broker"]')
        if (parent?.querySelector('button[class*="call"], a[href*="tel:"]')) {
          data.agentName = text
          break
        }
      }
    }

    // Agency from regulatory info
    const agencyMatch = allText.match(/Registered Agency\s+([^\n]+)/i)
    if (agencyMatch) {
      data.agencyName = agencyMatch[1].trim()
    }

    // Permit Number
    const permitMatch = allText.match(/Permit Number\s*(\d+)/i)
    if (permitMatch) {
      data.permitNumber = permitMatch[1]
    }

    // Average Rent
    const rentMatch = allText.match(/Average Rent\s*AED\s*([\d,]+)/i)
    if (rentMatch) {
      data.averageRent = parseInt(rentMatch[1].replace(/,/g, ''), 10)
    }

    // Images - get from meta tags and img elements
    const ogImage = document.querySelector('meta[property="og:image"]')
    if (ogImage) {
      const content = ogImage.getAttribute('content')
      if (content) data.images.push(content)
    }

    // Get images from gallery
    const galleryImages = document.querySelectorAll('img[src*="bayut"], img[data-src*="bayut"]')
    galleryImages.forEach(img => {
      const src = img.getAttribute('src') || img.getAttribute('data-src')
      if (src && src.includes('bayut') && !data.images.includes(src) && data.images.length < 10) {
        data.images.push(src)
      }
    })

    // Listing ID from URL
    const urlMatch = window.location.href.match(/details-(\d+)/)
    if (urlMatch) {
      data.listingId = urlMatch[1]
    }

    // Calculate price per sqft
    if (data.price && data.size && data.size > 0) {
      data.pricePerSqft = Math.round(data.price / data.size)
    }

  } catch (error) {
    console.error('Extraction error:', error)
  }

  return data
}

/**
 * Serialize the extraction function to run in browser context
 */
export const EXTRACTION_SCRIPT = `
(function() {
  ${extractBayutDataFromPage.toString()}
  return extractBayutDataFromPage();
})()
`
