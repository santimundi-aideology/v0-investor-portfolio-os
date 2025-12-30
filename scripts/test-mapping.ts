#!/usr/bin/env tsx

/**
 * Standalone test script for mapping demo.
 * Run: pnpm tsx scripts/test-mapping.ts
 */

// Mock the server-only module to allow running outside Next.js
const serverOnlyModule = require.cache[require.resolve("server-only")]
if (serverOnlyModule) {
  delete require.cache[require.resolve("server-only")]
}

import { runMapSignalsToInvestorsDemo } from "../jobs/signals/mapSignalsToInvestors.demo"

console.log("\n=== Market Signals Mapping Demo ===\n")
const result = runMapSignalsToInvestorsDemo()
console.log("\n=== Demo Complete ===\n")

console.log("\n📊 Summary:")
console.log(`   Signals processed: ${result.signalsProcessed}`)
console.log(`   Targets created: ${result.targetsCreated}`)
console.log(`   Targets skipped: ${result.targetsSkipped}`)

