/**
 * Property Store
 * 
 * Property repository with database-backed storage.
 * Uses Supabase for persistence, with in-memory fallback for demo.
 * 
 * Features:
 * - CRUD operations for properties (via listings table)
 * - Association tracking (investor shortlists, memo links)
 * - Status management (readiness workflow)
 */

import type { Property, PropertyReadinessStatus, PropertyIngestionHistory } from "./types"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { listListings, getListingById, createListingDb, updateListingDb, deleteListingDb } from "@/lib/db/listings"

// In-memory store as fallback
let localProperties: Property[] = []
const propertyShortlists: Map<string, string[]> = new Map() // propertyId -> investorId[]
const propertyMemos: Map<string, string[]> = new Map() // propertyId -> memoId[]

/**
 * Map database listing row to Property type
 */
function mapListingToProperty(row: Record<string, unknown>): Property {
  return {
    id: row.id as string,
    title: (row.title as string) || "Unknown Property",
    area: (row.area as string) || "Dubai",
    type: (row.type as string) || "apartment",
    unitType: (row.type as string) || "apartment",
    price: Number(row.price ?? 0),
    size: Number(row.size ?? 0),
    bedrooms: Number(row.bedrooms ?? 0),
    bathrooms: Number(row.bathrooms ?? 0),
    status: (row.status as string) || "available",
    readinessStatus: (row.readiness as PropertyReadinessStatus) || "DRAFT",
    source: {
      type: "developer" as const,
      name: row.developer as string | undefined,
    },
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

/**
 * Initialize with seed data (for fallback/demo)
 */
export function initPropertyStore(seedProperties: Property[]) {
  localProperties = [...seedProperties]
}

/**
 * Get all properties - async version using database
 */
export async function getAllPropertiesAsync(tenantId?: string): Promise<Property[]> {
  try {
    if (!tenantId) {
      // Try to get from portal_listings if no tenant
      const supabase = getSupabaseAdminClient()
      const { data, error } = await supabase
        .from("portal_listings")
        .select("*")
        .eq("is_active", true)
        .order("scraped_at", { ascending: false })
        .limit(100)
      
      if (error || !data) {
        console.warn("[property-store] Error fetching portal listings:", error?.message)
        return localProperties
      }
      
      return data.map(row => ({
        id: row.id,
        title: `${row.property_type || "Property"} in ${row.area_name || "Dubai"}`,
        area: row.area_name || "Dubai",
        type: row.property_type?.toLowerCase() || "apartment",
        unitType: row.property_type?.toLowerCase() || "apartment",
        price: row.asking_price || 0,
        size: row.size_sqm || 0,
        bedrooms: row.bedrooms || 0,
        bathrooms: row.bathrooms || 0,
        status: "available",
        readinessStatus: "NEEDS_VERIFICATION" as PropertyReadinessStatus,
        source: {
          type: "portal" as const,
          name: row.portal,
          url: row.listing_url,
        },
        createdAt: row.scraped_at,
        updatedAt: row.scraped_at,
      }))
    }
    
    const listings = await listListings(tenantId)
    return listings.map(l => mapListingToProperty(l as unknown as Record<string, unknown>))
  } catch (err) {
    console.warn("[property-store] Error fetching properties, using local:", err)
    return localProperties
  }
}

/**
 * Get all properties - sync version (fallback)
 */
export function getAllProperties(): Property[] {
  return [...localProperties]
}

/**
 * Get property by ID - async version
 */
export async function getPropertyByIdAsync(id: string): Promise<Property | undefined> {
  try {
    // First try listings table
    const listing = await getListingById(id)
    if (listing) {
      return mapListingToProperty(listing as unknown as Record<string, unknown>)
    }
    
    // Try portal_listings table
    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase
      .from("portal_listings")
      .select("*")
      .eq("id", id)
      .maybeSingle()
    
    if (data && !error) {
      return {
        id: data.id,
        title: `${data.property_type || "Property"} in ${data.area_name || "Dubai"}`,
        area: data.area_name || "Dubai",
        type: data.property_type?.toLowerCase() || "apartment",
        unitType: data.property_type?.toLowerCase() || "apartment",
        price: data.asking_price || 0,
        size: data.size_sqm || 0,
        bedrooms: data.bedrooms || 0,
        bathrooms: data.bathrooms || 0,
        status: "available",
        readinessStatus: "NEEDS_VERIFICATION" as PropertyReadinessStatus,
        source: {
          type: "portal" as const,
          name: data.portal,
          url: data.listing_url,
        },
        createdAt: data.scraped_at,
        updatedAt: data.scraped_at,
      }
    }
    
    // Fallback to local
    return localProperties.find((p) => p.id === id)
  } catch (err) {
    console.warn("[property-store] Error fetching property:", err)
    return localProperties.find((p) => p.id === id)
  }
}

/**
 * Get property by ID - sync version
 */
export function getPropertyById(id: string): Property | undefined {
  return localProperties.find((p) => p.id === id)
}

/**
 * Create a new property - async version with DB persistence
 */
export async function createPropertyAsync(
  data: Omit<Property, "id" | "createdAt" | "updatedAt" | "readinessStatus"> & {
    readinessStatus?: PropertyReadinessStatus
    tenantId: string
  }
): Promise<Property> {
  try {
    const listing = await createListingDb({
      tenantId: data.tenantId,
      title: data.title,
      area: data.area,
      type: data.type,
      status: data.status || "available",
      price: data.price,
      size: data.size,
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      readiness: data.readinessStatus,
      developer: data.source?.name,
    })
    
    if (listing) {
      return mapListingToProperty(listing as unknown as Record<string, unknown>)
    }
  } catch (err) {
    console.warn("[property-store] Error creating property in DB:", err)
  }
  
  // Fallback to local creation
  return createProperty(data)
}

/**
 * Create a new property - sync version (local only)
 */
export function createProperty(
  data: Omit<Property, "id" | "createdAt" | "updatedAt" | "readinessStatus"> & {
    readinessStatus?: PropertyReadinessStatus
  }
): Property {
  const now = new Date().toISOString()
  const property: Property = {
    ...data,
    id: `prop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    readinessStatus: data.readinessStatus ?? "DRAFT",
    createdAt: now,
    updatedAt: now,
    ingestionHistory: [
      {
        id: `hist-${Date.now()}`,
        timestamp: now,
        action: "created",
        performedBy: data.source?.ingestedBy,
        details: `Property created via ${data.source?.intakeSource ?? "manual"} intake`,
      },
    ],
  }
  localProperties.push(property)
  return property
}

/**
 * Update property - async version
 */
export async function updatePropertyAsync(
  id: string,
  updates: Partial<Property> & { readinessStatus?: PropertyReadinessStatus }
): Promise<Property | null> {
  try {
    const listing = await updateListingDb(id, {
      title: updates.title,
      area: updates.area,
      type: updates.type,
      status: updates.status,
      price: updates.price,
      size: updates.size,
      bedrooms: updates.bedrooms,
      bathrooms: updates.bathrooms,
      readiness: updates.readinessStatus,
    })
    
    if (listing) {
      return mapListingToProperty(listing as unknown as Record<string, unknown>)
    }
  } catch (err) {
    console.warn("[property-store] Error updating property in DB:", err)
  }
  
  // Fallback to local
  return updateProperty(id, updates)
}

/**
 * Update property - sync version (local only)
 */
export function updateProperty(
  id: string,
  updates: Partial<Property> & { readinessStatus?: PropertyReadinessStatus }
): Property | null {
  const index = localProperties.findIndex((p) => p.id === id)
  if (index === -1) return null

  const existing = localProperties[index]
  const now = new Date().toISOString()

  // Track status changes
  if (updates.readinessStatus && updates.readinessStatus !== existing.readinessStatus) {
    const history: PropertyIngestionHistory = {
      id: `hist-${Date.now()}`,
      timestamp: now,
      action: "status_changed",
      performedBy: updates.source?.ingestedBy,
      details: `Status changed from ${existing.readinessStatus} to ${updates.readinessStatus}`,
    }
    updates.ingestionHistory = [...(existing.ingestionHistory ?? []), history]
  }

  const updated: Property = {
    ...existing,
    ...updates,
    updatedAt: now,
  }

  localProperties[index] = updated
  return updated
}

/**
 * Delete property - async version
 */
export async function deletePropertyAsync(id: string): Promise<boolean> {
  try {
    await deleteListingDb(id)
    return true
  } catch (err) {
    console.warn("[property-store] Error deleting property in DB:", err)
  }
  
  return deleteProperty(id)
}

/**
 * Delete property - sync version
 */
export function deleteProperty(id: string): boolean {
  const index = localProperties.findIndex((p) => p.id === id)
  if (index === -1) return false
  localProperties.splice(index, 1)
  propertyShortlists.delete(id)
  propertyMemos.delete(id)
  return true
}

/**
 * Add property to investor shortlist - async version
 */
export async function addToShortlistAsync(propertyId: string, investorId: string): Promise<void> {
  try {
    const supabase = getSupabaseAdminClient()
    
    // Check if shortlist exists for investor
    const { data: shortlist } = await supabase
      .from("shortlists")
      .select("id")
      .eq("investor_id", investorId)
      .maybeSingle()
    
    let shortlistId = shortlist?.id
    
    // Create shortlist if doesn't exist
    if (!shortlistId) {
      const { data: newShortlist } = await supabase
        .from("shortlists")
        .insert({ investor_id: investorId })
        .select("id")
        .maybeSingle()
      shortlistId = newShortlist?.id
    }
    
    if (shortlistId) {
      // Add item to shortlist
      await supabase
        .from("shortlist_items")
        .upsert({
          shortlist_id: shortlistId,
          listing_id: propertyId,
        }, { onConflict: "shortlist_id,listing_id" })
    }
  } catch (err) {
    console.warn("[property-store] Error adding to shortlist in DB:", err)
  }
  
  // Also update local
  addToShortlist(propertyId, investorId)
}

/**
 * Add property to investor shortlist - sync version
 */
export function addToShortlist(propertyId: string, investorId: string): void {
  const current = propertyShortlists.get(propertyId) ?? []
  if (!current.includes(investorId)) {
    propertyShortlists.set(propertyId, [...current, investorId])
  }
}

/**
 * Get investors who have this property in their shortlist
 */
export function getShortlistInvestors(propertyId: string): string[] {
  return propertyShortlists.get(propertyId) ?? []
}

/**
 * Link property to memo
 */
export function linkPropertyToMemo(propertyId: string, memoId: string): void {
  const current = propertyMemos.get(propertyId) ?? []
  if (!current.includes(memoId)) {
    propertyMemos.set(propertyId, [...current, memoId])
  }
}

/**
 * Get memos linked to property
 */
export function getPropertyMemos(propertyId: string): string[] {
  return propertyMemos.get(propertyId) ?? []
}

/**
 * Calculate readiness status based on property data
 */
export function calculateReadinessStatus(
  property: Partial<Property>,
  userMarkedNeedsVerification?: boolean
): PropertyReadinessStatus {
  // Required fields check
  const hasRequiredFields =
    property.title &&
    property.area &&
    property.unitType &&
    property.price &&
    property.source?.type

  if (!hasRequiredFields) {
    return "DRAFT"
  }

  // User explicitly marked as needing verification
  if (userMarkedNeedsVerification) {
    return "NEEDS_VERIFICATION"
  }

  // Portal/Other sources without strong evidence need verification
  if (
    property.source?.type === "portal" ||
    (property.source?.type === "other" && !property.source?.name)
  ) {
    return "NEEDS_VERIFICATION"
  }

  return "READY_FOR_MEMO"
}

