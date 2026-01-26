/**
 * Import DLD (Dubai Land Department) transaction data from Dubai Pulse
 * 
 * Data source: https://dubaipulse.gov.ae/data/dld-transactions/dld_transactions-open
 * 
 * Run with: npx tsx scripts/import-dld-data.ts
 */

import { createClient } from "@supabase/supabase-js"
import * as fs from "fs"
import * as path from "path"

// Load environment variables
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

interface DLDTransaction {
  transaction_id: string
  procedure_id: number | null
  trans_group_en: string
  procedure_name_en: string
  instance_date: string | null
  property_type_en: string
  property_sub_type_en: string | null
  property_usage_en: string
  reg_type_en: string
  area_id: number | null
  area_name_en: string
  building_name_en: string | null
  project_name_en: string | null
  master_project_en: string | null
  nearest_landmark_en: string | null
  nearest_metro_en: string | null
  nearest_mall_en: string | null
  rooms_en: string | null
  has_parking: boolean
  procedure_area: number | null
  actual_worth: number | null
  meter_sale_price: number | null
  rent_value: number | null
  meter_rent_price: number | null
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === "," && !inQuotes) {
      result.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }
  result.push(current.trim())
  
  return result
}

function parseDate(dateStr: string): string | null {
  if (!dateStr || dateStr === "null") return null
  // Format: DD-MM-YYYY
  const [day, month, year] = dateStr.split("-")
  if (!day || !month || !year) return null
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
}

function parseNumber(str: string): number | null {
  if (!str || str === "null" || str === "") return null
  const num = parseFloat(str)
  return isNaN(num) ? null : num
}

function parseRow(values: string[], headers: string[]): DLDTransaction | null {
  try {
    const getValue = (key: string): string => {
      const idx = headers.indexOf(key)
      return idx >= 0 ? values[idx] ?? "" : ""
    }

    return {
      transaction_id: getValue("transaction_id"),
      procedure_id: parseNumber(getValue("procedure_id")) as number | null,
      trans_group_en: getValue("trans_group_en"),
      procedure_name_en: getValue("procedure_name_en"),
      instance_date: parseDate(getValue("instance_date")),
      property_type_en: getValue("property_type_en"),
      property_sub_type_en: getValue("property_sub_type_en") || null,
      property_usage_en: getValue("property_usage_en"),
      reg_type_en: getValue("reg_type_en"),
      area_id: parseNumber(getValue("area_id")) as number | null,
      area_name_en: getValue("area_name_en"),
      building_name_en: getValue("building_name_en") || null,
      project_name_en: getValue("project_name_en") || null,
      master_project_en: getValue("master_project_en") || null,
      nearest_landmark_en: getValue("nearest_landmark_en") || null,
      nearest_metro_en: getValue("nearest_metro_en") || null,
      nearest_mall_en: getValue("nearest_mall_en") || null,
      rooms_en: getValue("rooms_en") || null,
      has_parking: getValue("has_parking") === "1",
      procedure_area: parseNumber(getValue("procedure_area")),
      actual_worth: parseNumber(getValue("actual_worth")),
      meter_sale_price: parseNumber(getValue("meter_sale_price")),
      rent_value: parseNumber(getValue("rent_value")),
      meter_rent_price: parseNumber(getValue("meter_rent_price")),
    }
  } catch (err) {
    console.error("Error parsing row:", err)
    return null
  }
}

async function importData() {
  const csvPath = path.join(process.cwd(), "data", "dubai_transactions_sample.csv")
  
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found: ${csvPath}`)
    console.log("Download with: curl -L 'https://www.dubaipulse.gov.ae/dataset/.../transactions.csv' | head -n 5001 > data/dubai_transactions_sample.csv")
    process.exit(1)
  }

  const content = fs.readFileSync(csvPath, "utf-8")
  const lines = content.split("\n").filter(line => line.trim())
  
  if (lines.length < 2) {
    console.error("CSV file is empty or has no data rows")
    process.exit(1)
  }

  const headers = parseCSVLine(lines[0])
  console.log(`Found ${lines.length - 1} data rows`)
  console.log(`Headers: ${headers.slice(0, 10).join(", ")}...`)

  const transactions: DLDTransaction[] = []
  let skipped = 0

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const tx = parseRow(values, headers)
    
    if (tx && tx.transaction_id) {
      transactions.push(tx)
    } else {
      skipped++
    }
  }

  console.log(`Parsed ${transactions.length} transactions (${skipped} skipped)`)

  // Filter for sales transactions from recent years (2020+)
  const recentSales = transactions.filter(tx => {
    if (!tx.instance_date) return false
    const year = parseInt(tx.instance_date.split("-")[0])
    return tx.trans_group_en === "Sales" && year >= 2020
  })

  console.log(`Found ${recentSales.length} sales transactions from 2020+`)

  // Insert in batches
  const batchSize = 100
  let inserted = 0
  let errors = 0

  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize)
    
    const { error } = await supabase
      .from("dld_transactions")
      .upsert(batch, { onConflict: "transaction_id" })

    if (error) {
      console.error(`Batch ${i / batchSize + 1} error:`, error.message)
      errors += batch.length
    } else {
      inserted += batch.length
      process.stdout.write(`\rInserted ${inserted}/${transactions.length} transactions...`)
    }
  }

  console.log(`\n\nImport complete!`)
  console.log(`  - Inserted: ${inserted}`)
  console.log(`  - Errors: ${errors}`)

  // Show some stats
  const { data: stats } = await supabase
    .from("dld_transactions")
    .select("trans_group_en, area_name_en")
    .limit(1)

  const { count } = await supabase
    .from("dld_transactions")
    .select("*", { count: "exact", head: true })

  console.log(`\nTotal records in database: ${count}`)
}

importData().catch(console.error)
