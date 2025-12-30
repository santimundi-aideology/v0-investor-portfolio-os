import { getSupabaseAdminClient } from "@/lib/db/client"

export type PropertyHolding = {
  id: string
  tenantId: string
  investorId: string
  listingId: string
  purchasePrice: number
  purchaseDate: string
  currentValue: number
  monthlyRent: number
  occupancyRate: number
  annualExpenses: number
  createdAt: string
  updatedAt: string
}

export type PortfolioSummary = {
  investorId: string
  totalValue: number
  totalPurchaseCost: number
  totalMonthlyRental: number
  totalAnnualRental: number
  avgYieldPct: number
  avgOccupancyPct: number
  appreciationPct: number
  propertyCount: number
}

/**
 * Map database row to PropertyHolding
 */
function mapHoldingRow(row: Record<string, unknown>): PropertyHolding {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    investorId: row.investor_id as string,
    listingId: row.listing_id as string,
    purchasePrice: Number(row.purchase_price ?? 0),
    purchaseDate: row.purchase_date as string,
    currentValue: Number(row.current_value ?? 0),
    monthlyRent: Number(row.monthly_rent ?? 0),
    occupancyRate: Number(row.occupancy_rate ?? 1),
    annualExpenses: Number(row.annual_expenses ?? 0),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

/**
 * Get all holdings for an investor
 */
export async function getHoldingsByInvestor(investorId: string): Promise<PropertyHolding[]> {
  const supabase = getSupabaseAdminClient()
  
  // Note: This assumes a "holdings" table exists
  // If not, you may need to create it via migration
  try {
    const { data, error } = await supabase
      .from("holdings")
      .select("*")
      .eq("investor_id", investorId)
      .order("purchase_date", { ascending: false })

    if (error) {
      console.warn("[holdings] Table may not exist yet:", error.message)
      return []
    }
    
    return (data ?? []).map(mapHoldingRow)
  } catch (err) {
    console.warn("[holdings] Error fetching holdings:", err)
    return []
  }
}

/**
 * Get all holdings for a tenant
 */
export async function getHoldingsByTenant(tenantId: string): Promise<PropertyHolding[]> {
  const supabase = getSupabaseAdminClient()
  
  try {
    const { data, error } = await supabase
      .from("holdings")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("purchase_date", { ascending: false })

    if (error) {
      console.warn("[holdings] Table may not exist yet:", error.message)
      return []
    }
    
    return (data ?? []).map(mapHoldingRow)
  } catch (err) {
    console.warn("[holdings] Error fetching holdings:", err)
    return []
  }
}

/**
 * Calculate portfolio analytics for an investor
 */
export async function getPortfolioSummary(investorId: string): Promise<PortfolioSummary> {
  const holdings = await getHoldingsByInvestor(investorId)
  
  if (holdings.length === 0) {
    return {
      investorId,
      totalValue: 0,
      totalPurchaseCost: 0,
      totalMonthlyRental: 0,
      totalAnnualRental: 0,
      avgYieldPct: 0,
      avgOccupancyPct: 0,
      appreciationPct: 0,
      propertyCount: 0,
    }
  }

  const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0)
  const totalPurchaseCost = holdings.reduce((sum, h) => sum + h.purchasePrice, 0)
  
  // Calculate net rental income
  const monthlyRentals = holdings.map(h => {
    const grossMonthly = h.monthlyRent * h.occupancyRate
    const monthlyExpenses = h.annualExpenses / 12
    return grossMonthly - monthlyExpenses
  })
  
  const totalMonthlyRental = monthlyRentals.reduce((sum, rent) => sum + rent, 0)
  const totalAnnualRental = totalMonthlyRental * 12
  
  // Calculate average yield
  const yields = holdings.map(h => {
    const annualNetRent = (h.monthlyRent * 12 * h.occupancyRate) - h.annualExpenses
    return (annualNetRent / h.currentValue) * 100
  })
  const avgYieldPct = yields.reduce((sum, y) => sum + y, 0) / holdings.length
  
  // Average occupancy
  const avgOccupancyPct = (holdings.reduce((sum, h) => sum + h.occupancyRate, 0) / holdings.length) * 100
  
  // Appreciation
  const appreciationPct = totalPurchaseCost > 0 
    ? ((totalValue - totalPurchaseCost) / totalPurchaseCost) * 100 
    : 0

  return {
    investorId,
    totalValue,
    totalPurchaseCost,
    totalMonthlyRental,
    totalAnnualRental,
    avgYieldPct,
    avgOccupancyPct,
    appreciationPct,
    propertyCount: holdings.length,
  }
}

/**
 * Create a new holding
 */
export async function createHolding(
  input: Omit<PropertyHolding, "id" | "createdAt" | "updatedAt">
): Promise<PropertyHolding | null> {
  const supabase = getSupabaseAdminClient()
  
  const payload = {
    tenant_id: input.tenantId,
    investor_id: input.investorId,
    listing_id: input.listingId,
    purchase_price: input.purchasePrice,
    purchase_date: input.purchaseDate,
    current_value: input.currentValue,
    monthly_rent: input.monthlyRent,
    occupancy_rate: input.occupancyRate,
    annual_expenses: input.annualExpenses,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  
  try {
    const { data, error } = await supabase
      .from("holdings")
      .insert(payload)
      .select("*")
      .maybeSingle()

    if (error) {
      console.error("[holdings] Error creating holding:", error)
      return null
    }
    
    return data ? mapHoldingRow(data) : null
  } catch (err) {
    console.error("[holdings] Error creating holding:", err)
    return null
  }
}

/**
 * Update a holding
 */
export async function updateHolding(
  id: string,
  patch: Partial<Omit<PropertyHolding, "id" | "createdAt" | "updatedAt" | "tenantId" | "investorId">>
): Promise<PropertyHolding | null> {
  const supabase = getSupabaseAdminClient()
  
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  
  if (patch.listingId !== undefined) payload.listing_id = patch.listingId
  if (patch.purchasePrice !== undefined) payload.purchase_price = patch.purchasePrice
  if (patch.purchaseDate !== undefined) payload.purchase_date = patch.purchaseDate
  if (patch.currentValue !== undefined) payload.current_value = patch.currentValue
  if (patch.monthlyRent !== undefined) payload.monthly_rent = patch.monthlyRent
  if (patch.occupancyRate !== undefined) payload.occupancy_rate = patch.occupancyRate
  if (patch.annualExpenses !== undefined) payload.annual_expenses = patch.annualExpenses
  
  try {
    const { data, error } = await supabase
      .from("holdings")
      .update(payload)
      .eq("id", id)
      .select("*")
      .maybeSingle()

    if (error) {
      console.error("[holdings] Error updating holding:", error)
      return null
    }
    
    return data ? mapHoldingRow(data) : null
  } catch (err) {
    console.error("[holdings] Error updating holding:", err)
    return null
  }
}

/**
 * Delete a holding
 */
export async function deleteHolding(id: string): Promise<boolean> {
  const supabase = getSupabaseAdminClient()
  
  try {
    const { error } = await supabase
      .from("holdings")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("[holdings] Error deleting holding:", error)
      return false
    }
    
    return true
  } catch (err) {
    console.error("[holdings] Error deleting holding:", err)
    return false
  }
}

