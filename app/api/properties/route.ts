import { NextRequest, NextResponse } from "next/server"
import { requireAuthContext } from "@/lib/auth/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { canAddProperty } from "@/lib/plans/usage"
import type { PlanTier } from "@/lib/plans/config"

/**
 * POST /api/properties
 * Create a new property (checks plan limits)
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuthContext(req)
    
    if (!ctx.tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 400 })
    }
    
    const supabase = getSupabaseAdminClient()
    
    // Get tenant's plan
    const { data: tenant } = await supabase
      .from("tenants")
      .select("plan")
      .eq("id", ctx.tenantId)
      .single()
    
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 })
    }
    
    const plan = tenant.plan as PlanTier
    
    // Check if tenant can add more properties
    const canAdd = await canAddProperty(ctx.tenantId, plan)
    
    if (!canAdd.allowed) {
      return NextResponse.json(
        {
          error: "Property limit reached",
          limitReached: true,
          current: canAdd.current,
          limit: canAdd.limit,
          plan,
          message: `You've reached your plan limit of ${canAdd.limit} properties. Upgrade to add more.`,
        },
        { status: 429 }
      )
    }
    
    const body = await req.json()
    const {
      title,
      area,
      price,
      size,
      bedrooms,
      bathrooms,
      propertyType,
      // ... other fields
    } = body
    
    // Validate required fields
    if (!title || !area) {
      return NextResponse.json(
        { error: "Missing required fields: title, area" },
        { status: 400 }
      )
    }
    
    // Create the property
    const { data: property, error } = await supabase
      .from("listings")
      .insert({
        tenant_id: ctx.tenantId,
        title,
        area,
        price,
        size,
        bedrooms,
        bathrooms,
        type: propertyType,
        status: "available",
        readiness: "DRAFT",
        created_at: new Date().toISOString(),
      })
      .select()
      .single()
    
    if (error) {
      console.error("Error creating property:", error)
      return NextResponse.json(
        { error: "Failed to create property" },
        { status: 500 }
      )
    }
    
    // Log the action
    try {
      await supabase.rpc("log_property_intake_action", {
        p_tenant_id: ctx.tenantId,
        p_user_id: ctx.userId,
        p_listing_id: property.id,
        p_action: "manual_create",
        p_details: {
          title,
          area,
          price,
        },
      })
    } catch (logError) {
      console.error("Failed to log property creation:", logError)
      // Don't fail the request
    }
    
    return NextResponse.json({
      success: true,
      property,
    })
  } catch (err) {
    console.error("[properties] Error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/properties
 * List properties for current tenant
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuthContext(req)
    
    if (!ctx.tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 400 })
    }
    
    const supabase = getSupabaseAdminClient()
    
    // Get query parameters
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")
    
    // Build query
    let query = supabase
      .from("listings")
      .select("*", { count: "exact" })
      .eq("tenant_id", ctx.tenantId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (status) {
      query = query.eq("status", status)
    }
    
    const { data: properties, error, count } = await query
    
    if (error) {
      console.error("Error fetching properties:", error)
      return NextResponse.json(
        { error: "Failed to fetch properties" },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      properties,
      total: count || 0,
      limit,
      offset,
    })
  } catch (err) {
    console.error("[properties] Error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
