/**
 * Script to download property images and upload them to Supabase Storage,
 * then update listing attachments to point to stored images.
 *
 * Usage: npx tsx scripts/upload-listing-images.ts
 */
import { config } from "dotenv"
import { createClient } from "@supabase/supabase-js"
import { execSync } from "child_process"

config({ path: ".env.local" })

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const BUCKET = "listings"

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Verified accessible real estate images from Pixabay CDN
const IMAGE_POOL: Record<string, string> = {
  // Offices / Commercial
  office_1: "https://cdn.pixabay.com/photo/2016/11/29/03/53/architecture-1867187_1280.jpg",
  office_2: "https://cdn.pixabay.com/photo/2016/01/31/14/32/architecture-1171462_1280.jpg",
  office_3: "https://cdn.pixabay.com/photo/2016/06/24/10/47/architecture-1477041_1280.jpg",
  office_4: "https://cdn.pixabay.com/photo/2016/10/18/09/02/hotel-1749602_1280.jpg",
  // Apartments / Residential
  apartment_1: "https://cdn.pixabay.com/photo/2016/11/21/15/09/apartments-1845884_1280.jpg",
  apartment_2: "https://cdn.pixabay.com/photo/2016/12/30/07/55/bedroom-1940169_1280.jpg",
  apartment_3: "https://cdn.pixabay.com/photo/2015/11/06/11/45/interior-1026452_1280.jpg",
  apartment_4: "https://cdn.pixabay.com/photo/2016/10/13/09/08/travel-1737171_1280.jpg",
  // Villas
  villa_1: "https://cdn.pixabay.com/photo/2017/06/16/15/58/luxury-home-2409518_1280.jpg",
  villa_2: "https://cdn.pixabay.com/photo/2017/04/10/22/28/residence-2219972_1280.jpg",
  villa_3: "https://cdn.pixabay.com/photo/2014/07/10/17/18/large-home-389271_1280.jpg",
  villa_4: "https://cdn.pixabay.com/photo/2014/11/21/17/17/house-540796_1280.jpg",
  // Retail
  retail_1: "https://cdn.pixabay.com/photo/2017/08/07/19/45/ecommerce-2607114_1280.jpg",
  retail_2: "https://cdn.pixabay.com/photo/2015/10/20/18/57/furniture-998265_1280.jpg",
  // Land
  land_1: "https://cdn.pixabay.com/photo/2015/01/28/23/35/landscape-615429_1280.jpg",
  // Warehouse / Logistics
  warehouse_1: "https://cdn.pixabay.com/photo/2016/11/18/17/46/house-1836070_1280.jpg",
  // Penthouse / Luxury Interior
  penthouse_1: "https://cdn.pixabay.com/photo/2017/03/22/17/39/kitchen-2165756_1280.jpg",
  penthouse_2: "https://cdn.pixabay.com/photo/2014/08/03/23/41/house-409451_1280.jpg",
  // Townhouse
  townhouse_1: "https://cdn.pixabay.com/photo/2016/11/18/17/20/living-room-1835923_1280.jpg",
  townhouse_2: "https://cdn.pixabay.com/photo/2016/11/29/03/53/house-1867187_1280.jpg",
  // Mixed-use
  mixed_1: "https://cdn.pixabay.com/photo/2017/08/01/00/38/man-2562325_1280.jpg",
}

// Map listing titles to appropriate image keys
function pickImageKey(title: string): string {
  const t = title.toLowerCase()
  if (t.includes("penthouse")) return "penthouse_1"
  if (t.includes("mansion")) return "penthouse_2"
  if (t.includes("palm") && t.includes("villa")) return "villa_1"
  if (t.includes("hills") && t.includes("villa")) return "villa_2"
  if (t.includes("compound") || t.includes("jvc")) return "villa_3"
  if (t.includes("tilal") || t.includes("ranches")) return "villa_4"
  if (t.includes("villa")) return "villa_1"
  if (t.includes("townhouse")) return "townhouse_1"
  if (t.includes("warehouse") || t.includes("logistics")) return "warehouse_1"
  if (t.includes("land") || t.includes("plot")) return "land_1"
  if (t.includes("retail") && t.includes("city walk")) return "retail_2"
  if (t.includes("retail")) return "retail_1"
  if (t.includes("office") && t.includes("difc")) return "office_1"
  if (t.includes("office") && t.includes("marina")) return "office_2"
  if (t.includes("office") && t.includes("business bay")) return "office_3"
  if (t.includes("office")) return "office_4"
  if (t.includes("mixed")) return "mixed_1"
  if (t.includes("address")) return "apartment_2"
  if (t.includes("promenade") || t.includes("marina")) return "apartment_1"
  if (t.includes("downtown") || t.includes("boulevard")) return "apartment_3"
  if (t.includes("creek") || t.includes("harbour")) return "apartment_4"
  if (t.includes("jlt") || t.includes("jbr")) return "apartment_2"
  if (t.includes("residences") || t.includes("apartment")) return "apartment_1"
  return "apartment_3"
}

// Use curl to download since Node's fetch has DNS issues on this machine
function downloadWithCurl(url: string): Buffer {
  const result = execSync(`curl -sL "${url}"`, { maxBuffer: 10 * 1024 * 1024 })
  return result
}

async function uploadToStorage(path: string, data: Buffer, contentType: string): Promise<string> {
  const { error } = await supabase.storage.from(BUCKET).upload(path, data, {
    contentType,
    upsert: true,
  })
  if (error) throw new Error(`Upload failed for ${path}: ${error.message}`)

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return urlData.publicUrl
}

async function main() {
  console.log("=== Uploading listing images to Supabase Storage ===\n")

  // Fetch all listings
  const { data: listings, error } = await supabase
    .from("listings")
    .select("id, title")
    .order("id")

  if (error) throw error
  if (!listings?.length) {
    console.log("No listings found.")
    return
  }

  console.log(`Found ${listings.length} listings.\n`)

  // Track which images we've already downloaded/uploaded to avoid duplicates
  const uploadedUrls = new Map<string, string>()

  let successCount = 0
  let errorCount = 0

  for (const listing of listings) {
    const imageKey = pickImageKey(listing.title)
    const sourceUrl = IMAGE_POOL[imageKey]

    if (!sourceUrl) {
      console.log(`  SKIP: ${listing.title} — no image mapping for key "${imageKey}"`)
      continue
    }

    try {
      let storageUrl: string

      if (uploadedUrls.has(imageKey)) {
        // Already uploaded this image, reuse the URL
        storageUrl = uploadedUrls.get(imageKey)!
        console.log(`  REUSE: ${listing.title} → ${imageKey}`)
      } else {
        // Download and upload
        console.log(`  DOWNLOAD: ${listing.title} → ${imageKey}...`)
        const imageData = downloadWithCurl(sourceUrl)
        const storagePath = `images/${imageKey}.jpg`
        storageUrl = await uploadToStorage(storagePath, imageData, "image/jpeg")
        uploadedUrls.set(imageKey, storageUrl)
        console.log(`  UPLOADED: ${storagePath} (${(imageData.length / 1024).toFixed(0)} KB)`)
      }

      // Update listing attachments
      const { error: updateError } = await supabase
        .from("listings")
        .update({
          attachments: [{ type: "image/jpeg", url: storageUrl }],
        })
        .eq("id", listing.id)

      if (updateError) {
        console.error(`  DB UPDATE ERROR for ${listing.title}: ${updateError.message}`)
        errorCount++
      } else {
        console.log(`  OK: ${listing.title}`)
        successCount++
      }
    } catch (err) {
      console.error(`  ERROR for ${listing.title}: ${err}`)
      errorCount++
    }
  }

  console.log(`\n=== Done: ${successCount} updated, ${errorCount} errors ===`)
}

main().catch(console.error)
