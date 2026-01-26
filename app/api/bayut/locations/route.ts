import { NextResponse } from "next/server"
import { searchLocations } from "@/lib/api/bayut"

/**
 * GET /api/bayut/locations - Search for locations
 * Query params:
 * - query: Search query (e.g., "Dubai Marina")
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get("query")

    if (!query) {
      return NextResponse.json({ 
        error: "Query parameter is required",
        example: "/api/bayut/locations?query=Dubai Marina"
      }, { status: 400 })
    }

    const locations = await searchLocations(query)

    // Group by level for easier use
    const grouped = {
      communities: locations.results?.filter(l => l.level === "community") || [],
      sub_communities: locations.results?.filter(l => l.level === "sub_community") || [],
      other: locations.results?.filter(l => !["community", "sub_community"].includes(l.level)) || [],
    }

    return NextResponse.json({
      query,
      total: locations.results?.length || 0,
      locations: grouped,
    })
  } catch (error) {
    console.error("Bayut locations error:", error)
    return NextResponse.json({ 
      error: "Failed to search locations",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
