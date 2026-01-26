import "server-only"

import { getSupabaseAdminClient } from "@/lib/db/client"

/**
 * COMPUTE AI INVESTOR SUMMARIES
 * -----------------------------
 * Pre-computes investor context for AI consumption.
 * Aggregates mandate, portfolio, and activity data into a single summary row.
 *
 * Inputs:
 *  - `investors` table
 *  - `investor_mandate` (if exists) or mandate from investors.metadata
 *  - `holdings` table
 *  - `market_signal_target` table
 *
 * Output:
 *  - `ai_investor_summary` (one row per investor)
 *
 * Schedule: On investor/mandate changes + daily refresh
 */

export interface InvestorSummaryResult {
  summariesCreated: number
  summariesUpdated: number
  errors: string[]
}

interface InvestorRow {
  id: string
  name: string
  email: string | null
  mandate: Record<string, unknown> | null
}

interface HoldingRow {
  id: string
  investor_id: string
  listing_id: string | null
  current_value: number | null
  monthly_rent: number | null
  occupancy_rate: number | null
}

interface SignalTargetRow {
  investor_id: string
  status: string
}

function formatBudgetRange(min: number | null, max: number | null): string {
  if (min === null && max === null) return 'Flexible'
  
  const formatVal = (v: number) => {
    if (v >= 1_000_000) return `AED ${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000) return `AED ${(v / 1_000).toFixed(0)}K`
    return `AED ${v}`
  }
  
  if (min !== null && max !== null) {
    return `${formatVal(min)} - ${formatVal(max)}`
  }
  if (min !== null) return `From ${formatVal(min)}`
  if (max !== null) return `Up to ${formatVal(max)}`
  return 'Flexible'
}

function formatYield(yieldValue: unknown): number | null {
  if (typeof yieldValue === 'number') {
    // Handle both decimal (0.06) and percentage (6) formats
    return yieldValue > 1 ? yieldValue / 100 : yieldValue
  }
  if (typeof yieldValue === 'string') {
    const parsed = parseFloat(yieldValue.replace('%', ''))
    if (!isNaN(parsed)) {
      return parsed > 1 ? parsed / 100 : parsed
    }
  }
  return null
}

function generateMandateSummary(mandate: Record<string, unknown>): string {
  const parts: string[] = []
  
  // Property type preferences
  const segments = (mandate.preferred_segments as string[]) ?? 
                   (mandate.preferredSegments as string[]) ?? []
  if (segments.length > 0) {
    parts.push(`Looking for ${segments.join('/')}`)
  }
  
  // Area preferences
  const areas = (mandate.preferred_areas as string[]) ?? 
                (mandate.preferredAreas as string[]) ?? []
  if (areas.length > 0) {
    parts.push(`in ${areas.slice(0, 3).join(', ')}${areas.length > 3 ? '...' : ''}`)
  } else if (mandate.open === true || mandate.isOpen === true) {
    parts.push('open to all areas')
  }
  
  // Yield target
  const yieldTarget = formatYield(mandate.yield_target ?? mandate.yieldTarget)
  if (yieldTarget) {
    parts.push(`${(yieldTarget * 100).toFixed(0)}%+ yield target`)
  }
  
  // Budget
  const budgetMin = mandate.budget_min ?? mandate.minInvestment ?? mandate.min_investment
  const budgetMax = mandate.budget_max ?? mandate.maxInvestment ?? mandate.max_investment
  const budgetRange = formatBudgetRange(
    typeof budgetMin === 'number' ? budgetMin : null,
    typeof budgetMax === 'number' ? budgetMax : null
  )
  if (budgetRange !== 'Flexible') {
    parts.push(budgetRange)
  }
  
  // Risk tolerance
  const risk = (mandate.risk_tolerance ?? mandate.riskTolerance ?? 'medium') as string
  if (risk !== 'medium') {
    parts.push(`${risk} risk tolerance`)
  }
  
  return parts.length > 0 ? parts.join(', ') + '.' : 'No specific mandate defined.'
}

function calculateYield(holding: HoldingRow): number | null {
  if (!holding.monthly_rent || !holding.current_value || holding.current_value === 0) return null
  return (holding.monthly_rent * 12) / holding.current_value
}

function generatePortfolioSummary(holdings: HoldingRow[]): string {
  if (holdings.length === 0) {
    return 'No current holdings.'
  }
  
  const totalValue = holdings.reduce((sum, h) => sum + (h.current_value ?? 0), 0)
  const yieldsArray = holdings.map(h => calculateYield(h)).filter((y): y is number => y !== null)
  const avgYield = yieldsArray.length > 0
    ? yieldsArray.reduce((sum, y) => sum + y, 0) / yieldsArray.length
    : null
  const avgOccupancy = holdings.filter(h => h.occupancy_rate).length > 0
    ? holdings.reduce((sum, h) => sum + (h.occupancy_rate ?? 0), 0) / holdings.filter(h => h.occupancy_rate).length
    : null
  
  const parts: string[] = []
  
  // Count
  parts.push(`Owns ${holdings.length} ${holdings.length === 1 ? 'property' : 'properties'}`)
  
  // Total value
  if (totalValue > 0) {
    const valStr = totalValue >= 1_000_000
      ? `AED ${(totalValue / 1_000_000).toFixed(1)}M`
      : `AED ${Math.round(totalValue).toLocaleString()}`
    parts.push(`worth ${valStr}`)
  }
  
  // Average yield
  if (avgYield) {
    parts.push(`avg yield ${(avgYield * 100).toFixed(1)}%`)
  }
  
  // Occupancy
  if (avgOccupancy) {
    parts.push(`${(avgOccupancy * 100).toFixed(0)}% occupancy`)
  }
  
  return parts.join(', ') + '.'
}

export async function computeInvestorSummaries(orgId: string): Promise<InvestorSummaryResult> {
  const supabase = getSupabaseAdminClient()
  const started = Date.now()
  const errors: string[] = []
  
  try {
    // Fetch all investors for the org
    const { data: investors, error: investorError } = await supabase
      .from("investors")
      .select("id, name, email, mandate")
      .eq("tenant_id", orgId)
    
    if (investorError) {
      errors.push(`Investor fetch error: ${investorError.message}`)
      return { summariesCreated: 0, summariesUpdated: 0, errors }
    }
    
    if (!investors || investors.length === 0) {
      console.log(`[computeInvestorSummaries] orgId=${orgId} no investors found`)
      return { summariesCreated: 0, summariesUpdated: 0, errors }
    }
    
    const investorIds = investors.map(i => i.id)
    
    // Fetch holdings for all investors
    const { data: holdings, error: holdingsError } = await supabase
      .from("holdings")
      .select("id, investor_id, listing_id, current_value, monthly_rent, occupancy_rate")
      .in("investor_id", investorIds)
    
    if (holdingsError) {
      errors.push(`Holdings fetch error: ${holdingsError.message}`)
    }
    
    // Fetch signal targets for activity counts
    const { data: signalTargets, error: targetsError } = await supabase
      .from("market_signal_target")
      .select("investor_id, status")
      .in("investor_id", investorIds)
    
    if (targetsError) {
      errors.push(`Signal targets fetch error: ${targetsError.message}`)
    }
    
    // Group holdings by investor
    const holdingsByInvestor = new Map<string, HoldingRow[]>()
    for (const h of (holdings ?? []) as HoldingRow[]) {
      const list = holdingsByInvestor.get(h.investor_id) ?? []
      list.push(h)
      holdingsByInvestor.set(h.investor_id, list)
    }
    
    // Count signals by investor
    const signalCountsByInvestor = new Map<string, { active: number; new: number }>()
    for (const t of (signalTargets ?? []) as SignalTargetRow[]) {
      const counts = signalCountsByInvestor.get(t.investor_id) ?? { active: 0, new: 0 }
      counts.active += 1
      if (t.status === 'new') counts.new += 1
      signalCountsByInvestor.set(t.investor_id, counts)
    }
    
    // Build summary rows
    const summaryRows: Array<Record<string, unknown>> = []
    
    for (const investor of investors as InvestorRow[]) {
      const mandate = (investor.mandate ?? {}) as Record<string, unknown>
      const investorHoldings = holdingsByInvestor.get(investor.id) ?? []
      const signalCounts = signalCountsByInvestor.get(investor.id) ?? { active: 0, new: 0 }
      
      // Extract mandate fields
      const preferredAreas = (mandate.preferred_areas ?? mandate.preferredAreas ?? []) as string[]
      const preferredSegments = (mandate.preferred_segments ?? mandate.preferredSegments ?? []) as string[]
      const yieldTarget = formatYield(mandate.yield_target ?? mandate.yieldTarget)
      const budgetMin = typeof mandate.budget_min === 'number' ? mandate.budget_min :
                        typeof mandate.minInvestment === 'number' ? mandate.minInvestment : null
      const budgetMax = typeof mandate.budget_max === 'number' ? mandate.budget_max :
                        typeof mandate.maxInvestment === 'number' ? mandate.maxInvestment : null
      const riskTolerance = (mandate.risk_tolerance ?? mandate.riskTolerance ?? 'medium') as string
      
      // Calculate portfolio stats
      const portfolioValue = investorHoldings.reduce((sum, h) => sum + (h.current_value ?? 0), 0)
      const yieldsArray = investorHoldings.map(h => calculateYield(h)).filter((y): y is number => y !== null)
      const avgYield = yieldsArray.length > 0
        ? yieldsArray.reduce((sum, y) => sum + y, 0) / yieldsArray.length
        : null
      const avgOccupancy = investorHoldings.filter(h => h.occupancy_rate).length > 0
        ? investorHoldings.reduce((sum, h) => sum + (h.occupancy_rate ?? 0), 0) / investorHoldings.filter(h => h.occupancy_rate).length
        : null
      
      // Top holdings (by value, limit 5)
      const topHoldings = investorHoldings
        .filter(h => h.current_value)
        .sort((a, b) => (b.current_value ?? 0) - (a.current_value ?? 0))
        .slice(0, 5)
        .map(h => ({
          id: h.id,
          listing_id: h.listing_id,
          value: h.current_value,
          yield: calculateYield(h),
        }))
      
      summaryRows.push({
        org_id: orgId,
        investor_id: investor.id,
        name: investor.name,
        email: investor.email,
        mandate_summary: generateMandateSummary(mandate),
        preferred_geos: preferredAreas,
        preferred_segments: preferredSegments,
        yield_target: yieldTarget,
        budget_min: budgetMin,
        budget_max: budgetMax,
        budget_range: formatBudgetRange(budgetMin, budgetMax),
        risk_tolerance: riskTolerance,
        portfolio_summary: generatePortfolioSummary(investorHoldings),
        holdings_count: investorHoldings.length,
        portfolio_value: portfolioValue,
        avg_yield: avgYield,
        avg_occupancy: avgOccupancy,
        active_signals_count: signalCounts.active,
        recommended_properties_count: 0, // Will be computed separately
        pending_approvals_count: 0, // Will be computed from memos
        top_holdings_json: topHoldings.length > 0 ? topHoldings : null,
      })
    }
    
    // Upsert summaries
    const { data: upserted, error: upsertError } = await supabase
      .from("ai_investor_summary")
      .upsert(summaryRows, {
        onConflict: "org_id,investor_id",
      })
      .select("id")
    
    if (upsertError) {
      errors.push(`Upsert error: ${upsertError.message}`)
      console.error(`[computeInvestorSummaries] upsert error:`, upsertError)
    }
    
    const duration = Date.now() - started
    console.log(
      `[computeInvestorSummaries] orgId=${orgId} investors=${investors.length} created/updated=${upserted?.length ?? 0} in ${duration}ms`
    )
    
    return {
      summariesCreated: upserted?.length ?? 0,
      summariesUpdated: 0,
      errors,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    errors.push(`Unexpected error: ${msg}`)
    console.error(`[computeInvestorSummaries] error:`, error)
    return { summariesCreated: 0, summariesUpdated: 0, errors }
  }
}

/**
 * Compute summary for a single investor (for on-demand updates)
 */
export async function computeSingleInvestorSummary(
  orgId: string,
  investorId: string
): Promise<{ success: boolean; error?: string }> {
  const result = await computeInvestorSummaries(orgId)
  // In a real implementation, we'd filter to just this investor
  // For now, recompute all investors in the org
  return {
    success: result.errors.length === 0,
    error: result.errors.length > 0 ? result.errors.join('; ') : undefined,
  }
}
