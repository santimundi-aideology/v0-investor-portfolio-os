/**
 * Mock Property Store
 * 
 * In-memory property repository for demo purposes.
 * In production, this would be replaced with database calls.
 * 
 * Features:
 * - CRUD operations for properties
 * - Association tracking (investor shortlists, memo links)
 * - Status management (readiness workflow)
 * 
 * Future extensions:
 * - Portal link ingestion (parse listing URLs)
 * - Real extraction service integration
 * - Deduplication logic
 * - Trust scoring rails
 */

import type { Property, PropertyReadinessStatus, PropertyIngestionHistory } from "./types"

// In-memory store
let properties: Property[] = []
const propertyShortlists: Map<string, string[]> = new Map() // propertyId -> investorId[]
const propertyMemos: Map<string, string[]> = new Map() // propertyId -> memoId[]

/**
 * Initialize with seed data
 */
export function initPropertyStore(seedProperties: Property[]) {
  properties = [...seedProperties]
}

/**
 * Get all properties
 */
export function getAllProperties(): Property[] {
  return [...properties]
}

/**
 * Get property by ID
 */
export function getPropertyById(id: string): Property | undefined {
  return properties.find((p) => p.id === id)
}

/**
 * Create a new property
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
  properties.push(property)
  return property
}

/**
 * Update property
 */
export function updateProperty(
  id: string,
  updates: Partial<Property> & { readinessStatus?: PropertyReadinessStatus }
): Property | null {
  const index = properties.findIndex((p) => p.id === id)
  if (index === -1) return null

  const existing = properties[index]
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

  properties[index] = updated
  return updated
}

/**
 * Delete property
 */
export function deleteProperty(id: string): boolean {
  const index = properties.findIndex((p) => p.id === id)
  if (index === -1) return false
  properties.splice(index, 1)
  propertyShortlists.delete(id)
  propertyMemos.delete(id)
  return true
}

/**
 * Add property to investor shortlist
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

