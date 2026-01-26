/**
 * Compute DLD Area Medians
 * 
 * This script refreshes the dld_area_medians materialized view.
 * It can also manually compute medians if the view doesn't exist.
 * 
 * Usage:
 *   npx tsx scripts/compute-dld-medians.ts
 */

import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

interface AreaMedian {
  area_name_en: string
  property_type_en: string
  transaction_count: number
  median_price: number
  median_price_per_sqm: number
  avg_price: number
  min_price: number
  max_price: number
}

/**
 * Compute median of an array of numbers
 */
function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/**
 * Refresh the materialized view (if it exists)
 */
async function refreshMaterializedView(): Promise<boolean> {
  console.log("Attempting to refresh dld_area_medians materialized view...")
  
  const { error } = await supabase.rpc("refresh_dld_area_medians")
  
  if (error) {
    console.warn("Could not refresh materialized view:", error.message)
    return false
  }
  
  console.log("✓ Materialized view refreshed successfully")
  return true
}

/**
 * Manually compute area medians from dld_transactions
 * This is a fallback if the materialized view doesn't exist
 */
async function computeMediansManually(): Promise<AreaMedian[]> {
  console.log("Computing area medians manually from dld_transactions...")
  
  // Fetch all sales transactions from last 18 months
  const cutoffDate = new Date()
  cutoffDate.setMonth(cutoffDate.getMonth() - 18)
  const cutoffStr = cutoffDate.toISOString().slice(0, 10)
  
  console.log(`  Fetching transactions since ${cutoffStr}...`)
  
  // Fetch in batches
  const transactions: Array<{
    area_name_en: string
    property_type_en: string
    actual_worth: number
    meter_sale_price: number
  }> = []
  
  let offset = 0
  const pageSize = 1000
  
  while (true) {
    const { data, error } = await supabase
      .from("dld_transactions")
      .select("area_name_en, property_type_en, actual_worth, meter_sale_price")
      .eq("trans_group_en", "Sales")
      .gt("actual_worth", 0)
      .not("area_name_en", "is", null)
      .gte("instance_date", cutoffStr)
      .range(offset, offset + pageSize - 1)
    
    if (error) {
      console.error("Error fetching transactions:", error.message)
      break
    }
    
    if (!data || data.length === 0) break
    
    transactions.push(...data)
    console.log(`  Fetched ${transactions.length} transactions...`)
    
    if (data.length < pageSize) break
    offset += pageSize
  }
  
  console.log(`  Total transactions: ${transactions.length}`)
  
  // Group by area + property type
  const groups = new Map<string, {
    area_name_en: string
    property_type_en: string
    prices: number[]
    pricesPerSqm: number[]
  }>()
  
  for (const tx of transactions) {
    const key = `${tx.area_name_en}||${tx.property_type_en || "Unknown"}`
    
    if (!groups.has(key)) {
      groups.set(key, {
        area_name_en: tx.area_name_en,
        property_type_en: tx.property_type_en || "Unknown",
        prices: [],
        pricesPerSqm: [],
      })
    }
    
    const group = groups.get(key)!
    group.prices.push(tx.actual_worth)
    if (tx.meter_sale_price && tx.meter_sale_price > 0) {
      group.pricesPerSqm.push(tx.meter_sale_price)
    }
  }
  
  // Calculate medians for each group
  const results: AreaMedian[] = []
  
  for (const [, group] of groups) {
    if (group.prices.length < 3) continue // Require at least 3 transactions
    
    results.push({
      area_name_en: group.area_name_en,
      property_type_en: group.property_type_en,
      transaction_count: group.prices.length,
      median_price: median(group.prices),
      median_price_per_sqm: group.pricesPerSqm.length > 0 ? median(group.pricesPerSqm) : 0,
      avg_price: group.prices.reduce((a, b) => a + b, 0) / group.prices.length,
      min_price: Math.min(...group.prices),
      max_price: Math.max(...group.prices),
    })
  }
  
  // Sort by transaction count descending
  results.sort((a, b) => b.transaction_count - a.transaction_count)
  
  console.log(`  Computed medians for ${results.length} area+type combinations`)
  
  return results
}

/**
 * Display summary statistics
 */
async function displaySummary() {
  console.log("\n--- DLD Area Medians Summary ---\n")
  
  // Try to query the materialized view first
  const { data: viewData, error: viewError } = await supabase
    .from("dld_area_medians")
    .select("*")
    .order("transaction_count", { ascending: false })
    .limit(20)
  
  if (viewError) {
    console.log("Materialized view not available, computing manually...")
    const manualData = await computeMediansManually()
    
    console.log("\nTop 20 areas by transaction count:")
    console.log("-".repeat(80))
    
    for (const row of manualData.slice(0, 20)) {
      console.log(
        `${row.area_name_en.padEnd(30)} | ${row.property_type_en.padEnd(15)} | ` +
        `Count: ${String(row.transaction_count).padStart(4)} | ` +
        `Median: AED ${Math.round(row.median_price).toLocaleString().padStart(12)} | ` +
        `PSM: ${Math.round(row.median_price_per_sqm).toLocaleString().padStart(8)}`
      )
    }
    
    console.log("-".repeat(80))
    console.log(`Total: ${manualData.length} area+type combinations with 3+ transactions`)
    
    return manualData
  }
  
  console.log("Top 20 areas by transaction count (from materialized view):")
  console.log("-".repeat(80))
  
  for (const row of viewData || []) {
    console.log(
      `${(row.area_name_en || "Unknown").toString().padEnd(30)} | ${(row.property_type_en || "Unknown").toString().padEnd(15)} | ` +
      `Count: ${String(row.transaction_count).padStart(4)} | ` +
      `Median: AED ${Math.round(row.median_price || 0).toLocaleString().padStart(12)} | ` +
      `PSM: ${Math.round(row.median_price_per_sqm || 0).toLocaleString().padStart(8)}`
    )
  }
  
  console.log("-".repeat(80))
  
  // Get total count
  const { count } = await supabase
    .from("dld_area_medians")
    .select("*", { count: "exact", head: true })
  
  console.log(`Total: ${count} area+type combinations in materialized view`)
  
  return viewData
}

async function main() {
  console.log("=== DLD Area Medians Computation ===\n")
  
  // Try to refresh the materialized view
  const refreshed = await refreshMaterializedView()
  
  if (!refreshed) {
    console.log("\nMaterialized view may not exist. Run the migration first:")
    console.log("  psql $DATABASE_URL < supabase/migrations/007_portal_comparison.sql\n")
  }
  
  // Display summary
  await displaySummary()
  
  console.log("\n✓ Done")
}

main().catch(console.error)
