import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError } from "@/lib/security/rbac"

const DEMO_PROPERTY_IMAGES: string[] = [
  // Curated Unsplash images (allowed by next.config remotePatterns)
  "https://images.unsplash.com/photo-1560184897-ae75f418493e?w=1200&h=900&fit=crop",
  "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200&h=900&fit=crop",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&h=900&fit=crop",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&h=900&fit=crop",
  "https://images.unsplash.com/photo-1449844908441-8829872d2607?w=1200&h=900&fit=crop",
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&h=900&fit=crop",
]

function pickDemoImage(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return DEMO_PROPERTY_IMAGES[hash % DEMO_PROPERTY_IMAGES.length] ?? DEMO_PROPERTY_IMAGES[0]!
}

function extractImageUrl(attachments: unknown): string | undefined {
  if (!attachments || typeof attachments !== "object") return undefined
  const a = attachments as Record<string, unknown>

  // Common patterns we might store
  if (typeof a.imageUrl === "string") return a.imageUrl
  if (typeof a.image_url === "string") return a.image_url

  const photos = a.photos
  if (Array.isArray(photos)) {
    const first = photos.find((p) => typeof p === "string") as string | undefined
    if (first) return first
  }

  const images = a.images
  if (Array.isArray(images)) {
    const first = images[0] as unknown
    if (typeof first === "string") return first
    if (first && typeof first === "object") {
      const url = (first as Record<string, unknown>).url
      if (typeof url === "string") return url
    }
  }

  return undefined
}

/**
 * GET /api/dashboard/properties
 * Returns properties for dashboard (readiness status, featured properties)
 */
export async function GET(req: Request) {
  try {
    const ctx = await requireAuthContext(req)
    if (!ctx.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = getSupabaseAdminClient()

    // Get all properties for readiness buckets
    const { data: allProperties } = await supabase
      .from("listings")
      .select("id, title, area, readiness, status, attachments")
      .eq("tenant_id", ctx.tenantId)

    // Always provide fallback images when no real media exists in the DB
    const shouldUseFallbackImages = true

    // Count by readiness status
    const readinessBuckets: Record<string, number> = {}
    allProperties?.forEach((p) => {
      const status = p.readiness || "DRAFT"
      readinessBuckets[status] = (readinessBuckets[status] || 0) + 1
    })

    // Properties needing verification
    const verificationQueue = allProperties
      ?.filter((p) => p.readiness === "NEEDS_VERIFICATION")
      .slice(0, 4)
      .map((p) => ({
        id: p.id,
        title: p.title || "Untitled Property",
        area: p.area || "",
        imageUrl:
          extractImageUrl(p.attachments) ??
          (shouldUseFallbackImages ? pickDemoImage(p.id) : null),
      })) || []

    // Featured properties (available, ready for memo)
    const featuredProperties = allProperties
      ?.filter((p) => p.status === "available" && p.readiness === "READY_FOR_MEMO")
      .slice(0, 8)
      .map((p) => ({
        id: p.id,
        title: p.title || "Untitled Property",
        area: p.area || "",
        imageUrl:
          extractImageUrl(p.attachments) ??
          (shouldUseFallbackImages ? pickDemoImage(p.id) : null),
        price: 0, // Would need to join with pricing data
      })) || []

    return NextResponse.json({
      readinessBuckets,
      verificationQueue,
      featuredProperties,
      totalProperties: allProperties?.length || 0,
    })
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[dashboard/properties] Error:", err)
    return NextResponse.json({ error: "Failed to fetch properties" }, { status: 500 })
  }
}
