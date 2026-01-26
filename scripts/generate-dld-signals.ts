/**
 * Generate market signals from DLD transactions
 * 
 * Reads from `dld_transactions` (50k imported rows) and populates `market_signal` table.
 * 
 * Detects:
 * - price_change: QoQ median price changes ≥ 5%
 * - yield_opportunity: Areas with high transaction volume (potential yield plays)
 * - supply_spike: Areas with sudden increase in transaction count
 * 
 * Run with: npx tsx scripts/generate-dld-signals.ts
 */

import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Thresholds (lowered for sparse data across many quarters)
const PRICE_CHANGE_THRESHOLD = 0.05 // 5% QoQ
const MIN_TRANSACTIONS = 5 // Minimum transactions for statistical significance
const HOT_AREA_THRESHOLD = 30 // Minimum transactions to be considered "hot"

interface DldTransaction {
  transaction_id: string
  instance_date: string
  trans_group_en: string
  area_name_en: string
  property_type_en: string
  property_sub_type_en: string | null
  rooms_en: string | null
  actual_worth: number
  meter_sale_price: number | null
  procedure_area: number | null
}

interface QuarterStats {
  quarter: string
  start: string
  end: string
  transactions: DldTransaction[]
  count: number
  totalValue: number
  medianPrice: number
  avgPricePerSqm: number
}

interface AreaQuarterData {
  area: string
  quarters: Map<string, QuarterStats>
}

function getQuarter(dateStr: string): { quarter: string; start: string; end: string } {
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = date.getMonth()
  const q = Math.floor(month / 3) + 1
  
  const startMonth = (q - 1) * 3
  const endMonth = startMonth + 2
  
  const start = `${year}-${String(startMonth + 1).padStart(2, "0")}-01`
  const endDate = new Date(year, endMonth + 1, 0) // Last day of quarter
  const end = endDate.toISOString().slice(0, 10)
  
  return { quarter: `${year}-Q${q}`, start, end }
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function makeSignalKey(parts: Record<string, string>): string {
  return Object.entries(parts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join("|")
}

function severityFromDelta(deltaPct: number): "info" | "watch" | "urgent" {
  const abs = Math.abs(deltaPct)
  if (abs >= 0.12) return "urgent"
  if (abs >= 0.06) return "watch"
  return "info"
}

async function resolveTenantId(): Promise<string> {
  if (process.env.DEMO_TENANT_ID) return process.env.DEMO_TENANT_ID
  
  const { data, error } = await supabase
    .from("tenants")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()
  
  if (error) throw error
  if (!data?.id) throw new Error("No tenants found. Run migrations + seed.")
  return data.id
}

async function run() {
  console.log("=== DLD Signal Generator ===\n")
  
  const tenantId = await resolveTenantId()
  console.log(`Tenant ID: ${tenantId}\n`)
  
  // Fetch all sales transactions (paginated to bypass 1000 row limit)
  console.log("Fetching DLD sales transactions...")
  const transactions: DldTransaction[] = []
  let offset = 0
  const pageSize = 1000
  
  while (true) {
    const { data, error } = await supabase
      .from("dld_transactions")
      .select("*")
      .eq("trans_group_en", "Sales")
      .gt("actual_worth", 0)
      .not("instance_date", "is", null)
      .range(offset, offset + pageSize - 1)
    
    if (error) throw error
    if (!data || data.length === 0) break
    
    transactions.push(...(data as DldTransaction[]))
    console.log(`  Fetched ${transactions.length} transactions...`)
    
    if (data.length < pageSize) break
    offset += pageSize
  }
  
  if (transactions.length === 0) {
    console.log("No transactions found!")
    return
  }
  
  console.log(`Found ${transactions.length} total sales transactions\n`)
  
  // Group by area and quarter
  const areaData = new Map<string, AreaQuarterData>()
  
  for (const tx of transactions as DldTransaction[]) {
    if (!tx.area_name_en || !tx.instance_date) continue
    
    const area = tx.area_name_en
    const { quarter, start, end } = getQuarter(tx.instance_date)
    
    if (!areaData.has(area)) {
      areaData.set(area, { area, quarters: new Map() })
    }
    
    const areaEntry = areaData.get(area)!
    if (!areaEntry.quarters.has(quarter)) {
      areaEntry.quarters.set(quarter, {
        quarter,
        start,
        end,
        transactions: [],
        count: 0,
        totalValue: 0,
        medianPrice: 0,
        avgPricePerSqm: 0,
      })
    }
    
    const qStats = areaEntry.quarters.get(quarter)!
    qStats.transactions.push(tx)
    qStats.count++
    qStats.totalValue += tx.actual_worth
  }
  
  // Calculate statistics for each quarter
  for (const [, areaEntry] of areaData) {
    for (const [, qStats] of areaEntry.quarters) {
      const prices = qStats.transactions.map(t => t.actual_worth).filter(p => p > 0)
      const pricesPerSqm = qStats.transactions
        .filter(t => t.meter_sale_price && t.meter_sale_price > 0)
        .map(t => t.meter_sale_price!)
      
      qStats.medianPrice = median(prices)
      qStats.avgPricePerSqm = pricesPerSqm.length > 0 
        ? pricesPerSqm.reduce((a, b) => a + b, 0) / pricesPerSqm.length 
        : 0
    }
  }
  
  // Generate signals
  const signals: Array<Record<string, unknown>> = []
  const now = new Date().toISOString()
  
  // Sort quarters chronologically
  const allQuarters = new Set<string>()
  for (const [, areaEntry] of areaData) {
    for (const q of areaEntry.quarters.keys()) {
      allQuarters.add(q)
    }
  }
  const sortedQuarters = [...allQuarters].sort()
  console.log(`Quarters found: ${sortedQuarters.join(", ")}\n`)
  
  // 1. Price change signals (QoQ)
  console.log("Detecting price change signals...")
  let priceChangeCount = 0
  
  for (const [area, areaEntry] of areaData) {
    const quarters = [...areaEntry.quarters.entries()].sort(([a], [b]) => a.localeCompare(b))
    
    for (let i = 1; i < quarters.length; i++) {
      const [prevQ, prevStats] = quarters[i - 1]
      const [currQ, currStats] = quarters[i]
      
      // Skip if insufficient data
      if (prevStats.count < MIN_TRANSACTIONS || currStats.count < MIN_TRANSACTIONS) continue
      if (prevStats.medianPrice <= 0) continue
      
      const deltaPct = (currStats.medianPrice - prevStats.medianPrice) / prevStats.medianPrice
      
      if (Math.abs(deltaPct) >= PRICE_CHANGE_THRESHOLD) {
        const signalKey = makeSignalKey({
          sourceType: "official",
          source: "dld",
          type: "price_change",
          geoType: "area",
          geoId: area,
          segment: "residential",
          timeframe: "QoQ",
          anchor: currStats.end,
        })
        
        signals.push({
          org_id: tenantId,
          source_type: "official",
          source: "dld",
          type: "price_change",
          severity: severityFromDelta(deltaPct),
          status: "new",
          geo_type: "area",
          geo_id: area,
          geo_name: area,
          segment: "residential",
          metric: "median_price",
          timeframe: "QoQ",
          current_value: currStats.medianPrice,
          prev_value: prevStats.medianPrice,
          delta_value: currStats.medianPrice - prevStats.medianPrice,
          delta_pct: deltaPct,
          confidence_score: Math.min(currStats.count, prevStats.count) >= 50 ? 0.9 : 0.7,
          evidence: {
            current_quarter: currQ,
            prev_quarter: prevQ,
            current_sample_size: currStats.count,
            prev_sample_size: prevStats.count,
            area_name: area,
          },
          signal_key: signalKey,
          created_at: now,
          updated_at: now,
        })
        priceChangeCount++
      }
    }
  }
  console.log(`  → ${priceChangeCount} price change signals\n`)
  
  // 2. Hot area signals (high transaction volume)
  console.log("Detecting hot area signals...")
  let hotAreaCount = 0
  
  // Get the most recent quarter
  const latestQuarter = sortedQuarters[sortedQuarters.length - 1]
  
  for (const [area, areaEntry] of areaData) {
    const latestStats = areaEntry.quarters.get(latestQuarter)
    if (!latestStats || latestStats.count < HOT_AREA_THRESHOLD) continue
    
    const signalKey = makeSignalKey({
      sourceType: "official",
      source: "dld",
      type: "yield_opportunity",
      geoType: "area",
      geoId: area,
      segment: "residential",
      timeframe: "QoQ",
      anchor: latestStats.end,
    })
    
    signals.push({
      org_id: tenantId,
      source_type: "official",
      source: "dld",
      type: "yield_opportunity",
      severity: latestStats.count >= 200 ? "urgent" : "watch",
      status: "new",
      geo_type: "area",
      geo_id: area,
      geo_name: area,
      segment: "residential",
      metric: "transaction_volume",
      timeframe: "QoQ",
      current_value: latestStats.count,
      prev_value: null,
      delta_value: null,
      delta_pct: null,
      confidence_score: 0.85,
      evidence: {
        quarter: latestQuarter,
        transaction_count: latestStats.count,
        total_value: latestStats.totalValue,
        avg_price: Math.round(latestStats.totalValue / latestStats.count),
        avg_price_per_sqm: Math.round(latestStats.avgPricePerSqm),
        area_name: area,
      },
      signal_key: signalKey,
      created_at: now,
      updated_at: now,
    })
    hotAreaCount++
  }
  console.log(`  → ${hotAreaCount} hot area signals\n`)
  
  // 3. Supply spike signals (QoQ transaction count increase)
  console.log("Detecting supply spike signals...")
  let supplyCount = 0
  
  for (const [area, areaEntry] of areaData) {
    const quarters = [...areaEntry.quarters.entries()].sort(([a], [b]) => a.localeCompare(b))
    
    for (let i = 1; i < quarters.length; i++) {
      const [prevQ, prevStats] = quarters[i - 1]
      const [currQ, currStats] = quarters[i]
      
      if (prevStats.count < 10) continue // Need baseline
      
      const countDelta = (currStats.count - prevStats.count) / prevStats.count
      
      if (countDelta >= 0.30) { // 30% increase in transactions
        const signalKey = makeSignalKey({
          sourceType: "official",
          source: "dld",
          type: "supply_spike",
          geoType: "area",
          geoId: area,
          segment: "residential",
          timeframe: "QoQ",
          anchor: currStats.end,
        })
        
        signals.push({
          org_id: tenantId,
          source_type: "official",
          source: "dld",
          type: "supply_spike",
          severity: countDelta >= 0.50 ? "urgent" : "watch",
          status: "new",
          geo_type: "area",
          geo_id: area,
          geo_name: area,
          segment: "residential",
          metric: "transaction_count",
          timeframe: "QoQ",
          current_value: currStats.count,
          prev_value: prevStats.count,
          delta_value: currStats.count - prevStats.count,
          delta_pct: countDelta,
          confidence_score: 0.8,
          evidence: {
            current_quarter: currQ,
            prev_quarter: prevQ,
            area_name: area,
          },
          signal_key: signalKey,
          created_at: now,
          updated_at: now,
        })
        supplyCount++
      }
    }
  }
  console.log(`  → ${supplyCount} supply spike signals\n`)
  
  // Insert signals
  console.log(`Total signals to upsert: ${signals.length}`)
  
  if (signals.length === 0) {
    console.log("No signals generated.")
    return
  }
  
  // Upsert in batches
  const batchSize = 100
  let inserted = 0
  let errors = 0
  
  for (let i = 0; i < signals.length; i += batchSize) {
    const batch = signals.slice(i, i + batchSize)
    const { error: upsertError } = await supabase
      .from("market_signal")
      .upsert(batch, { onConflict: "signal_key" })
    
    if (upsertError) {
      console.error(`Batch error:`, upsertError.message)
      errors += batch.length
    } else {
      inserted += batch.length
    }
  }
  
  console.log(`\n✅ Done! Inserted: ${inserted}, Errors: ${errors}`)
  
  // Final count
  const { count } = await supabase
    .from("market_signal")
    .select("*", { count: "exact", head: true })
    .eq("org_id", tenantId)
  
  console.log(`Total signals in DB for tenant: ${count}`)
}

run().catch(console.error)
