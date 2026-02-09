import type { Property } from "@/lib/types"
import { isDemoMode } from "@/lib/demo-mode"

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
  // Simple deterministic hash -> stable image choice per listing
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return DEMO_PROPERTY_IMAGES[hash % DEMO_PROPERTY_IMAGES.length] ?? DEMO_PROPERTY_IMAGES[0]!
}

/**
 * Maps a database listing record (from /api/listings) to the Property UI type.
 * Fields not yet stored in the DB will be undefined.
 */
export function mapListingToProperty(listing: Record<string, unknown>): Property {
  const explicitImageUrl =
    (listing.imageUrl as string | null | undefined) ??
    (listing.image_url as string | null | undefined) ??
    undefined

  // In demo/dev, show fictional images when no image is provided (listings table has no image_url column).
  // This keeps the UI realistic without relying on real listing media.
  const shouldUseFictionalImages = isDemoMode() || process.env.NODE_ENV !== "production"
  const demoFallback = shouldUseFictionalImages
    ? pickDemoImage(((listing.id as string) ?? "demo") + "")
    : undefined

  return {
    id: (listing.id as string) ?? "",
    title: (listing.title as string) ?? "Untitled",
    address: (listing.address as string) ?? "",
    area: (listing.area as string) ?? "",
    type: (listing.type as Property["type"]) ?? "residential",
    status: (listing.status as Property["status"]) ?? "available",
    readinessStatus: (listing.readiness as Property["readinessStatus"]) ?? "DRAFT",
    price: (listing.price as number) ?? 0,
    size: (listing.size as number) ?? 0,
    bedrooms: listing.bedrooms as number | undefined,
    bathrooms: listing.bathrooms as number | undefined,
    createdAt: (listing.createdAt as string) ?? (listing.created_at as string) ?? new Date().toISOString(),
    updatedAt: listing.updatedAt as string | undefined,
    // Fields not yet in the listings table — will show as empty in UI
    listingType: listing.listingType as Property["listingType"] | undefined,
    roi: listing.roi as number | undefined,
    trustScore: listing.trustScore as number | undefined,
    imageUrl: explicitImageUrl ?? demoFallback,
    images: listing.images as Property["images"] | undefined,
    description: listing.description as string | undefined,
    features: listing.features as string[] | undefined,
    risks: listing.risks as string[] | undefined,
    source: listing.source as Property["source"] | undefined,
    ingestionHistory: listing.ingestionHistory as Property["ingestionHistory"] | undefined,
  }
}
