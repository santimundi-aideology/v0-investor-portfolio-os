import type { Property } from "@/lib/types"

/**
 * Maps a database listing record (from /api/listings) to the Property UI type.
 * Fields not yet stored in the DB will be undefined.
 */
export function mapListingToProperty(listing: Record<string, unknown>): Property {
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
    imageUrl: listing.imageUrl as string | undefined,
    images: listing.images as Property["images"] | undefined,
    description: listing.description as string | undefined,
    features: listing.features as string[] | undefined,
    risks: listing.risks as string[] | undefined,
    source: listing.source as Property["source"] | undefined,
    ingestionHistory: listing.ingestionHistory as Property["ingestionHistory"] | undefined,
  }
}
