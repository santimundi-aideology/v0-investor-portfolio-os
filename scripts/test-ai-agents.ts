/**
 * Test Script for AI Agents + Supabase Integration
 * 
 * This script tests the AI agent data flow from Supabase to AI responses.
 * Run with: npx tsx scripts/test-ai-agents.ts
 */

import { getInvestorById } from "../lib/db/investors"
import { getHoldingsByInvestor, getPortfolioSummary } from "../lib/db/holdings"
import { listListings } from "../lib/db/listings"
import { buildAIContext } from "../lib/ai/context"
import { getSupabaseAdminClient } from "../lib/db/client"

// These will be populated dynamically by finding the demo data
let DEMO_TENANT_ID: string | null = null
let DEMO_INVESTOR_ID: string | null = null

async function findDemoData() {
  console.log("\n🔎 Finding demo data in database...\n")
  
  const supabase = getSupabaseAdminClient()
  
  try {
    // Find tenant
    const { data: tenants } = await supabase
      .from("tenants")
      .select("id, name")
      .eq("name", "Demo Real Estate Agency")
      .limit(1)
    
    if (tenants && tenants.length > 0) {
      DEMO_TENANT_ID = tenants[0].id
      console.log(`✅ Found tenant: ${tenants[0].name} (${DEMO_TENANT_ID})`)
    }
    
    // Find investor
    const { data: investors } = await supabase
      .from("investors")
      .select("id, name, email")
      .eq("email", "mohammed@alrashid.ae")
      .limit(1)
    
    if (investors && investors.length > 0) {
      DEMO_INVESTOR_ID = investors[0].id
      console.log(`✅ Found investor: ${investors[0].name} (${DEMO_INVESTOR_ID})`)
    }
    
    if (!DEMO_TENANT_ID || !DEMO_INVESTOR_ID) {
      console.log("⚠️  Could not find demo data. Have you run seed-holdings.sql?")
      return false
    }
    
    return true
  } catch (error) {
    console.error("❌ Error finding demo data:", error)
    return false
  }
}

async function testDatabaseConnectivity() {
  console.log("\n🔍 Testing Database Connectivity...\n")

  try {
    if (!DEMO_INVESTOR_ID) {
      console.log("❌ No investor ID available")
      return false
    }

    // Test 1: Fetch investor
    console.log("1️⃣ Fetching investor profile...")
    const investor = await getInvestorById(DEMO_INVESTOR_ID)
    
    if (!investor) {
      console.log("❌ No investor found. Have you run the seed script?")
      console.log("   Run: supabase/seed-holdings.sql")
      return false
    }
    
    console.log(`✅ Investor found: ${investor.name}`)
    if (investor.mandate) {
      const mandate = investor.mandate as Record<string, unknown>
      console.log(`   - Preferred areas: ${JSON.stringify(mandate.preferredAreas)}`)
      console.log(`   - Property types: ${JSON.stringify(mandate.propertyTypes)}`)
      console.log(`   - Yield target: ${mandate.yieldTarget}`)
    }

    // Test 2: Fetch holdings
    console.log("\n2️⃣ Fetching holdings...")
    const holdings = await getHoldingsByInvestor(DEMO_INVESTOR_ID)
    
    if (holdings.length === 0) {
      console.log("⚠️  No holdings found. Have you run the seed script?")
      return false
    }
    
    console.log(`✅ Found ${holdings.length} holding(s)`)
    for (const holding of holdings) {
      const yieldPct = ((holding.monthlyRent * 12 * holding.occupancyRate - holding.annualExpenses) / holding.currentValue * 100)
      console.log(`   - Property ${holding.listingId.slice(0, 8)}: AED ${holding.currentValue.toLocaleString()} (yield: ${yieldPct.toFixed(2)}%)`)
    }

    // Test 3: Portfolio summary
    console.log("\n3️⃣ Calculating portfolio summary...")
    const summary = await getPortfolioSummary(DEMO_INVESTOR_ID)
    
    console.log(`✅ Portfolio Analytics:`)
    console.log(`   - Total Value: AED ${Math.round(summary.totalValue).toLocaleString()}`)
    console.log(`   - Total Cost: AED ${Math.round(summary.totalPurchaseCost).toLocaleString()}`)
    console.log(`   - Appreciation: ${summary.appreciationPct.toFixed(2)}%`)
    console.log(`   - Avg Yield: ${summary.avgYieldPct.toFixed(2)}%`)
    console.log(`   - Avg Occupancy: ${summary.avgOccupancyPct.toFixed(1)}%`)
    console.log(`   - Monthly Income: AED ${Math.round(summary.totalMonthlyRental).toLocaleString()}`)

    // Test 4: Fetch listings
    console.log("\n4️⃣ Fetching available listings...")
    const listings = await listListings(DEMO_TENANT_ID!)
    const available = listings.filter(l => l.status === "available")
    
    console.log(`✅ Found ${available.length} available listing(s)`)
    for (const listing of available.slice(0, 3)) {
      const estYield = listing.expectedRent && listing.price 
        ? ((listing.expectedRent * 12) / listing.price * 100).toFixed(1) 
        : "N/A"
      console.log(`   - ${listing.title}: AED ${listing.price?.toLocaleString()} (est. yield: ${estYield}%)`)
    }

    return true
  } catch (error) {
    console.error("\n❌ Database test failed:", error)
    console.log("\n💡 Troubleshooting:")
    console.log("   1. Check .env.local has SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
    console.log("   2. Run migration: supabase/migrations/003_holdings.sql")
    console.log("   3. Run seed script: supabase/seed-holdings.sql")
    return false
  }
}

async function testAIContextBuilder() {
  console.log("\n🤖 Testing AI Context Builder...\n")

  try {
    if (!DEMO_INVESTOR_ID || !DEMO_TENANT_ID) {
      console.log("❌ Missing tenant or investor ID")
      return false
    }

    console.log("Building AI context...")
    const context = await buildAIContext({
      investorId: DEMO_INVESTOR_ID,
      tenantId: DEMO_TENANT_ID,
      includePortfolio: true,
      includeListings: true,
      includeMarket: true,
    })

    if (!context.investor) {
      console.log("❌ Context missing investor data")
      return false
    }

    console.log(`✅ AI Context built successfully`)
    console.log(`   - Investor: ${context.investor.name}`)
    console.log(`   - Portfolio included: ${context.portfolio ? "Yes" : "No"}`)
    console.log(`   - Listings included: ${context.listings ? "Yes" : "No"}`)
    console.log(`   - Context text length: ${context.contextText.length} chars`)

    if (context.portfolio) {
      console.log(`\n📊 Portfolio in Context:`)
      console.log(`   - Properties: ${context.portfolio.summary.propertyCount}`)
      console.log(`   - Value: AED ${Math.round(context.portfolio.summary.totalValue).toLocaleString()}`)
      console.log(`   - Yield: ${context.portfolio.summary.avgYieldPct.toFixed(2)}%`)
    }

    console.log(`\n📝 Sample Context Text (first 500 chars):`)
    console.log("---")
    console.log(context.contextText.slice(0, 500))
    console.log("...")
    console.log("---")

    return true
  } catch (error) {
    console.error("\n❌ AI Context test failed:", error)
    return false
  }
}

async function testRecommendationLogic() {
  console.log("\n💡 Testing Recommendation Logic...\n")

  try {
    if (!DEMO_INVESTOR_ID || !DEMO_TENANT_ID) {
      console.log("❌ Missing tenant or investor ID")
      return false
    }

    const investor = await getInvestorById(DEMO_INVESTOR_ID)
    const listings = await listListings(DEMO_TENANT_ID)
    const available = listings.filter(l => l.status === "available")

    if (!investor || available.length === 0) {
      console.log("⚠️  Skipping: No investor or listings found")
      return true
    }

    const mandate = investor.mandate as Record<string, unknown> | undefined
    console.log("Filtering listings by mandate...")

    let matches = available
    
    // Filter by preferred areas
    if (mandate?.preferredAreas && Array.isArray(mandate.preferredAreas)) {
      matches = matches.filter(l => 
        l.area && mandate.preferredAreas!.includes(l.area)
      )
      console.log(`✅ After area filter: ${matches.length} properties`)
    }

    // Filter by property types
    if (mandate?.propertyTypes && Array.isArray(mandate.propertyTypes)) {
      matches = matches.filter(l => 
        l.type && mandate.propertyTypes!.includes(l.type)
      )
      console.log(`✅ After type filter: ${matches.length} properties`)
    }

    // Calculate yields
    console.log(`\n📈 Top Recommendations:`)
    for (const listing of matches.slice(0, 3)) {
      const estYield = listing.expectedRent && listing.price 
        ? ((listing.expectedRent * 12) / listing.price * 100)
        : 0
      
      console.log(`   - ${listing.title}`)
      console.log(`     Area: ${listing.area}`)
      console.log(`     Price: AED ${listing.price?.toLocaleString()}`)
      console.log(`     Est. Yield: ${estYield.toFixed(2)}%`)
      console.log(`     Match: ✓ Area, ✓ Type`)
      console.log()
    }

    return true
  } catch (error) {
    console.error("\n❌ Recommendation test failed:", error)
    return false
  }
}

async function runAllTests() {
  console.log("=" .repeat(60))
  console.log("🧪 AI AGENTS + SUPABASE INTEGRATION TEST")
  console.log("=" .repeat(60))

  const results = {
    findData: false,
    database: false,
    aiContext: false,
    recommendations: false,
  }

  // Find demo data first
  results.findData = await findDemoData()
  
  if (!results.findData) {
    console.log("\n❌ Could not find demo data. Stopping tests.")
    console.log("\n💡 Make sure you've run:")
    console.log("   1. supabase/migrations/003_holdings.sql")
    console.log("   2. supabase/seed-holdings.sql")
    
    console.log("\n" + "=" .repeat(60))
    console.log("📋 TEST SUMMARY")
    console.log("=" .repeat(60))
    console.log(`Find Demo Data: ❌ FAIL`)
    console.log("=" .repeat(60) + "\n")
    process.exit(1)
  }

  // Run tests
  results.database = await testDatabaseConnectivity()
  
  if (results.database) {
    results.aiContext = await testAIContextBuilder()
    results.recommendations = await testRecommendationLogic()
  }

  // Summary
  console.log("\n" + "=" .repeat(60))
  console.log("📋 TEST SUMMARY")
  console.log("=" .repeat(60))
  console.log(`Find Demo Data: ${results.findData ? "✅ PASS" : "❌ FAIL"}`)
  console.log(`Database Connectivity: ${results.database ? "✅ PASS" : "❌ FAIL"}`)
  console.log(`AI Context Builder: ${results.aiContext ? "✅ PASS" : "❌ FAIL"}`)
  console.log(`Recommendation Logic: ${results.recommendations ? "✅ PASS" : "❌ FAIL"}`)

  const allPassed = Object.values(results).every(r => r === true)
  
  console.log("\n" + "=" .repeat(60))
  if (allPassed) {
    console.log("🎉 ALL TESTS PASSED! AI agents are ready to use.")
    console.log("\n📝 Demo Data IDs (save these for testing):")
    console.log(`   Tenant ID: ${DEMO_TENANT_ID}`)
    console.log(`   Investor ID: ${DEMO_INVESTOR_ID}`)
    console.log("\n💡 Next steps:")
    console.log("   1. Start your dev server: pnpm dev")
    console.log("   2. Navigate to /properties or /real-estate")
    console.log("   3. Open the AI chat and ask questions!")
    console.log("\n🧪 Test the chat API:")
    console.log(`   curl -X POST http://localhost:3000/api/chat \\`)
    console.log(`     -H "Content-Type: application/json" \\`)
    console.log(`     -d '{"agentId":"real_estate_advisor","messages":[{"role":"user","content":"What is my yield?"}],"scopedInvestorId":"${DEMO_INVESTOR_ID}","tenantId":"${DEMO_TENANT_ID}"}'`)
  } else {
    console.log("⚠️  SOME TESTS FAILED. Check the errors above.")
    console.log("\n💡 Troubleshooting:")
    console.log("   1. Ensure .env.local has correct Supabase credentials")
    console.log("   2. Run: supabase/migrations/003_holdings.sql")
    console.log("   3. Run: supabase/seed-holdings.sql")
    console.log("   4. Check Supabase Dashboard for any issues")
  }
  console.log("=" .repeat(60) + "\n")

  process.exit(allPassed ? 0 : 1)
}

// Run if called directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error("Fatal error:", error)
    process.exit(1)
  })
}

