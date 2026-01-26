import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { DEMO_IDS } from "@/lib/demo/demo-data"

/**
 * Demo Reset API Endpoint
 * Resets all demo data to initial state
 * 
 * POST /api/demo/reset
 * 
 * Protected by demo mode check - only works when NEXT_PUBLIC_DEMO_MODE=true
 */

const DEMO_TENANT_ID = DEMO_IDS.TENANT

// Demo data constants for reset
const DEMO_REALTOR_ID = DEMO_IDS.REALTOR
const DEMO_ADMIN_ID = DEMO_IDS.ADMIN
const DEMO_INVESTOR_1_ID = DEMO_IDS.INVESTOR_PRIMARY
const DEMO_INVESTOR_2_ID = DEMO_IDS.INVESTOR_SECONDARY

export async function POST() {
  // Check if demo mode is enabled
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
    return NextResponse.json(
      { error: "Demo mode is not enabled" },
      { status: 403 }
    )
  }

  try {
    const supabase = getSupabaseAdminClient()

    // Begin cleanup - delete in reverse dependency order
    // Using individual delete calls for better error handling

    // 1. Delete market signal targets
    await supabase
      .from("market_signal_target")
      .delete()
      .in("investor_id", [DEMO_INVESTOR_1_ID, DEMO_INVESTOR_2_ID])

    // 2. Delete market signals
    await supabase
      .from("market_signal")
      .delete()
      .eq("tenant_id", DEMO_TENANT_ID)

    // 3. Delete decisions
    await supabase
      .from("decisions")
      .delete()
      .eq("tenant_id", DEMO_TENANT_ID)

    // 4. Delete messages
    await supabase
      .from("messages")
      .delete()
      .eq("tenant_id", DEMO_TENANT_ID)

    // 5. Delete memo versions (need to get memo IDs first)
    const { data: memos } = await supabase
      .from("memos")
      .select("id")
      .eq("tenant_id", DEMO_TENANT_ID)
    
    if (memos && memos.length > 0) {
      const memoIds = memos.map((m) => m.id)
      await supabase
        .from("memo_versions")
        .delete()
        .in("memo_id", memoIds)
    }

    // 6. Delete memos
    await supabase
      .from("memos")
      .delete()
      .eq("tenant_id", DEMO_TENANT_ID)

    // 7. Delete tasks
    await supabase
      .from("tasks")
      .delete()
      .eq("tenant_id", DEMO_TENANT_ID)

    // 8. Delete trust records
    await supabase
      .from("trust_records")
      .delete()
      .eq("tenant_id", DEMO_TENANT_ID)

    // 9. Delete shortlist items and shortlists
    await supabase
      .from("shortlist_items")
      .delete()
      .eq("tenant_id", DEMO_TENANT_ID)
    
    await supabase
      .from("shortlists")
      .delete()
      .eq("tenant_id", DEMO_TENANT_ID)

    // 10. Delete holdings
    await supabase
      .from("holdings")
      .delete()
      .eq("tenant_id", DEMO_TENANT_ID)

    // 11. Delete listings
    await supabase
      .from("listings")
      .delete()
      .eq("tenant_id", DEMO_TENANT_ID)

    // 12. Delete investors
    await supabase
      .from("investors")
      .delete()
      .eq("tenant_id", DEMO_TENANT_ID)

    // 13. Delete audit events
    await supabase
      .from("audit_events")
      .delete()
      .eq("tenant_id", DEMO_TENANT_ID)

    // 14. Delete notifications
    await supabase
      .from("notifications")
      .delete()
      .eq("tenant_id", DEMO_TENANT_ID)

    // 15. Delete users
    await supabase
      .from("users")
      .delete()
      .eq("tenant_id", DEMO_TENANT_ID)

    // 16. Delete tenant
    await supabase
      .from("tenants")
      .delete()
      .eq("id", DEMO_TENANT_ID)

    // Now recreate all demo data

    // 1. Create tenant
    await supabase.from("tenants").insert({
      id: DEMO_TENANT_ID,
      name: "Al-Rashid Realty Group (Demo)",
      created_at: new Date().toISOString(),
    })

    // 2. Create users
    await supabase.from("users").insert([
      {
        id: DEMO_REALTOR_ID,
        tenant_id: DEMO_TENANT_ID,
        name: "Sarah Al-Rashid",
        email: "sarah@demo-alrashid.ae",
        role: "agent",
        created_at: new Date().toISOString(),
      },
      {
        id: DEMO_ADMIN_ID,
        tenant_id: DEMO_TENANT_ID,
        name: "Omar Al-Nahyan",
        email: "omar@demo-alrashid.ae",
        role: "manager",
        created_at: new Date().toISOString(),
      },
    ])

    // 3. Create investors
    await supabase.from("investors").insert([
      {
        id: DEMO_INVESTOR_1_ID,
        tenant_id: DEMO_TENANT_ID,
        name: "Mohammed Al-Rashid",
        company: "Al-Rashid Investments LLC",
        email: "m.alrashid@demo-alrashid-inv.ae",
        phone: "+971 50 123 4567",
        status: "active",
        mandate: {
          strategy: "Core Plus",
          investmentHorizon: "5-7 years",
          yieldTarget: "8-12%",
          riskTolerance: "medium",
          preferredAreas: ["Dubai Marina", "Downtown Dubai", "Business Bay", "Palm Jumeirah"],
          propertyTypes: ["residential", "commercial", "mixed-use"],
          minInvestment: 5000000,
          maxInvestment: 30000000,
          notes: "Focus on premium Grade A assets with established tenant base.",
        },
        created_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
        last_contact: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        total_deals: 4,
        assigned_agent_id: DEMO_REALTOR_ID,
      },
      {
        id: DEMO_INVESTOR_2_ID,
        tenant_id: DEMO_TENANT_ID,
        name: "Amira Al-Mansoori",
        company: "Mansoori Capital Partners",
        email: "amira@demo-mansoori-capital.com",
        phone: "+971 55 987 6543",
        status: "active",
        mandate: {
          strategy: "Value Add",
          investmentHorizon: "3-5 years",
          yieldTarget: "15-20%",
          riskTolerance: "high",
          preferredAreas: ["JVC", "Dubai South", "Al Quoz", "Dubai Creek Harbour"],
          propertyTypes: ["residential", "land"],
          minInvestment: 3000000,
          maxInvestment: 15000000,
          notes: "Seeks undervalued assets with renovation potential.",
        },
        created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
        last_contact: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        total_deals: 2,
        assigned_agent_id: DEMO_REALTOR_ID,
      },
    ])

    // 4. Create listings
    const listings = [
      {
        id: DEMO_IDS.LISTING_MARINA_PENTHOUSE,
        tenant_id: DEMO_TENANT_ID,
        title: "Marina View Penthouse",
        address: "Marina Heights Tower, Floor 45, Dubai Marina",
        area: "Dubai Marina",
        type: "residential",
        status: "sold",
        price: 12500000,
        size: 3200,
        bedrooms: 4,
        bathrooms: 5,
        readiness: "Ready",
        developer: "Select Group",
        expected_rent: 1020000,
        currency: "AED",
      },
      {
        id: DEMO_IDS.LISTING_DOWNTOWN_OFFICE,
        tenant_id: DEMO_TENANT_ID,
        title: "Downtown Boulevard Office Tower",
        address: "Boulevard Plaza, Tower 1, Downtown Dubai",
        area: "Downtown Dubai",
        type: "commercial",
        status: "sold",
        price: 18500000,
        size: 4500,
        readiness: "Ready",
        developer: "Emaar Properties",
        expected_rent: 1944000,
        currency: "AED",
      },
      {
        id: DEMO_IDS.LISTING_BUSINESS_BAY_RETAIL,
        tenant_id: DEMO_TENANT_ID,
        title: "Bay Square Retail Podium",
        address: "Bay Square, Building 7, Business Bay",
        area: "Business Bay",
        type: "commercial",
        status: "sold",
        price: 8200000,
        size: 2100,
        readiness: "Ready",
        developer: "Omniyat",
        expected_rent: 720000,
        currency: "AED",
      },
      {
        id: DEMO_IDS.LISTING_PALM_VILLA,
        tenant_id: DEMO_TENANT_ID,
        title: "Palm Jumeirah Signature Villa",
        address: "Frond L, Palm Jumeirah",
        area: "Palm Jumeirah",
        type: "residential",
        status: "available",
        price: 42000000,
        size: 8500,
        bedrooms: 6,
        bathrooms: 7,
        readiness: "Ready",
        developer: "Nakheel",
        expected_rent: 2400000,
        currency: "AED",
      },
      {
        id: DEMO_IDS.LISTING_JVC_APARTMENT,
        tenant_id: DEMO_TENANT_ID,
        title: "JVC Community Residence",
        address: "District 12, Jumeirah Village Circle",
        area: "JVC",
        type: "residential",
        status: "sold",
        price: 1850000,
        size: 1200,
        bedrooms: 2,
        bathrooms: 3,
        readiness: "Ready",
        developer: "Nakheel",
        expected_rent: 144000,
        currency: "AED",
      },
      {
        id: DEMO_IDS.LISTING_CREEK_TOWER,
        tenant_id: DEMO_TENANT_ID,
        title: "Dubai Creek Harbour Residence",
        address: "Creek Gate Tower 2, Dubai Creek Harbour",
        area: "Dubai Creek Harbour",
        type: "residential",
        status: "available",
        price: 6800000,
        size: 2400,
        bedrooms: 3,
        bathrooms: 4,
        readiness: "Ready",
        developer: "Emaar Properties",
        expected_rent: 450000,
        currency: "AED",
      },
      {
        id: DEMO_IDS.LISTING_BLUEWATERS_UNIT,
        tenant_id: DEMO_TENANT_ID,
        title: "Bluewaters Island 2BR",
        address: "Bluewaters Residences, Building 8",
        area: "Bluewaters Island",
        type: "residential",
        status: "sold",
        price: 5200000,
        size: 1650,
        bedrooms: 2,
        bathrooms: 3,
        readiness: "Ready",
        developer: "Meraas",
        expected_rent: 336000,
        currency: "AED",
      },
      {
        id: "demo-lst-0000-0000-000000000008",
        tenant_id: DEMO_TENANT_ID,
        title: "Marina Quays 3BR",
        address: "Marina Quays East, Dubai Marina",
        area: "Dubai Marina",
        type: "residential",
        status: "available",
        price: 4800000,
        size: 1850,
        bedrooms: 3,
        bathrooms: 3,
        readiness: "Ready",
        developer: "Emaar Properties",
        expected_rent: 280000,
        currency: "AED",
      },
    ]
    await supabase.from("listings").insert(listings)

    // 5. Create holdings
    await supabase.from("holdings").insert([
      {
        id: DEMO_IDS.HOLDING_1,
        tenant_id: DEMO_TENANT_ID,
        investor_id: DEMO_INVESTOR_1_ID,
        listing_id: DEMO_IDS.LISTING_MARINA_PENTHOUSE,
        purchase_price: 11800000,
        purchase_date: "2024-03-15",
        current_value: 12500000,
        monthly_rent: 85000,
        occupancy_rate: 0.96,
        annual_expenses: 180000,
      },
      {
        id: DEMO_IDS.HOLDING_2,
        tenant_id: DEMO_TENANT_ID,
        investor_id: DEMO_INVESTOR_1_ID,
        listing_id: DEMO_IDS.LISTING_DOWNTOWN_OFFICE,
        purchase_price: 17200000,
        purchase_date: "2023-11-20",
        current_value: 18500000,
        monthly_rent: 162000,
        occupancy_rate: 1.0,
        annual_expenses: 285000,
      },
      {
        id: DEMO_IDS.HOLDING_3,
        tenant_id: DEMO_TENANT_ID,
        investor_id: DEMO_INVESTOR_1_ID,
        listing_id: DEMO_IDS.LISTING_BUSINESS_BAY_RETAIL,
        purchase_price: 7800000,
        purchase_date: "2024-01-10",
        current_value: 8200000,
        monthly_rent: 60000,
        occupancy_rate: 0.92,
        annual_expenses: 95000,
      },
      {
        id: DEMO_IDS.HOLDING_4,
        tenant_id: DEMO_TENANT_ID,
        investor_id: DEMO_INVESTOR_2_ID,
        listing_id: DEMO_IDS.LISTING_JVC_APARTMENT,
        purchase_price: 1650000,
        purchase_date: "2024-06-01",
        current_value: 1850000,
        monthly_rent: 12000,
        occupancy_rate: 0.88,
        annual_expenses: 32000,
      },
      {
        id: DEMO_IDS.HOLDING_5,
        tenant_id: DEMO_TENANT_ID,
        investor_id: DEMO_INVESTOR_1_ID,
        listing_id: DEMO_IDS.LISTING_BLUEWATERS_UNIT,
        purchase_price: 4900000,
        purchase_date: "2024-08-15",
        current_value: 5200000,
        monthly_rent: 28000,
        occupancy_rate: 0.85,
        annual_expenses: 72000,
      },
    ])

    // 6. Create shortlists
    await supabase.from("shortlists").insert([
      {
        id: DEMO_IDS.SHORTLIST_1,
        tenant_id: DEMO_TENANT_ID,
        investor_id: DEMO_INVESTOR_1_ID,
        agent_id: DEMO_REALTOR_ID,
      },
      {
        id: DEMO_IDS.SHORTLIST_2,
        tenant_id: DEMO_TENANT_ID,
        investor_id: DEMO_INVESTOR_2_ID,
        agent_id: DEMO_REALTOR_ID,
      },
    ])

    await supabase.from("shortlist_items").insert([
      {
        id: "demo-sli-001",
        tenant_id: DEMO_TENANT_ID,
        shortlist_id: DEMO_IDS.SHORTLIST_1,
        listing_id: DEMO_IDS.LISTING_PALM_VILLA,
        match_score: 94,
        match_explanation: "Exceptional fit for Core Plus strategy - prime beachfront location",
        pinned: true,
        rank: 1,
        added_by: DEMO_REALTOR_ID,
      },
      {
        id: "demo-sli-002",
        tenant_id: DEMO_TENANT_ID,
        shortlist_id: DEMO_IDS.SHORTLIST_1,
        listing_id: "demo-lst-0000-0000-000000000008",
        match_score: 86,
        match_explanation: "Strong Marina location with competitive entry price",
        pinned: false,
        rank: 2,
        added_by: DEMO_REALTOR_ID,
      },
      {
        id: "demo-sli-003",
        tenant_id: DEMO_TENANT_ID,
        shortlist_id: DEMO_IDS.SHORTLIST_2,
        listing_id: DEMO_IDS.LISTING_CREEK_TOWER,
        match_score: 91,
        match_explanation: "Excellent value-add opportunity in emerging area",
        pinned: true,
        rank: 1,
        added_by: DEMO_REALTOR_ID,
      },
    ])

    // 7. Create memos
    await supabase.from("memos").insert([
      {
        id: DEMO_IDS.MEMO_DRAFT,
        tenant_id: DEMO_TENANT_ID,
        investor_id: DEMO_INVESTOR_1_ID,
        listing_id: DEMO_IDS.LISTING_PALM_VILLA,
        state: "draft",
        current_version: 1,
        created_by: DEMO_REALTOR_ID,
      },
      {
        id: DEMO_IDS.MEMO_SENT,
        tenant_id: DEMO_TENANT_ID,
        investor_id: DEMO_INVESTOR_2_ID,
        listing_id: DEMO_IDS.LISTING_CREEK_TOWER,
        state: "sent",
        current_version: 1,
        created_by: DEMO_REALTOR_ID,
      },
      {
        id: DEMO_IDS.MEMO_APPROVED,
        tenant_id: DEMO_TENANT_ID,
        investor_id: DEMO_INVESTOR_1_ID,
        listing_id: DEMO_IDS.LISTING_BLUEWATERS_UNIT,
        state: "decided",
        current_version: 1,
        created_by: DEMO_REALTOR_ID,
      },
    ])

    await supabase.from("memo_versions").insert([
      {
        id: "demo-memv-001",
        memo_id: DEMO_IDS.MEMO_DRAFT,
        version: 1,
        content: {
          title: "Investment Memo - Palm Jumeirah Signature Villa",
          summary: "Premium beachfront asset with strong capital appreciation potential.",
          recommendation: "PROCEED",
          keyMetrics: { askingPrice: 42000000, targetCapRate: 5.7, targetIRR: 12.5, holdPeriod: 5 },
        },
        created_by: DEMO_REALTOR_ID,
      },
      {
        id: "demo-memv-002",
        memo_id: DEMO_IDS.MEMO_SENT,
        version: 1,
        content: {
          title: "Investment Memo - Dubai Creek Harbour Residence",
          summary: "Emerging area with significant infrastructure investment.",
          recommendation: "PROCEED WITH CAUTION",
          keyMetrics: { askingPrice: 6800000, targetCapRate: 6.6, targetIRR: 18.2, holdPeriod: 4 },
        },
        created_by: DEMO_REALTOR_ID,
      },
      {
        id: "demo-memv-003",
        memo_id: DEMO_IDS.MEMO_APPROVED,
        version: 1,
        content: {
          title: "Investment Memo - Bluewaters Island 2BR",
          summary: "Trophy asset in iconic location with strong tourism-driven demand.",
          recommendation: "PROCEED",
          keyMetrics: { askingPrice: 5200000, targetCapRate: 6.5, targetIRR: 14.8, holdPeriod: 5 },
        },
        created_by: DEMO_REALTOR_ID,
      },
    ])

    // 8. Create tasks
    const now = new Date()
    await supabase.from("tasks").insert([
      {
        id: "demo-tsk-001",
        tenant_id: DEMO_TENANT_ID,
        title: "Complete snagging list for Palm Villa",
        description: "Review and resolve 3 minor items identified in inspection report",
        status: "in-progress",
        priority: "high",
        due_date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        assignee_id: DEMO_REALTOR_ID,
        investor_id: DEMO_INVESTOR_1_ID,
        listing_id: DEMO_IDS.LISTING_PALM_VILLA,
        created_by: DEMO_REALTOR_ID,
      },
      {
        id: "demo-tsk-002",
        tenant_id: DEMO_TENANT_ID,
        title: "Schedule DLD appointment",
        description: "Book slot for title transfer at Dubai Land Department",
        status: "open",
        priority: "high",
        due_date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        assignee_id: DEMO_REALTOR_ID,
        investor_id: DEMO_INVESTOR_2_ID,
        listing_id: DEMO_IDS.LISTING_CREEK_TOWER,
        created_by: DEMO_REALTOR_ID,
      },
      {
        id: "demo-tsk-003",
        tenant_id: DEMO_TENANT_ID,
        title: "Prepare Q4 portfolio report",
        description: "Compile quarterly performance report for Al-Rashid portfolio",
        status: "open",
        priority: "medium",
        due_date: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        assignee_id: DEMO_REALTOR_ID,
        investor_id: DEMO_INVESTOR_1_ID,
        created_by: DEMO_REALTOR_ID,
      },
      {
        id: "demo-tsk-004",
        tenant_id: DEMO_TENANT_ID,
        title: "Review new Dubai Marina listings",
        description: "Screen 5 new listings matching Al-Rashid mandate criteria",
        status: "done",
        priority: "medium",
        assignee_id: DEMO_REALTOR_ID,
        investor_id: DEMO_INVESTOR_1_ID,
        created_by: DEMO_REALTOR_ID,
      },
    ])

    // 9. Create market signals
    const signals = [
      { area: "Dubai Marina", signal_type: "price_movement", headline: "Dubai Marina prices up 8.2% YoY", summary: "Average transaction prices increased 8.2% year-over-year.", severity: "medium" },
      { area: "Downtown Dubai", signal_type: "new_supply", headline: "3 new towers launching in Downtown", summary: "Emaar announces 3 new residential towers with completion in 2027.", severity: "low" },
      { area: "Palm Jumeirah", signal_type: "price_movement", headline: "Record villa sale at AED 500M", summary: "New record set for Palm Jumeirah villa sale.", severity: "high" },
      { area: "Business Bay", signal_type: "rental_change", headline: "Office rents up 12% in Business Bay", summary: "Strong corporate demand drives office rental growth.", severity: "high" },
      { area: "JVC", signal_type: "infrastructure", headline: "New metro extension announced for JVC", summary: "RTA confirms metro extension to JVC with completion by 2028.", severity: "high" },
      { area: "Dubai Creek Harbour", signal_type: "development", headline: "Dubai Creek Tower on track for 2027", summary: "Emaar confirms Dubai Creek Tower construction progressing.", severity: "low" },
      { area: "Bluewaters Island", signal_type: "demand_change", headline: "Ain Dubai visitors up 40%", summary: "Tourist footfall to Bluewaters Island up 40%.", severity: "high" },
      { area: "Dubai Marina", signal_type: "regulatory", headline: "New short-term rental regulations", summary: "DTCM introduces updated holiday home regulations.", severity: "medium" },
      { area: "Downtown Dubai", signal_type: "price_movement", headline: "Boulevard units premium at 15%", summary: "Boulevard-facing units command 15% premium.", severity: "medium" },
      { area: "Palm Jumeirah", signal_type: "rental_change", headline: "Villa rents reach new high", summary: "Average Palm Jumeirah villa rents now at AED 1.2M annually.", severity: "high" },
    ]

    const signalInserts = signals.map((s, i) => ({
      id: `demo-sig-${String(i + 1).padStart(3, "0")}`,
      tenant_id: DEMO_TENANT_ID,
      signal_type: s.signal_type,
      area: s.area,
      headline: s.headline,
      summary: s.summary,
      severity: s.severity,
      observed_at: new Date(now.getTime() - (i + 1) * 24 * 60 * 60 * 1000).toISOString(),
    }))
    await supabase.from("market_signal").insert(signalInserts)

    // Return success response
    return NextResponse.json({
      success: true,
      message: "Demo data reset successfully",
      timestamp: new Date().toISOString(),
      summary: {
        tenant: 1,
        users: 2,
        investors: 2,
        listings: 8,
        holdings: 5,
        memos: 3,
        tasks: 4,
        signals: 10,
      },
    })
  } catch (error) {
    console.error("Demo reset error:", error)
    return NextResponse.json(
      {
        error: "Failed to reset demo data",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check demo mode status
export async function GET() {
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true"
  
  return NextResponse.json({
    demoMode: isDemoMode,
    tenantId: isDemoMode ? DEMO_TENANT_ID : null,
  })
}
