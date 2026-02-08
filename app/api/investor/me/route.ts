import { NextResponse } from "next/server"
import { requireAuthContext } from "@/lib/auth/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { AccessError } from "@/lib/security/rbac"

/**
 * GET /api/investor/me
 *
 * Returns the investor record associated with the currently authenticated user.
 * Used by the investor portal to resolve the dynamic investor ID from auth context
 * instead of relying on a hardcoded value.
 */
export async function GET(req: Request) {
  try {
    const ctx = await requireAuthContext(req)

    // requireAuthContext already resolves investorId for investor-role users
    if (ctx.investorId) {
      return NextResponse.json({ investorId: ctx.investorId })
    }

    // For non-investor roles (e.g. agents viewing investor data), look up any
    // investor record they may own. This gracefully returns null.
    const supabase = getSupabaseAdminClient()
    const { data: investor } = await supabase
      .from("investors")
      .select("id")
      .eq("owner_user_id", ctx.userId)
      .maybeSingle()

    return NextResponse.json({ investorId: investor?.id ?? null })
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[investor/me] Error:", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
