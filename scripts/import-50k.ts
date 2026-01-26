import { createClient } from "@supabase/supabase-js"
import * as fs from "fs"
import * as dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

function parseCSVLine(line: string): string[] {
  const result: string[] = []; let current = ""; let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') inQuotes = !inQuotes
    else if (char === "," && !inQuotes) { result.push(current.trim()); current = "" }
    else current += char
  }
  result.push(current.trim())
  return result
}

function parseDate(s: string): string | null {
  if (!s || s === "null") return null
  const [d, m, y] = s.split("-")
  return d && m && y ? `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}` : null
}

function num(s: string): number | null {
  if (!s || s === "null") return null
  const n = parseFloat(s); return isNaN(n) ? null : n
}

async function run() {
  const content = fs.readFileSync("data/dubai_transactions_50k.csv", "utf-8")
  const lines = content.split("\n").filter(l => l.trim())
  const headers = parseCSVLine(lines[0])
  console.log(`Processing ${lines.length - 1} rows...`)
  
  const getVal = (vals: string[], key: string) => vals[headers.indexOf(key)] ?? ""
  let inserted = 0, errors = 0
  
  for (let i = 1; i < lines.length; i += 500) {
    const batch = []
    for (let j = i; j < Math.min(i + 500, lines.length); j++) {
      const v = parseCSVLine(lines[j])
      batch.push({
        transaction_id: getVal(v, "transaction_id"),
        procedure_id: num(getVal(v, "procedure_id")),
        trans_group_en: getVal(v, "trans_group_en"),
        procedure_name_en: getVal(v, "procedure_name_en"),
        instance_date: parseDate(getVal(v, "instance_date")),
        property_type_en: getVal(v, "property_type_en"),
        property_sub_type_en: getVal(v, "property_sub_type_en") || null,
        property_usage_en: getVal(v, "property_usage_en"),
        reg_type_en: getVal(v, "reg_type_en"),
        area_id: num(getVal(v, "area_id")),
        area_name_en: getVal(v, "area_name_en"),
        building_name_en: getVal(v, "building_name_en") || null,
        project_name_en: getVal(v, "project_name_en") || null,
        master_project_en: getVal(v, "master_project_en") || null,
        nearest_landmark_en: getVal(v, "nearest_landmark_en") || null,
        nearest_metro_en: getVal(v, "nearest_metro_en") || null,
        nearest_mall_en: getVal(v, "nearest_mall_en") || null,
        rooms_en: getVal(v, "rooms_en") || null,
        has_parking: getVal(v, "has_parking") === "1",
        procedure_area: num(getVal(v, "procedure_area")),
        actual_worth: num(getVal(v, "actual_worth")),
        meter_sale_price: num(getVal(v, "meter_sale_price")),
        rent_value: num(getVal(v, "rent_value")),
        meter_rent_price: num(getVal(v, "meter_rent_price")),
      })
    }
    const { error } = await supabase.from("dld_transactions").upsert(batch, { onConflict: "transaction_id" })
    if (error) { console.error("Batch error:", error.message); errors += batch.length }
    else { inserted += batch.length; process.stdout.write(`\r${inserted}/${lines.length - 1}...`) }
  }
  console.log(`\nDone! Inserted: ${inserted}, Errors: ${errors}`)
  const { count } = await supabase.from("dld_transactions").select("*", { count: "exact", head: true })
  console.log(`Total in DB: ${count}`)
}
run()
