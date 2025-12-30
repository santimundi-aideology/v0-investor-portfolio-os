import { NextResponse } from "next/server"
import { runMapSignalsToInvestorsDemo } from "@/jobs/signals/mapSignalsToInvestors.demo"

/**
 * GET /api/test-mapping
 * 
 * Runs the mapping demo with mocked data (no database required).
 * Safe to run in development only.
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 })
  }

  try {
    console.log("\n=== Running Market Signals Mapping Demo ===\n")
    const result = await runMapSignalsToInvestorsDemo()
    console.log("\n=== Demo Complete ===\n")
    
    return NextResponse.json({ 
      ok: true, 
      message: "Demo completed successfully. Check the terminal/console for detailed output.",
      result 
    }, { status: 200 })
  } catch (e) {
    const error = e as Error
    console.error("Demo failed:", error)
    return NextResponse.json({ 
      ok: false, 
      error: error?.message ?? String(e) 
    }, { status: 500 })
  }
}

