import { addMonths, differenceInMonths } from "date-fns"

import { mockInvestors, mockProperties } from "@/lib/mock-data"
import type { Counterfactual, RecommendationBundle, Mandate, Property } from "@/lib/types"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { getHoldingsByInvestor, type PropertyHolding as DbPropertyHolding } from "@/lib/db/holdings"
import { getInvestorById as getInvestorByIdDb } from "@/lib/db/investors"
import { listListings } from "@/lib/db/listings"

export type PropertyHolding = {
  id: string
  investorId: string
  propertyId: string
  purchasePrice: number
  purchaseDate: string // yyyy-mm-dd
  currentValue: number
  monthlyRent: number
  occupancyRate: number // 0..1
  annualExpenses: number
}

export type MarketTrendPoint = {
  month: string // yyyy-mm
  index: number // 100 baseline
}

export type MarketData = {
  location: string
  trend: MarketTrendPoint[]
  avgYieldPct: number
  avgYoYAppreciationPct: number
  occupancyPct: number
}

export type PortfolioOpportunity = {
  propertyId: string
  score: number
  reasons: string[]
}

/**
 * Fallback mock holdings - used when database is unavailable
 */
export const mockHoldings: PropertyHolding[] = [
  // ============================================
  // Investor 1: Mohammed Al-Fayed (Core Plus) - 12 PROPERTIES (Large institutional investor)
  // ============================================
  { id: "hold-1", investorId: "inv-1", propertyId: "prop-1", purchasePrice: 8200000, purchaseDate: "2023-02-01", currentValue: 9100000, monthlyRent: 78000, occupancyRate: 0.96, annualExpenses: 210000 },
  { id: "hold-2", investorId: "inv-1", propertyId: "prop-2", purchasePrice: 11500000, purchaseDate: "2023-01-15", currentValue: 12800000, monthlyRent: 112000, occupancyRate: 0.98, annualExpenses: 280000 },
  { id: "hold-3", investorId: "inv-1", propertyId: "prop-101", purchasePrice: 6800000, purchaseDate: "2022-06-01", currentValue: 7900000, monthlyRent: 62000, occupancyRate: 1.0, annualExpenses: 175000 },
  { id: "hold-4", investorId: "inv-1", propertyId: "prop-102", purchasePrice: 9200000, purchaseDate: "2023-03-15", currentValue: 10100000, monthlyRent: 85000, occupancyRate: 0.94, annualExpenses: 235000 },
  { id: "hold-5", investorId: "inv-1", propertyId: "prop-103", purchasePrice: 14500000, purchaseDate: "2022-11-01", currentValue: 16200000, monthlyRent: 125000, occupancyRate: 0.92, annualExpenses: 360000 },
  { id: "hold-6", investorId: "inv-1", propertyId: "prop-104", purchasePrice: 7600000, purchaseDate: "2023-05-20", currentValue: 8300000, monthlyRent: 68000, occupancyRate: 0.97, annualExpenses: 195000 },
  { id: "hold-7", investorId: "inv-1", propertyId: "prop-105", purchasePrice: 5400000, purchaseDate: "2023-08-01", currentValue: 5850000, monthlyRent: 48000, occupancyRate: 1.0, annualExpenses: 140000 },
  { id: "hold-8", investorId: "inv-1", propertyId: "prop-106", purchasePrice: 12100000, purchaseDate: "2022-09-15", currentValue: 13800000, monthlyRent: 105000, occupancyRate: 0.95, annualExpenses: 310000 },
  { id: "hold-9", investorId: "inv-1", propertyId: "prop-107", purchasePrice: 8900000, purchaseDate: "2023-07-01", currentValue: 9600000, monthlyRent: 78000, occupancyRate: 0.91, annualExpenses: 225000 },
  { id: "hold-10", investorId: "inv-1", propertyId: "prop-108", purchasePrice: 6200000, purchaseDate: "2024-01-10", currentValue: 6550000, monthlyRent: 55000, occupancyRate: 0.98, annualExpenses: 160000 },
  { id: "hold-11", investorId: "inv-1", propertyId: "prop-109", purchasePrice: 10800000, purchaseDate: "2023-04-01", currentValue: 11900000, monthlyRent: 95000, occupancyRate: 0.93, annualExpenses: 275000 },
  { id: "hold-12", investorId: "inv-1", propertyId: "prop-110", purchasePrice: 7100000, purchaseDate: "2023-10-15", currentValue: 7650000, monthlyRent: 62000, occupancyRate: 1.0, annualExpenses: 180000 },

  // ============================================
  // Investor 2: Fatima Hassan (Value Add) - 4 PROPERTIES (Medium active investor)
  // ============================================
  { id: "hold-13", investorId: "inv-2", propertyId: "prop-3", purchasePrice: 4500000, purchaseDate: "2024-03-15", currentValue: 5100000, monthlyRent: 42000, occupancyRate: 0.92, annualExpenses: 120000 },
  { id: "hold-14", investorId: "inv-2", propertyId: "prop-4", purchasePrice: 3200000, purchaseDate: "2024-05-01", currentValue: 3600000, monthlyRent: 32000, occupancyRate: 0.88, annualExpenses: 85000 },
  { id: "hold-15", investorId: "inv-2", propertyId: "prop-111", purchasePrice: 2800000, purchaseDate: "2024-01-20", currentValue: 3150000, monthlyRent: 28000, occupancyRate: 0.95, annualExpenses: 75000 },
  { id: "hold-16", investorId: "inv-2", propertyId: "prop-112", purchasePrice: 5200000, purchaseDate: "2023-11-01", currentValue: 6000000, monthlyRent: 52000, occupancyRate: 0.90, annualExpenses: 140000 },

  // ============================================
  // Investor 3: Ahmed Khalil (Core) - 2 PROPERTIES (New investor, just starting)
  // ============================================
  { id: "hold-17", investorId: "inv-3", propertyId: "prop-113", purchasePrice: 18000000, purchaseDate: "2024-06-01", currentValue: 18500000, monthlyRent: 95000, occupancyRate: 0.85, annualExpenses: 420000 },
  { id: "hold-18", investorId: "inv-3", propertyId: "prop-114", purchasePrice: 22000000, purchaseDate: "2024-08-15", currentValue: 22300000, monthlyRent: 115000, occupancyRate: 0.92, annualExpenses: 510000 },

  // ============================================
  // Investor 4: Layla Mansour (Opportunistic) - 8 PROPERTIES (Growing portfolio)
  // ============================================
  { id: "hold-19", investorId: "inv-4", propertyId: "prop-5", purchasePrice: 22000000, purchaseDate: "2023-11-01", currentValue: 26500000, monthlyRent: 195000, occupancyRate: 0.94, annualExpenses: 550000 },
  { id: "hold-20", investorId: "inv-4", propertyId: "prop-6", purchasePrice: 18500000, purchaseDate: "2024-01-20", currentValue: 21000000, monthlyRent: 165000, occupancyRate: 0.97, annualExpenses: 480000 },
  { id: "hold-21", investorId: "inv-4", propertyId: "prop-115", purchasePrice: 35000000, purchaseDate: "2023-06-01", currentValue: 42000000, monthlyRent: 285000, occupancyRate: 0.91, annualExpenses: 850000 },
  { id: "hold-22", investorId: "inv-4", propertyId: "prop-116", purchasePrice: 28000000, purchaseDate: "2023-09-15", currentValue: 33000000, monthlyRent: 225000, occupancyRate: 0.88, annualExpenses: 680000 },
  { id: "hold-23", investorId: "inv-4", propertyId: "prop-117", purchasePrice: 15500000, purchaseDate: "2024-02-01", currentValue: 17200000, monthlyRent: 135000, occupancyRate: 0.95, annualExpenses: 400000 },
  { id: "hold-24", investorId: "inv-4", propertyId: "prop-118", purchasePrice: 42000000, purchaseDate: "2023-04-01", currentValue: 51000000, monthlyRent: 345000, occupancyRate: 0.93, annualExpenses: 1050000 },
  { id: "hold-25", investorId: "inv-4", propertyId: "prop-119", purchasePrice: 19800000, purchaseDate: "2023-12-01", currentValue: 22500000, monthlyRent: 175000, occupancyRate: 0.96, annualExpenses: 510000 },
  { id: "hold-26", investorId: "inv-4", propertyId: "prop-120", purchasePrice: 24500000, purchaseDate: "2024-03-15", currentValue: 26800000, monthlyRent: 195000, occupancyRate: 0.89, annualExpenses: 620000 },

  // ============================================
  // Investor 5: Omar Al-Nuaimi (Core Plus Industrial) - 3 PROPERTIES (Specialized investor)
  // ============================================
  { id: "hold-27", investorId: "inv-5", propertyId: "prop-7", purchasePrice: 9800000, purchaseDate: "2024-04-01", currentValue: 10500000, monthlyRent: 92000, occupancyRate: 1.0, annualExpenses: 220000 },
  { id: "hold-28", investorId: "inv-5", propertyId: "prop-121", purchasePrice: 12500000, purchaseDate: "2023-10-01", currentValue: 14200000, monthlyRent: 125000, occupancyRate: 1.0, annualExpenses: 290000 },
  { id: "hold-29", investorId: "inv-5", propertyId: "prop-122", purchasePrice: 8200000, purchaseDate: "2024-01-15", currentValue: 8900000, monthlyRent: 78000, occupancyRate: 0.98, annualExpenses: 195000 },

  // ============================================
  // Investor 6: Noura Al-Maktoum (Value Add) - 5 PROPERTIES (Active value-add investor)
  // ============================================
  { id: "hold-30", investorId: "inv-6", propertyId: "prop-123", purchasePrice: 8500000, purchaseDate: "2024-02-01", currentValue: 9800000, monthlyRent: 75000, occupancyRate: 0.88, annualExpenses: 220000 },
  { id: "hold-31", investorId: "inv-6", propertyId: "prop-124", purchasePrice: 12000000, purchaseDate: "2023-11-15", currentValue: 14500000, monthlyRent: 105000, occupancyRate: 0.92, annualExpenses: 310000 },
  { id: "hold-32", investorId: "inv-6", propertyId: "prop-125", purchasePrice: 6800000, purchaseDate: "2024-04-01", currentValue: 7600000, monthlyRent: 58000, occupancyRate: 0.95, annualExpenses: 175000 },
  { id: "hold-33", investorId: "inv-6", propertyId: "prop-126", purchasePrice: 15500000, purchaseDate: "2023-08-01", currentValue: 18200000, monthlyRent: 135000, occupancyRate: 0.90, annualExpenses: 390000 },
  { id: "hold-34", investorId: "inv-6", propertyId: "prop-127", purchasePrice: 9200000, purchaseDate: "2024-05-15", currentValue: 10100000, monthlyRent: 82000, occupancyRate: 0.87, annualExpenses: 235000 },

  // ============================================
  // Investor 7: Rashid Al-Thani (Core Luxury) - 6 PROPERTIES (Luxury focused)
  // ============================================
  { id: "hold-35", investorId: "inv-7", propertyId: "prop-8", purchasePrice: 32000000, purchaseDate: "2023-09-15", currentValue: 35500000, monthlyRent: 185000, occupancyRate: 0.92, annualExpenses: 750000 },
  { id: "hold-36", investorId: "inv-7", propertyId: "prop-9", purchasePrice: 28000000, purchaseDate: "2024-02-01", currentValue: 30000000, monthlyRent: 165000, occupancyRate: 0.95, annualExpenses: 680000 },
  { id: "hold-37", investorId: "inv-7", propertyId: "prop-128", purchasePrice: 45000000, purchaseDate: "2023-03-01", currentValue: 52000000, monthlyRent: 265000, occupancyRate: 0.88, annualExpenses: 1100000 },
  { id: "hold-38", investorId: "inv-7", propertyId: "prop-129", purchasePrice: 38000000, purchaseDate: "2023-06-15", currentValue: 43000000, monthlyRent: 225000, occupancyRate: 0.94, annualExpenses: 920000 },
  { id: "hold-39", investorId: "inv-7", propertyId: "prop-130", purchasePrice: 25000000, purchaseDate: "2024-01-01", currentValue: 26500000, monthlyRent: 145000, occupancyRate: 0.97, annualExpenses: 610000 },
  { id: "hold-40", investorId: "inv-7", propertyId: "prop-131", purchasePrice: 55000000, purchaseDate: "2022-11-01", currentValue: 65000000, monthlyRent: 325000, occupancyRate: 0.90, annualExpenses: 1350000 },

  // ============================================
  // Investor 8: Sarah Chen (Institutional) - 10 PROPERTIES (Large institutional)
  // ============================================
  { id: "hold-41", investorId: "inv-8", propertyId: "prop-10", purchasePrice: 45000000, purchaseDate: "2024-06-01", currentValue: 48000000, monthlyRent: 380000, occupancyRate: 0.98, annualExpenses: 1100000 },
  { id: "hold-42", investorId: "inv-8", propertyId: "prop-132", purchasePrice: 38000000, purchaseDate: "2023-09-01", currentValue: 42500000, monthlyRent: 315000, occupancyRate: 0.96, annualExpenses: 950000 },
  { id: "hold-43", investorId: "inv-8", propertyId: "prop-133", purchasePrice: 52000000, purchaseDate: "2023-05-15", currentValue: 59000000, monthlyRent: 425000, occupancyRate: 0.94, annualExpenses: 1280000 },
  { id: "hold-44", investorId: "inv-8", propertyId: "prop-134", purchasePrice: 28000000, purchaseDate: "2024-01-01", currentValue: 30500000, monthlyRent: 235000, occupancyRate: 0.97, annualExpenses: 710000 },
  { id: "hold-45", investorId: "inv-8", propertyId: "prop-135", purchasePrice: 65000000, purchaseDate: "2023-02-01", currentValue: 75000000, monthlyRent: 525000, occupancyRate: 0.92, annualExpenses: 1600000 },
  { id: "hold-46", investorId: "inv-8", propertyId: "prop-136", purchasePrice: 42000000, purchaseDate: "2023-07-15", currentValue: 47500000, monthlyRent: 355000, occupancyRate: 0.95, annualExpenses: 1050000 },
  { id: "hold-47", investorId: "inv-8", propertyId: "prop-137", purchasePrice: 35000000, purchaseDate: "2023-11-01", currentValue: 38500000, monthlyRent: 285000, occupancyRate: 0.93, annualExpenses: 880000 },
  { id: "hold-48", investorId: "inv-8", propertyId: "prop-138", purchasePrice: 48000000, purchaseDate: "2024-03-01", currentValue: 51000000, monthlyRent: 395000, occupancyRate: 0.98, annualExpenses: 1180000 },
  { id: "hold-49", investorId: "inv-8", propertyId: "prop-139", purchasePrice: 32000000, purchaseDate: "2023-08-15", currentValue: 36000000, monthlyRent: 265000, occupancyRate: 0.91, annualExpenses: 810000 },
  { id: "hold-50", investorId: "inv-8", propertyId: "prop-140", purchasePrice: 55000000, purchaseDate: "2024-04-01", currentValue: 57500000, monthlyRent: 445000, occupancyRate: 0.96, annualExpenses: 1380000 },

  // ============================================
  // Investor 9: James Morrison (Core Holiday Home) - 3 PROPERTIES
  // ============================================
  { id: "hold-51", investorId: "inv-9", propertyId: "prop-11", purchasePrice: 8500000, purchaseDate: "2024-03-01", currentValue: 9200000, monthlyRent: 55000, occupancyRate: 0.75, annualExpenses: 180000 },
  { id: "hold-52", investorId: "inv-9", propertyId: "prop-141", purchasePrice: 6200000, purchaseDate: "2023-12-01", currentValue: 6800000, monthlyRent: 42000, occupancyRate: 0.80, annualExpenses: 155000 },
  { id: "hold-53", investorId: "inv-9", propertyId: "prop-142", purchasePrice: 11500000, purchaseDate: "2024-01-15", currentValue: 12300000, monthlyRent: 72000, occupancyRate: 0.70, annualExpenses: 285000 },

  // ============================================
  // Investor 10: Aisha Malik (First-time) - 2 PROPERTIES (Small but growing)
  // ============================================
  { id: "hold-54", investorId: "inv-10", propertyId: "prop-12", purchasePrice: 1200000, purchaseDate: "2024-08-01", currentValue: 1280000, monthlyRent: 9500, occupancyRate: 1.0, annualExpenses: 28000 },
  { id: "hold-55", investorId: "inv-10", propertyId: "prop-143", purchasePrice: 1850000, purchaseDate: "2024-10-01", currentValue: 1920000, monthlyRent: 14500, occupancyRate: 0.95, annualExpenses: 42000 },

  // ============================================
  // Investor 11: Abdullah Al-Rashid (Opportunistic) - 15 PROPERTIES (Largest portfolio)
  // ============================================
  { id: "hold-56", investorId: "inv-11", propertyId: "prop-13", purchasePrice: 85000000, purchaseDate: "2023-06-01", currentValue: 105000000, monthlyRent: 720000, occupancyRate: 0.91, annualExpenses: 2200000 },
  { id: "hold-57", investorId: "inv-11", propertyId: "prop-14", purchasePrice: 62000000, purchaseDate: "2024-01-15", currentValue: 71000000, monthlyRent: 520000, occupancyRate: 0.88, annualExpenses: 1600000 },
  { id: "hold-58", investorId: "inv-11", propertyId: "prop-144", purchasePrice: 120000000, purchaseDate: "2022-09-01", currentValue: 155000000, monthlyRent: 1050000, occupancyRate: 0.94, annualExpenses: 3100000 },
  { id: "hold-59", investorId: "inv-11", propertyId: "prop-145", purchasePrice: 48000000, purchaseDate: "2023-03-15", currentValue: 58000000, monthlyRent: 395000, occupancyRate: 0.92, annualExpenses: 1250000 },
  { id: "hold-60", investorId: "inv-11", propertyId: "prop-146", purchasePrice: 75000000, purchaseDate: "2023-08-01", currentValue: 88000000, monthlyRent: 615000, occupancyRate: 0.89, annualExpenses: 1950000 },
  { id: "hold-61", investorId: "inv-11", propertyId: "prop-147", purchasePrice: 95000000, purchaseDate: "2022-12-01", currentValue: 118000000, monthlyRent: 825000, occupancyRate: 0.93, annualExpenses: 2450000 },
  { id: "hold-62", investorId: "inv-11", propertyId: "prop-148", purchasePrice: 38000000, purchaseDate: "2024-02-01", currentValue: 42500000, monthlyRent: 295000, occupancyRate: 0.95, annualExpenses: 980000 },
  { id: "hold-63", investorId: "inv-11", propertyId: "prop-149", purchasePrice: 55000000, purchaseDate: "2023-05-15", currentValue: 65000000, monthlyRent: 455000, occupancyRate: 0.90, annualExpenses: 1420000 },
  { id: "hold-64", investorId: "inv-11", propertyId: "prop-150", purchasePrice: 82000000, purchaseDate: "2023-10-01", currentValue: 95000000, monthlyRent: 675000, occupancyRate: 0.87, annualExpenses: 2150000 },
  { id: "hold-65", investorId: "inv-11", propertyId: "prop-151", purchasePrice: 42000000, purchaseDate: "2024-04-01", currentValue: 46000000, monthlyRent: 325000, occupancyRate: 0.96, annualExpenses: 1100000 },
  { id: "hold-66", investorId: "inv-11", propertyId: "prop-152", purchasePrice: 68000000, purchaseDate: "2023-01-15", currentValue: 82000000, monthlyRent: 565000, occupancyRate: 0.91, annualExpenses: 1780000 },
  { id: "hold-67", investorId: "inv-11", propertyId: "prop-153", purchasePrice: 105000000, purchaseDate: "2022-06-01", currentValue: 135000000, monthlyRent: 925000, occupancyRate: 0.88, annualExpenses: 2750000 },
  { id: "hold-68", investorId: "inv-11", propertyId: "prop-154", purchasePrice: 35000000, purchaseDate: "2024-05-15", currentValue: 38000000, monthlyRent: 265000, occupancyRate: 0.94, annualExpenses: 920000 },
  { id: "hold-69", investorId: "inv-11", propertyId: "prop-155", purchasePrice: 72000000, purchaseDate: "2023-07-01", currentValue: 85000000, monthlyRent: 595000, occupancyRate: 0.92, annualExpenses: 1880000 },
  { id: "hold-70", investorId: "inv-11", propertyId: "prop-156", purchasePrice: 58000000, purchaseDate: "2023-11-15", currentValue: 66000000, monthlyRent: 465000, occupancyRate: 0.89, annualExpenses: 1520000 },

  // ============================================
  // Investor 12: Elena Petrova (Core Lifestyle) - 4 PROPERTIES
  // ============================================
  { id: "hold-71", investorId: "inv-12", propertyId: "prop-15", purchasePrice: 15000000, purchaseDate: "2024-08-15", currentValue: 15800000, monthlyRent: 0, occupancyRate: 0.0, annualExpenses: 380000 }, // Owner-occupied
  { id: "hold-72", investorId: "inv-12", propertyId: "prop-157", purchasePrice: 8500000, purchaseDate: "2024-02-01", currentValue: 9200000, monthlyRent: 65000, occupancyRate: 0.92, annualExpenses: 215000 },
  { id: "hold-73", investorId: "inv-12", propertyId: "prop-158", purchasePrice: 12000000, purchaseDate: "2023-10-01", currentValue: 13500000, monthlyRent: 85000, occupancyRate: 0.88, annualExpenses: 305000 },
  { id: "hold-74", investorId: "inv-12", propertyId: "prop-159", purchasePrice: 6200000, purchaseDate: "2024-05-01", currentValue: 6650000, monthlyRent: 48000, occupancyRate: 0.95, annualExpenses: 160000 },
]

/**
 * Fetch market data from DLD area stats - real database
 */
export async function getMarketDataFromDb(): Promise<MarketData[]> {
  try {
    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase
      .from("dld_area_stats")
      .select("*")
      .gt("transaction_count", 10)
      .order("transaction_count", { ascending: false })
      .limit(20)
    
    if (error || !data) {
      console.warn("[real-estate] Error fetching market data:", error?.message)
      return mockMarketData
    }

    return data.map(row => ({
      location: row.area_name_en || "Unknown",
      trend: [], // Would need historical data for trends
      avgYieldPct: 8.0, // Default - would calculate from holdings
      avgYoYAppreciationPct: row.yoy_change_pct || 0,
      occupancyPct: 92, // Default - would need occupancy data
    }))
  } catch (err) {
    console.warn("[real-estate] Error fetching market data:", err)
    return mockMarketData
  }
}

/**
 * Fallback market data when DB is unavailable
 */
export const mockMarketData: MarketData[] = [
  {
    location: "Dubai Marina",
    trend: [
      { month: "2024-01", index: 100 },
      { month: "2024-02", index: 102 },
      { month: "2024-03", index: 104 },
      { month: "2024-04", index: 105 },
      { month: "2024-05", index: 107 },
      { month: "2024-06", index: 108 },
    ],
    avgYieldPct: 8.5,
    avgYoYAppreciationPct: 5.2,
    occupancyPct: 94,
  },
  {
    location: "Downtown Dubai",
    trend: [
      { month: "2024-01", index: 100 },
      { month: "2024-02", index: 101 },
      { month: "2024-03", index: 103 },
      { month: "2024-04", index: 104 },
      { month: "2024-05", index: 106 },
      { month: "2024-06", index: 107 },
    ],
    avgYieldPct: 7.8,
    avgYoYAppreciationPct: 4.8,
    occupancyPct: 96,
  },
  {
    location: "Business Bay",
    trend: [
      { month: "2024-01", index: 100 },
      { month: "2024-02", index: 102 },
      { month: "2024-03", index: 104 },
      { month: "2024-04", index: 106 },
      { month: "2024-05", index: 108 },
      { month: "2024-06", index: 110 },
    ],
    avgYieldPct: 9.2,
    avgYoYAppreciationPct: 6.1,
    occupancyPct: 92,
  },
]

export function formatAED(value: number) {
  const safe = typeof value === "number" && Number.isFinite(value) ? value : 0
  return `AED ${safe.toLocaleString()}`
}

/**
 * Get holdings for investor - async version using database
 */
export async function getHoldingsForInvestorAsync(investorId: string): Promise<PropertyHolding[]> {
  try {
    const dbHoldings = await getHoldingsByInvestor(investorId)
    
    if (dbHoldings.length === 0) {
      // Fallback to mock data if no DB records
      return mockHoldings.filter((h) => h.investorId === investorId)
    }
    
    // Map DB holdings to PropertyHolding type
    return dbHoldings.map(h => ({
      id: h.id,
      investorId: h.investorId,
      propertyId: h.listingId, // DB uses listingId
      purchasePrice: h.purchasePrice,
      purchaseDate: h.purchaseDate,
      currentValue: h.currentValue,
      monthlyRent: h.monthlyRent,
      occupancyRate: h.occupancyRate,
      annualExpenses: h.annualExpenses,
    }))
  } catch (err) {
    console.warn("[real-estate] Error fetching holdings, using mock:", err)
    return mockHoldings.filter((h) => h.investorId === investorId)
  }
}

/**
 * Synchronous version - uses mock data (for backward compatibility)
 * @deprecated Use getHoldingsForInvestorAsync instead
 */
export function getHoldingsForInvestor(investorId: string) {
  return mockHoldings.filter((h) => h.investorId === investorId)
}

/**
 * Get property associated with a holding - async version
 */
export async function getHoldingPropertyAsync(holding: PropertyHolding): Promise<Property | null> {
  try {
    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase
      .from("listings")
      .select("*")
      .eq("id", holding.propertyId)
      .maybeSingle()
    
    if (error || !data) {
      return mockProperties.find((p) => p.id === holding.propertyId) ?? null
    }
    
    // Map DB listing to Property type
    return {
      id: data.id,
      title: data.title || "Unknown Property",
      area: data.area || "Dubai",
      type: data.type || "apartment",
      unitType: data.type || "apartment",
      price: data.price || 0,
      size: data.size || 0,
      bedrooms: data.bedrooms || 0,
      status: data.status || "available",
      source: { type: "developer", name: data.developer },
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    } as Property
  } catch (err) {
    console.warn("[real-estate] Error fetching property:", err)
    return mockProperties.find((p) => p.id === holding.propertyId) ?? null
  }
}

export function getHoldingProperty(holding: PropertyHolding) {
  return mockProperties.find((p) => p.id === holding.propertyId) ?? null
}

export function calcAnnualGrossRent(holding: PropertyHolding) {
  return holding.monthlyRent * 12 * holding.occupancyRate
}

export function calcAnnualNetRent(holding: PropertyHolding) {
  return calcAnnualGrossRent(holding) - holding.annualExpenses
}

export function calcYieldPct(holding: PropertyHolding) {
  const netRent = calcAnnualNetRent(holding)
  return (netRent / holding.currentValue) * 100
}

export function calcAppreciationPct(holding: PropertyHolding) {
  return ((holding.currentValue - holding.purchasePrice) / holding.purchasePrice) * 100
}

export function calcIncomeToDate(holding: PropertyHolding, asOf = new Date()) {
  const purchaseDate = new Date(holding.purchaseDate)
  const monthsHeld = differenceInMonths(asOf, purchaseDate)
  const monthlyNet = calcAnnualNetRent(holding) / 12
  return {
    net: monthlyNet * monthsHeld,
    months: monthsHeld,
  }
}

export function forecastMonthlyNetIncome(
  holding: PropertyHolding,
  monthsAhead = 12,
  occupancyRateOverride?: number,
) {
  const occupancy = occupancyRateOverride ?? holding.occupancyRate
  const monthlyGross = holding.monthlyRent * occupancy
  const monthlyExpenses = holding.annualExpenses / 12
  const monthlyNet = monthlyGross - monthlyExpenses
  const points: { month: string; net: number; gross: number }[] = []
  for (let i = 0; i < monthsAhead; i++) {
    const monthDate = addMonths(new Date(), i)
    const month = monthDate.toISOString().slice(0, 7)
    points.push({
      month,
      net: monthlyNet,
      gross: monthlyGross,
    })
  }
  return points
}

/**
 * Get portfolio summary - async version using database
 */
export async function getPortfolioSummaryAsync(investorId: string) {
  const holdings = await getHoldingsForInvestorAsync(investorId)
  const totalPortfolioValue = holdings.reduce((sum, h) => sum + h.currentValue, 0)
  const totalPurchasePrice = holdings.reduce((sum, h) => sum + h.purchasePrice, 0)
  
  // Calculate net monthly income for each holding
  const monthlyNets = holdings.map(h => {
    const grossMonthly = h.monthlyRent * h.occupancyRate
    const monthlyExpenses = h.annualExpenses / 12
    return grossMonthly - monthlyExpenses
  })
  const totalMonthlyRental = monthlyNets.reduce((sum, net) => sum + net, 0)
  const totalAnnualRental = totalMonthlyRental * 12
  const avgYieldPct = holdings.length > 0 ? holdings.reduce((sum, h) => sum + calcYieldPct(h), 0) / holdings.length : 0
  const avgOccupancyPct =
    holdings.length > 0 ? holdings.reduce((sum, h) => sum + h.occupancyRate * 100, 0) / holdings.length : 0
  const appreciationPct =
    totalPurchasePrice > 0 ? ((totalPortfolioValue - totalPurchasePrice) / totalPurchasePrice) * 100 : 0

  return {
    holdings,
    totalPortfolioValue,
    totalPurchaseCost: totalPurchasePrice,
    totalMonthlyRental,
    totalAnnualRental,
    avgYieldPct,
    occupancyPct: avgOccupancyPct,
    appreciationPct,
    propertyCount: holdings.length,
  }
}

/**
 * Synchronous version - uses mock data
 * @deprecated Use getPortfolioSummaryAsync instead
 */
export function getPortfolioSummary(investorId: string) {
  const holdings = getHoldingsForInvestor(investorId)
  const totalPortfolioValue = holdings.reduce((sum, h) => sum + h.currentValue, 0)
  const totalPurchasePrice = holdings.reduce((sum, h) => sum + h.purchasePrice, 0)
  // Calculate net monthly income for each holding
  const totalMonthlyRental = holdings.reduce((sum, h) => {
    const grossMonthly = h.monthlyRent * h.occupancyRate
    const monthlyExpenses = h.annualExpenses / 12
    return sum + (grossMonthly - monthlyExpenses)
  }, 0)
  const totalAnnualRental = totalMonthlyRental * 12
  const avgYieldPct = holdings.length > 0 ? holdings.reduce((sum, h) => sum + calcYieldPct(h), 0) / holdings.length : 0
  const avgOccupancyPct =
    holdings.length > 0 ? holdings.reduce((sum, h) => sum + h.occupancyRate * 100, 0) / holdings.length : 0
  const appreciationPct =
    totalPurchasePrice > 0 ? ((totalPortfolioValue - totalPurchasePrice) / totalPurchasePrice) * 100 : 0

  return {
    holdings,
    totalPortfolioValue,
    totalPurchaseCost: totalPurchasePrice,
    totalMonthlyRental,
    totalAnnualRental,
    avgYieldPct,
    occupancyPct: avgOccupancyPct,
    appreciationPct,
    propertyCount: holdings.length,
  }
}

/**
 * Get opportunities for investor - async version using real DB data
 * Queries portal_listings and DLD data for opportunities matching investor mandate
 */
export async function getOpportunitiesForInvestorAsync(investorId: string): Promise<PortfolioOpportunity[]> {
  try {
    const supabase = getSupabaseAdminClient()
    
    // Get investor and their mandate from DB
    const investor = await getInvestorByIdDb(investorId)
    const mandate = investor?.mandate as Mandate | undefined
    
    // Get investor's current holdings
    const holdings = await getHoldingsForInvestorAsync(investorId)
    const ownedIds = new Set(holdings.map((h) => h.propertyId))
    
    // Query portal listings with good potential (Bayut data)
    const { data: portalListings, error: portalError } = await supabase
      .from("portal_listings")
      .select("*")
      .eq("is_active", true)
      .eq("listing_type", "sale")
      .order("asking_price", { ascending: true })
      .limit(50)
    
    if (portalError) {
      console.warn("[real-estate] Error fetching portal listings:", portalError.message)
    }
    
    // Also get DLD market signals for opportunities
    const { data: signals, error: signalError } = await supabase
      .from("dld_market_signals")
      .select("*")
      .eq("severity", "opportunity")
      .order("created_at", { ascending: false })
      .limit(20)
    
    if (signalError) {
      console.warn("[real-estate] Error fetching market signals:", signalError.message)
    }
    
    const opportunities: PortfolioOpportunity[] = []
    
    // Score portal listings
    if (portalListings) {
      for (const listing of portalListings) {
        if (ownedIds.has(listing.id)) continue
        
        // Check mandate filters
        if (mandate?.preferredAreas?.length) {
          const matchesArea = mandate.preferredAreas.some(area => 
            listing.area_name?.toLowerCase().includes(area.toLowerCase())
          )
          if (!matchesArea) continue
        }
        
        // Check price range
        const price = listing.asking_price || 0
        if (mandate?.minInvestment && price < mandate.minInvestment) continue
        if (mandate?.maxInvestment && price > mandate.maxInvestment) continue
        
        // Calculate score based on available data
        let score = 50 // Base score
        const reasons: string[] = []
        
        // Price per sqm analysis (compared to market average)
        const pricePerSqm = listing.price_per_sqm || 0
        if (pricePerSqm > 0 && pricePerSqm < 15000) {
          score += 15
          reasons.push("Below market price per sqm")
        }
        
        // Size bonus
        if (listing.size_sqm && listing.size_sqm > 100) {
          score += 10
          reasons.push("Good size property")
        }
        
        // Area match bonus
        if (mandate?.preferredAreas?.some(a => listing.area_name?.includes(a))) {
          score += 15
          reasons.push(`Matches preferred area (${listing.area_name})`)
        }
        
        // Type match bonus
        const propType = listing.property_type?.toLowerCase() || ""
        if (mandate?.propertyTypes?.some(t => propType.includes(t.toLowerCase()))) {
          score += 10
          reasons.push(`Matches mandate type (${listing.property_type})`)
        }
        
        if (reasons.length > 0) {
          opportunities.push({
            propertyId: listing.id,
            score: Math.round(score),
            reasons: reasons.slice(0, 3),
          })
        }
      }
    }
    
    // Add signal-based opportunities
    if (signals) {
      for (const signal of signals) {
        if (signal.area_name_en && !ownedIds.has(signal.id)) {
          opportunities.push({
            propertyId: signal.id,
            score: 75, // Market signals get high base score
            reasons: [
              `Market opportunity: ${signal.title || signal.type}`,
              signal.area_name_en,
            ],
          })
        }
      }
    }
    
    // Sort by score and return top 8
    return opportunities
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
    
  } catch (err) {
    console.warn("[real-estate] Error in getOpportunitiesForInvestorAsync:", err)
    // Fallback to sync version with mock data
    return getOpportunitiesForInvestor(investorId)
  }
}

/**
 * Synchronous version using mock data - for backward compatibility
 * @deprecated Use getOpportunitiesForInvestorAsync instead
 */
export function getOpportunitiesForInvestor(investorId: string): PortfolioOpportunity[] {
  const investor = mockInvestors.find((i) => i.id === investorId)
  const mandate = investor?.mandate
  const ownedIds = new Set(getHoldingsForInvestor(investorId).map((h) => h.propertyId))

  const candidates = mockProperties
    .filter((p) => !ownedIds.has(p.id))
    .filter((p) => (mandate?.preferredAreas?.length ? mandate.preferredAreas.includes(p.area) : true))

  return candidates
    .map((p) => {
      const score =
        (p.trustScore ?? 60) * 0.55 +
        (p.roi ?? 7) * 3.5 +
        (mandate?.propertyTypes?.includes(p.type) ? 10 : 0)

      const reasons: string[] = []
      if (p.trustScore && p.trustScore >= 85) reasons.push("High trust score")
      if (p.roi && p.roi >= 9) reasons.push("Strong yield")
      if (mandate?.preferredAreas?.includes(p.area)) reasons.push(`Matches preferred area (${p.area})`)
      if (mandate?.propertyTypes?.includes(p.type)) reasons.push(`Matches mandate type (${p.type})`)

      return { propertyId: p.id, score: Math.round(score), reasons: reasons.slice(0, 3) }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
}

/**
 * Build a recommendation bundle with both recommended properties and counterfactuals.
 * 
 * This function evaluates all candidate properties against the investor's mandate,
 * budget, portfolio constraints, and trust policies. Properties that pass thresholds
 * become recommendations; strong candidates that fail 1-2 constraints become counterfactuals.
 * 
 * TODO: Replace deterministic rule-based reason generation with real AI model outputs.
 * The reasonCodes should map to a finite set that can be traced back to model reasoning.
 */
export function buildRecommendationBundle({
  investorId,
  mandate,
  portfolioSnapshot,
  evaluatedCandidates,
  trustPolicy,
  budget,
}: {
  investorId: string
  mandate?: Mandate
  portfolioSnapshot?: { holdings: PropertyHolding[] }
  evaluatedCandidates?: Property[]
  trustPolicy?: { minTrustScore?: number; requireVerification?: boolean }
  budget?: { min?: number; max?: number }
}): RecommendationBundle {
  const investor = mockInvestors.find((i) => i.id === investorId)
  const actualMandate = mandate || investor?.mandate
  const actualPortfolio = portfolioSnapshot || { holdings: getHoldingsForInvestor(investorId) }
  const actualCandidates = evaluatedCandidates || mockProperties
  const actualTrustPolicy = trustPolicy || { minTrustScore: 70, requireVerification: false }
  const actualBudget = budget || {
    min: actualMandate?.minInvestment || 0,
    max: actualMandate?.maxInvestment || Infinity,
  }

  const ownedIds = new Set(actualPortfolio.holdings.map((h) => h.propertyId))
  const areaCounts = new Map<string, number>()
  actualPortfolio.holdings.forEach((h) => {
    const prop = mockProperties.find((p) => p.id === h.propertyId)
    if (prop?.area) {
      areaCounts.set(prop.area, (areaCounts.get(prop.area) || 0) + 1)
    }
  })

  // Evaluate all candidates
  const evaluated = actualCandidates
    .filter((p) => !ownedIds.has(p.id))
    .map((p) => {
      const score =
        (p.trustScore ?? 60) * 0.55 +
        (p.roi ?? 7) * 3.5 +
        (actualMandate?.propertyTypes?.includes(p.type) ? 10 : 0)

      const reasons: string[] = []
      if (p.trustScore && p.trustScore >= 85) reasons.push("High trust score")
      if (p.roi && p.roi >= 9) reasons.push("Strong yield")
      if (actualMandate?.preferredAreas?.includes(p.area)) reasons.push(`Matches preferred area (${p.area})`)
      if (actualMandate?.propertyTypes?.includes(p.type)) reasons.push(`Matches mandate type (${p.type})`)

      return {
        property: p,
        score: Math.round(score),
        reasons: reasons.slice(0, 3),
      }
    })
    .sort((a, b) => b.score - a.score)

  const recommended: PortfolioOpportunity[] = []
  const counterfactuals: Counterfactual[] = []

  // Determine yield target from mandate
  const yieldTarget = actualMandate?.yieldTarget
    ? parseFloat(actualMandate.yieldTarget.replace("%", "").split("-")[0])
    : 8.0

  for (const candidate of evaluated) {
    const p = candidate.property
    const reasonCodes: string[] = []
    const reasonLabels: string[] = []
    const violatedConstraints: Counterfactual["violatedConstraints"] = []
    const whatWouldChange: string[] = []

    // Check constraints
    let passesAll = true

    // Budget check
    const budgetMax = actualBudget.max ?? Infinity
    const budgetMin = actualBudget.min ?? 0
    if (p.price > budgetMax) {
      passesAll = false
      const overBy = p.price - budgetMax
      reasonCodes.push("over_budget")
      reasonLabels.push(`Over budget by AED ${(overBy / 1000).toFixed(0)}k`)
      violatedConstraints.push({
        key: "budget_max",
        expected: budgetMax,
        actual: p.price,
      })
      whatWouldChange.push(`If price < AED ${(budgetMax / 1000000).toFixed(1)}M`)
    } else if (p.price < budgetMin) {
      reasonCodes.push("under_budget_min")
      reasonLabels.push(`Below minimum investment threshold`)
      violatedConstraints.push({
        key: "budget_min",
        expected: budgetMin,
        actual: p.price,
      })
    }

    // Yield check
    if (p.roi && p.roi < yieldTarget) {
      passesAll = false
      const diff = yieldTarget - p.roi
      reasonCodes.push("yield_below_target")
      reasonLabels.push(`Yield below target by ${diff.toFixed(1)}%`)
      violatedConstraints.push({
        key: "yield_target",
        expected: yieldTarget,
        actual: p.roi,
      })
      whatWouldChange.push(`If yield >= ${yieldTarget}%`)
    }

    // Trust/verification check
    if (p.trustScore && p.trustScore < actualTrustPolicy.minTrustScore!) {
      passesAll = false
      reasonCodes.push("low_trust_score")
      reasonLabels.push(`Trust score below threshold (${p.trustScore} < ${actualTrustPolicy.minTrustScore})`)
      violatedConstraints.push({
        key: "trust_score",
        expected: actualTrustPolicy.minTrustScore,
        actual: p.trustScore,
      })
      whatWouldChange.push(`If trust score >= ${actualTrustPolicy.minTrustScore}`)
    }

    if (actualTrustPolicy.requireVerification && p.readinessStatus === "NEEDS_VERIFICATION") {
      passesAll = false
      reasonCodes.push("needs_verification")
      reasonLabels.push("Needs verification: portal source")
      violatedConstraints.push({
        key: "readiness_status",
        expected: "READY_FOR_MEMO",
        actual: p.readinessStatus,
      })
      whatWouldChange.push("If trust verified")
    }

    // Concentration risk
    const areaCount = areaCounts.get(p.area) || 0
    if (areaCount >= 2) {
      passesAll = false
      reasonCodes.push("concentration_risk")
      reasonLabels.push(`Concentration risk: already ${areaCount} assets in ${p.area}`)
      violatedConstraints.push({
        key: "area_concentration",
        expected: "< 2",
        actual: areaCount,
      })
    }

    // Area mismatch (soft constraint)
    if (actualMandate?.preferredAreas?.length && !actualMandate.preferredAreas.includes(p.area)) {
      reasonCodes.push("area_mismatch")
      reasonLabels.push(`Not in preferred area (${p.area})`)
    }

    // Type mismatch (soft constraint)
    if (actualMandate?.propertyTypes?.length && !actualMandate.propertyTypes.includes(p.type)) {
      reasonCodes.push("type_mismatch")
      reasonLabels.push(`Not preferred type (${p.type})`)
    }

    // Liquidity risk (mock: check if property has low comps)
    // In real implementation, this would check market data
    if (p.source?.type === "portal" && !p.trustScore) {
      reasonCodes.push("liquidity_risk")
      reasonLabels.push("Liquidity risk: limited comps in last 6 months")
    }

    if (passesAll && reasonCodes.length === 0) {
      // Recommended
      recommended.push({
        propertyId: p.id,
        score: candidate.score,
        reasons: candidate.reasons,
      })
    } else if (reasonCodes.length > 0 && reasonCodes.length <= 2 && candidate.score > 50) {
      // Counterfactual: failed 1-2 constraints but still strong candidate
      counterfactuals.push({
        propertyId: p.id,
        title: p.title,
        reasonCodes,
        reasonLabels,
        details: `This property scored ${candidate.score} but was excluded due to: ${reasonLabels.join(", ")}`,
        violatedConstraints,
        whatWouldChangeMyMind: whatWouldChange.length > 0 ? whatWouldChange : undefined,
        score: candidate.score,
      })
    }
  }

  // Limit recommendations to top 4-6
  const finalRecommended = recommended.slice(0, 6)
  const recommendedIds = new Set(finalRecommended.map((r) => r.propertyId))

  // Filter counterfactuals to exclude duplicates and limit to 3-10
  const finalCounterfactuals = counterfactuals
    .filter((c) => !recommendedIds.has(c.propertyId))
    .slice(0, 10)

  return {
    recommended: finalRecommended,
    counterfactuals: finalCounterfactuals,
    source: "ai_insight",
  }
}
