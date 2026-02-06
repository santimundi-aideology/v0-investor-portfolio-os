import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { alertRuleSchema, alertRuleUpdateSchema } from "@/lib/validation/schemas"
import { validateRequest } from "@/lib/validation/helpers"

/**
 * GET /api/investors/[id]/alerts
 * List all alert rules for an investor
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const investorId = (await params).id
  const supabase = getSupabaseAdminClient()

  try {
    const { data, error } = await supabase
      .from("investor_alert_rules")
      .select("*")
      .eq("investor_id", investorId)
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ rules: data || [] })
  } catch (err) {
    console.error("[alerts] Error fetching rules:", err)
    return NextResponse.json({ error: "Failed to fetch alert rules" }, { status: 500 })
  }
}

/**
 * POST /api/investors/[id]/alerts
 * Create a new alert rule
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const investorId = (await params).id
  const supabase = getSupabaseAdminClient()

  try {
    const validation = await validateRequest(req, alertRuleSchema)
    if (!validation.success) {
      return validation.error
    }

    const body = validation.data

    const payload = {
      tenant_id: body.tenantId || "00000000-0000-0000-0000-000000000001",
      investor_id: investorId,
      created_by: body.createdBy || null,
      name: body.name,
      description: body.description || null,
      enabled: body.enabled !== false,
      areas: body.areas || [],
      property_types: body.propertyTypes || [],
      min_price: body.minPrice || null,
      max_price: body.maxPrice || null,
      min_size: body.minSize || null,
      max_size: body.maxSize || null,
      min_bedrooms: body.minBedrooms || null,
      max_bedrooms: body.maxBedrooms || null,
      min_yield_pct: body.minYieldPct || null,
      min_discount_pct: body.minDiscountPct || null,
      price_change_pct: body.priceChangePct || null,
      price_change_direction: body.priceChangeDirection || null,
      min_transaction_volume: body.minTransactionVolume || null,
      notify_whatsapp: body.notifyWhatsapp || false,
      notify_email: body.notifyEmail !== false,
      notify_in_app: body.notifyInApp !== false,
      frequency: body.frequency || "daily",
    }

    const { data, error } = await supabase
      .from("investor_alert_rules")
      .insert(payload)
      .select("*")
      .single()

    if (error) throw error

    return NextResponse.json({ rule: data })
  } catch (err) {
    console.error("[alerts] Error creating rule:", err)
    return NextResponse.json({ error: "Failed to create alert rule" }, { status: 500 })
  }
}

/**
 * PUT /api/investors/[id]/alerts
 * Update an alert rule (rule ID in body)
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const investorId = (await params).id
  const supabase = getSupabaseAdminClient()

  try {
    const validation = await validateRequest(req, alertRuleUpdateSchema)
    if (!validation.success) {
      return validation.error
    }

    const { ruleId, ...updates } = validation.data

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (updates.name !== undefined) payload.name = updates.name
    if (updates.description !== undefined) payload.description = updates.description
    if (updates.enabled !== undefined) payload.enabled = updates.enabled
    if (updates.areas !== undefined) payload.areas = updates.areas
    if (updates.propertyTypes !== undefined) payload.property_types = updates.propertyTypes
    if (updates.minPrice !== undefined) payload.min_price = updates.minPrice
    if (updates.maxPrice !== undefined) payload.max_price = updates.maxPrice
    if (updates.minSize !== undefined) payload.min_size = updates.minSize
    if (updates.maxSize !== undefined) payload.max_size = updates.maxSize
    if (updates.minBedrooms !== undefined) payload.min_bedrooms = updates.minBedrooms
    if (updates.maxBedrooms !== undefined) payload.max_bedrooms = updates.maxBedrooms
    if (updates.minYieldPct !== undefined) payload.min_yield_pct = updates.minYieldPct
    if (updates.minDiscountPct !== undefined) payload.min_discount_pct = updates.minDiscountPct
    if (updates.priceChangePct !== undefined) payload.price_change_pct = updates.priceChangePct
    if (updates.priceChangeDirection !== undefined) payload.price_change_direction = updates.priceChangeDirection
    if (updates.minTransactionVolume !== undefined) payload.min_transaction_volume = updates.minTransactionVolume
    if (updates.notifyWhatsapp !== undefined) payload.notify_whatsapp = updates.notifyWhatsapp
    if (updates.notifyEmail !== undefined) payload.notify_email = updates.notifyEmail
    if (updates.notifyInApp !== undefined) payload.notify_in_app = updates.notifyInApp
    if (updates.frequency !== undefined) payload.frequency = updates.frequency

    const { data, error } = await supabase
      .from("investor_alert_rules")
      .update(payload)
      .eq("id", ruleId)
      .eq("investor_id", investorId)
      .select("*")
      .single()

    if (error) throw error

    return NextResponse.json({ rule: data })
  } catch (err) {
    console.error("[alerts] Error updating rule:", err)
    return NextResponse.json({ error: "Failed to update alert rule" }, { status: 500 })
  }
}

/**
 * DELETE /api/investors/[id]/alerts
 * Delete an alert rule (ruleId as query param)
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const investorId = (await params).id
  const supabase = getSupabaseAdminClient()

  const url = new URL(req.url)
  const ruleId = url.searchParams.get("ruleId")

  if (!ruleId) {
    return NextResponse.json({ error: "ruleId query param is required" }, { status: 400 })
  }

  try {
    const { error } = await supabase
      .from("investor_alert_rules")
      .delete()
      .eq("id", ruleId)
      .eq("investor_id", investorId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[alerts] Error deleting rule:", err)
    return NextResponse.json({ error: "Failed to delete alert rule" }, { status: 500 })
  }
}
