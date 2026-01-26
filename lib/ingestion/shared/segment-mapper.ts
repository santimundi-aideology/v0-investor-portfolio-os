/**
 * SEGMENT MAPPER
 * --------------
 * Normalizes property types and bedroom configurations to canonical segment values.
 * 
 * Segments are used for grouping properties in market analysis:
 * - Residential: Studio, 1BR, 2BR, 3BR, 4BR, 5BR+, Villa, Townhouse, Penthouse
 * - Commercial: Office, Retail, Warehouse, Hotel
 * - Land: Plot
 */

export type ResidentialSegment = 
  | 'Studio'
  | '1BR'
  | '2BR'
  | '3BR'
  | '4BR'
  | '5BR+'
  | 'Villa'
  | 'Townhouse'
  | 'Penthouse'
  | 'Apartment'

export type CommercialSegment =
  | 'Office'
  | 'Retail'
  | 'Warehouse'
  | 'Hotel'
  | 'Commercial'

export type LandSegment = 'Plot' | 'Land'

export type Segment = ResidentialSegment | CommercialSegment | LandSegment | 'Unknown'

export interface SegmentMappingResult {
  segment: Segment
  category: 'residential' | 'commercial' | 'land' | 'unknown'
  confidence: 'exact' | 'inferred' | 'unknown'
}

// Property type aliases
const PROPERTY_TYPE_ALIASES: Record<string, Segment> = {
  // Apartments by bedroom
  'studio': 'Studio',
  '0br': 'Studio',
  '0 br': 'Studio',
  '0 bedroom': 'Studio',
  'bachelor': 'Studio',
  
  '1br': '1BR',
  '1 br': '1BR',
  '1 bedroom': '1BR',
  '1bed': '1BR',
  '1 bed': '1BR',
  'one bedroom': '1BR',
  
  '2br': '2BR',
  '2 br': '2BR',
  '2 bedroom': '2BR',
  '2bed': '2BR',
  '2 bed': '2BR',
  'two bedroom': '2BR',
  
  '3br': '3BR',
  '3 br': '3BR',
  '3 bedroom': '3BR',
  '3bed': '3BR',
  '3 bed': '3BR',
  'three bedroom': '3BR',
  
  '4br': '4BR',
  '4 br': '4BR',
  '4 bedroom': '4BR',
  '4bed': '4BR',
  '4 bed': '4BR',
  'four bedroom': '4BR',
  
  '5br': '5BR+',
  '5 br': '5BR+',
  '5 bedroom': '5BR+',
  '5bed': '5BR+',
  '5 bed': '5BR+',
  'five bedroom': '5BR+',
  '6br': '5BR+',
  '6 br': '5BR+',
  '7br': '5BR+',
  '7 br': '5BR+',
  '5+ bedroom': '5BR+',
  '5+ br': '5BR+',
  
  // Property types
  'apartment': 'Apartment',
  'apt': 'Apartment',
  'flat': 'Apartment',
  
  'villa': 'Villa',
  'villas': 'Villa',
  'detached villa': 'Villa',
  'independent villa': 'Villa',
  
  'townhouse': 'Townhouse',
  'town house': 'Townhouse',
  'townhome': 'Townhouse',
  
  'penthouse': 'Penthouse',
  'pent house': 'Penthouse',
  'ph': 'Penthouse',
  
  // Commercial
  'office': 'Office',
  'office space': 'Office',
  'commercial office': 'Office',
  
  'retail': 'Retail',
  'shop': 'Retail',
  'showroom': 'Retail',
  'store': 'Retail',
  
  'warehouse': 'Warehouse',
  'industrial': 'Warehouse',
  'factory': 'Warehouse',
  'storage': 'Warehouse',
  
  'hotel': 'Hotel',
  'hotel apartment': 'Hotel',
  'serviced apartment': 'Hotel',
  
  'commercial': 'Commercial',
  
  // Land
  'plot': 'Plot',
  'land': 'Land',
  'residential plot': 'Plot',
  'commercial plot': 'Plot',
}

const SEGMENT_CATEGORIES: Record<Segment, 'residential' | 'commercial' | 'land' | 'unknown'> = {
  'Studio': 'residential',
  '1BR': 'residential',
  '2BR': 'residential',
  '3BR': 'residential',
  '4BR': 'residential',
  '5BR+': 'residential',
  'Villa': 'residential',
  'Townhouse': 'residential',
  'Penthouse': 'residential',
  'Apartment': 'residential',
  'Office': 'commercial',
  'Retail': 'commercial',
  'Warehouse': 'commercial',
  'Hotel': 'commercial',
  'Commercial': 'commercial',
  'Plot': 'land',
  'Land': 'land',
  'Unknown': 'unknown',
}

/**
 * Normalize text for matching
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[,.-]/g, '')
}

/**
 * Map property type string to canonical segment
 */
export function mapPropertyTypeToSegment(propertyType: string): SegmentMappingResult {
  if (!propertyType?.trim()) {
    return {
      segment: 'Unknown',
      category: 'unknown',
      confidence: 'unknown',
    }
  }
  
  const normalized = normalizeText(propertyType)
  
  // Direct alias match
  const directMatch = PROPERTY_TYPE_ALIASES[normalized]
  if (directMatch) {
    return {
      segment: directMatch,
      category: SEGMENT_CATEGORIES[directMatch],
      confidence: 'exact',
    }
  }
  
  // Check if any alias is contained in the input
  for (const [alias, segment] of Object.entries(PROPERTY_TYPE_ALIASES)) {
    if (normalized.includes(alias)) {
      return {
        segment,
        category: SEGMENT_CATEGORIES[segment],
        confidence: 'inferred',
      }
    }
  }
  
  // No match
  return {
    segment: 'Unknown',
    category: 'unknown',
    confidence: 'unknown',
  }
}

/**
 * Map bedroom count to segment
 */
export function mapBedroomsToSegment(bedrooms: number | null | undefined): SegmentMappingResult {
  if (bedrooms === null || bedrooms === undefined) {
    return {
      segment: 'Unknown',
      category: 'unknown',
      confidence: 'unknown',
    }
  }
  
  let segment: Segment
  
  if (bedrooms === 0) {
    segment = 'Studio'
  } else if (bedrooms === 1) {
    segment = '1BR'
  } else if (bedrooms === 2) {
    segment = '2BR'
  } else if (bedrooms === 3) {
    segment = '3BR'
  } else if (bedrooms === 4) {
    segment = '4BR'
  } else {
    segment = '5BR+'
  }
  
  return {
    segment,
    category: 'residential',
    confidence: 'exact',
  }
}

/**
 * Smart segment mapping combining property type and bedrooms
 * Priority: Explicit bedroom count > Property type with BR > Generic property type
 */
export function mapToSegment(params: {
  propertyType?: string
  bedrooms?: number | null
}): SegmentMappingResult {
  const { propertyType, bedrooms } = params
  
  // If we have bedroom count, use it for residential
  if (bedrooms !== null && bedrooms !== undefined && bedrooms >= 0) {
    const bedroomResult = mapBedroomsToSegment(bedrooms)
    
    // Check if property type indicates something special (Villa, Penthouse, etc.)
    if (propertyType) {
      const typeResult = mapPropertyTypeToSegment(propertyType)
      
      // Override with special property types
      if (['Villa', 'Townhouse', 'Penthouse'].includes(typeResult.segment)) {
        return typeResult
      }
      
      // For commercial/land, use property type
      if (typeResult.category !== 'residential' && typeResult.category !== 'unknown') {
        return typeResult
      }
    }
    
    return bedroomResult
  }
  
  // Fall back to property type
  if (propertyType) {
    return mapPropertyTypeToSegment(propertyType)
  }
  
  return {
    segment: 'Unknown',
    category: 'unknown',
    confidence: 'unknown',
  }
}

/**
 * Get all valid segments
 */
export function getAllSegments(): Segment[] {
  return Object.keys(SEGMENT_CATEGORIES) as Segment[]
}

/**
 * Get segments by category
 */
export function getSegmentsByCategory(category: 'residential' | 'commercial' | 'land'): Segment[] {
  return (Object.entries(SEGMENT_CATEGORIES) as [Segment, string][])
    .filter(([_, cat]) => cat === category)
    .map(([segment]) => segment)
}

/**
 * Check if a segment is valid
 */
export function isValidSegment(segment: string): segment is Segment {
  return segment in SEGMENT_CATEGORIES
}
