import { NextRequest, NextResponse } from "next/server"
import { requireAuthContext } from "@/lib/auth/server"
import { checkPlanLimit } from "@/lib/plans/usage"
import { getSupabaseAdminClient } from "@/lib/db/client"

/**
 * POST /api/plans/check
 * Check if an action is allowed based on plan limits
 * Body: { limitType: "properties" | "investors" | "users" | "memos" | "aiEvaluations" }
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuthContext(req)
    
    if (!ctx.tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 400 })
    }
    
    const body = await req.json()
    const { limitType } = body
    
    if (!limitType || !["properties", "investors", "users", "memos", "aiEvaluations"].includes(limitType)) {
      return NextResponse.json({ error: "Invalid limitType" }, { status: 400 })
    }
    
    // Get tenant's plan
    const supabase = getSupabaseAdminClient()
    const { data: tenant } = await supabase
      .from("tenants")
      .select("plan")
      .eq("id", ctx.tenantId)
      .single()
    
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 })
    }
    
    const plan = tenant.plan as "starter" | "pro" | "enterprise"
    const result = await checkPlanLimit(ctx.tenantId, plan, limitType)
    
    return NextResponse.json(result)
  } catch (err) {
    console.error("[plans/check] Error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
