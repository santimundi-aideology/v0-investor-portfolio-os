import "server-only"

import { getSupabaseAdminClient } from "@/lib/db/client"

/**
 * GEO MAPPER
 * ----------
 * Normalizes area names from different sources (DLD, Ejari, Bayut, PropertyFinder)
 * to canonical geo_id values.
 *
 * Uses the geo_reference table for lookups, with in-memory caching for performance.
 */

export interface GeoReference {
  id: string                    // Canonical ID: 'dubai-marina'
  geoType: 'city' | 'district' | 'community' | 'sub-community'
  canonicalName: string         // 'Dubai Marina'
  parentId: string | null
  aliases: string[]             // ['Marina', 'DUBAI MARINA', etc.]
  dldAreaCode: string | null
  dldAreaName: string | null
  bayutLocationId: string | null
  propertyfinderLocationId: string | null
}

export interface GeoMappingResult {
  geoId: string
  geoName: string
  geoType: string
  confidence: 'exact' | 'alias' | 'fuzzy' | 'unknown'
}

// In-memory cache for geo references (loaded once per process)
let geoCache: Map<string, GeoReference> | null = null
let aliasIndex: Map<string, string> | null = null // alias -> geoId
let lastCacheUpdate: number = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Load geo reference data from database into cache
 */
async function loadGeoCache(): Promise<void> {
  const supabase = getSupabaseAdminClient()
  
  const { data, error } = await supabase
    .from("geo_reference")
    .select("*")
    .eq("is_active", true)
  
  if (error) {
    console.error("[geo-mapper] Failed to load geo_reference:", error)
    throw error
  }
  
  geoCache = new Map()
  aliasIndex = new Map()
  
  for (const row of (data ?? []) as Array<Record<string, unknown>>) {
    const ref: GeoReference = {
      id: row.id as string,
      geoType: row.geo_type as GeoReference['geoType'],
      canonicalName: row.canonical_name as string,
      parentId: row.parent_id as string | null,
      aliases: (row.aliases as string[]) ?? [],
      dldAreaCode: row.dld_area_code as string | null,
      dldAreaName: row.dld_area_name as string | null,
      bayutLocationId: row.bayut_location_id as string | null,
      propertyfinderLocationId: row.propertyfinder_location_id as string | null,
    }
    
    geoCache.set(ref.id, ref)
    
    // Index all aliases (case-insensitive)
    for (const alias of ref.aliases) {
      aliasIndex.set(alias.toLowerCase().trim(), ref.id)
    }
    
    // Also index by canonical name
    aliasIndex.set(ref.canonicalName.toLowerCase().trim(), ref.id)
    
    // Index by DLD area name if present
    if (ref.dldAreaName) {
      aliasIndex.set(ref.dldAreaName.toLowerCase().trim(), ref.id)
    }
  }
  
  lastCacheUpdate = Date.now()
  console.log(`[geo-mapper] Loaded ${geoCache.size} geo references with ${aliasIndex.size} aliases`)
}

/**
 * Ensure cache is loaded and fresh
 */
async function ensureCache(): Promise<void> {
  const now = Date.now()
  if (!geoCache || !aliasIndex || (now - lastCacheUpdate) > CACHE_TTL_MS) {
    await loadGeoCache()
  }
}

/**
 * Normalize text for matching (lowercase, trim, remove extra spaces)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[,.-]/g, '')
}

/**
 * Calculate simple Levenshtein distance for fuzzy matching
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []
  
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      )
    }
  }
  
  return matrix[a.length][b.length]
}

/**
 * Map an area name to canonical geo_id
 */
export async function mapAreaToGeo(areaName: string): Promise<GeoMappingResult> {
  await ensureCache()
  
  if (!areaName?.trim()) {
    return {
      geoId: 'unknown',
      geoName: 'Unknown',
      geoType: 'community',
      confidence: 'unknown',
    }
  }
  
  const normalized = normalizeText(areaName)
  
  // 1. Exact match on alias index
  const exactMatch = aliasIndex!.get(normalized)
  if (exactMatch && geoCache!.has(exactMatch)) {
    const ref = geoCache!.get(exactMatch)!
    return {
      geoId: ref.id,
      geoName: ref.canonicalName,
      geoType: ref.geoType,
      confidence: 'exact',
    }
  }
  
  // 2. Check if input contains any known alias
  for (const [alias, geoId] of aliasIndex!.entries()) {
    if (normalized.includes(alias) || alias.includes(normalized)) {
      const ref = geoCache!.get(geoId)!
      return {
        geoId: ref.id,
        geoName: ref.canonicalName,
        geoType: ref.geoType,
        confidence: 'alias',
      }
    }
  }
  
  // 3. Fuzzy match (find closest with distance <= 3)
  let bestMatch: { geoId: string; distance: number } | null = null
  
  for (const [alias, geoId] of aliasIndex!.entries()) {
    const distance = levenshteinDistance(normalized, alias)
    // Allow up to 3 character difference, or 20% of string length
    const threshold = Math.max(3, Math.floor(normalized.length * 0.2))
    
    if (distance <= threshold) {
      if (!bestMatch || distance < bestMatch.distance) {
        bestMatch = { geoId, distance }
      }
    }
  }
  
  if (bestMatch && geoCache!.has(bestMatch.geoId)) {
    const ref = geoCache!.get(bestMatch.geoId)!
    return {
      geoId: ref.id,
      geoName: ref.canonicalName,
      geoType: ref.geoType,
      confidence: 'fuzzy',
    }
  }
  
  // 4. No match found - return unknown with the original name
  return {
    geoId: normalizeToSlug(areaName),
    geoName: areaName.trim(),
    geoType: 'community',
    confidence: 'unknown',
  }
}

/**
 * Convert area name to URL-friendly slug
 */
function normalizeToSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Map multiple area names in batch (more efficient)
 */
export async function mapAreasToGeo(areaNames: string[]): Promise<Map<string, GeoMappingResult>> {
  await ensureCache()
  
  const results = new Map<string, GeoMappingResult>()
  
  for (const areaName of areaNames) {
    results.set(areaName, await mapAreaToGeo(areaName))
  }
  
  return results
}

/**
 * Get all known geo references (for display/selection)
 */
export async function getAllGeoReferences(): Promise<GeoReference[]> {
  await ensureCache()
  return Array.from(geoCache!.values())
}

/**
 * Get geo reference by ID
 */
export async function getGeoReferenceById(geoId: string): Promise<GeoReference | null> {
  await ensureCache()
  return geoCache!.get(geoId) ?? null
}

/**
 * Add a new geo reference (for admin/setup use)
 */
export async function addGeoReference(ref: {
  id: string
  canonicalName: string
  geoType: GeoReference['geoType']
  parentId?: string
  aliases?: string[]
  dldAreaName?: string
}): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseAdminClient()
  
  const { error } = await supabase
    .from("geo_reference")
    .upsert({
      id: ref.id,
      canonical_name: ref.canonicalName,
      geo_type: ref.geoType,
      parent_id: ref.parentId ?? null,
      aliases: ref.aliases ?? [ref.canonicalName],
      dld_area_name: ref.dldAreaName ?? null,
      is_active: true,
    }, { onConflict: "id" })
  
  if (error) {
    return { success: false, error: error.message }
  }
  
  // Invalidate cache
  geoCache = null
  aliasIndex = null
  
  return { success: true }
}

/**
 * Force cache refresh
 */
export async function refreshGeoCache(): Promise<void> {
  await loadGeoCache()
}
