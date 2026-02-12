import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"

const STORAGE_BUCKET = "listings"

/**
 * POST /api/property-intake/upload-brochure-images
 *
 * Accepts rendered PDF page images (JPEG blobs) via FormData and uploads
 * them to Supabase Storage. Returns an array of public URLs.
 *
 * Request: FormData with images under key "images"
 * Response: { urls: string[] }
 */
export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: "Supabase not configured for storage uploads" },
      { status: 500 },
    )
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  try {
    const formData = await req.formData()
    const images = formData.getAll("images")

    if (images.length === 0) {
      return NextResponse.json({ error: "No images provided" }, { status: 400 })
    }

    const timestamp = Date.now()
    const urls: string[] = []

    for (let i = 0; i < images.length; i++) {
      const img = images[i]
      if (!(img instanceof File || img instanceof Blob)) continue

      const ext = "jpg"
      const storagePath = `intake/brochures/${timestamp}/page-${String(i).padStart(2, "0")}.${ext}`

      const arrayBuffer = await (img as Blob).arrayBuffer()
      const buffer = new Uint8Array(arrayBuffer)

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, buffer, {
          contentType: "image/jpeg",
          upsert: true,
        })

      if (uploadError) {
        console.error(`[upload-brochure-images] Failed to upload page ${i}:`, uploadError)
        continue
      }

      const { data: publicUrlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(storagePath)

      if (publicUrlData?.publicUrl) {
        urls.push(publicUrlData.publicUrl)
      }
    }

    return NextResponse.json({ urls })
  } catch (error) {
    console.error("[upload-brochure-images] Error:", error)
    return NextResponse.json(
      { error: "Failed to upload brochure images" },
      { status: 500 },
    )
  }
}
