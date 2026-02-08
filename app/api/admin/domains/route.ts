import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError, AuthenticationError } from "@/lib/security/rbac"

/**
 * GET /api/admin/domains
 *
 * Lists all superadmin domains. Only super_admin can access.
 */
export async function GET(req: Request) {
  try {
    const ctx = await requireAuthContext(req)

    if (ctx.role !== "super_admin") {
      return NextResponse.json(
        { error: "Only super admins can manage domains" },
        { status: 403 }
      )
    }

    const supabase = getSupabaseAdminClient()

    const { data: domains, error } = await supabase
      .from("superadmin_domains")
      .select("domain, created_at, created_by")
      .order("domain")

    if (error) {
      console.error("Error fetching domains:", error)
      return NextResponse.json({ error: "Failed to fetch domains" }, { status: 500 })
    }

    return NextResponse.json({ domains: domains ?? [] })
  } catch (err) {
    if (err instanceof AuthenticationError) {
      return NextResponse.json({ error: err.message }, { status: 401 })
    }
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    console.error("Unexpected error in GET /api/admin/domains:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * POST /api/admin/domains
 *
 * Adds a new superadmin domain. Only super_admin can access.
 * Body: { domain: string }
 */
export async function POST(req: Request) {
  try {
    const ctx = await requireAuthContext(req)

    if (ctx.role !== "super_admin") {
      return NextResponse.json(
        { error: "Only super admins can manage domains" },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { domain } = body

    if (!domain || typeof domain !== "string") {
      return NextResponse.json({ error: "Domain is required" }, { status: 400 })
    }

    const trimmed = domain.trim().toLowerCase()

    // Validate domain format: must contain a dot, no @
    if (!trimmed.includes(".") || trimmed.includes("@")) {
      return NextResponse.json(
        { error: "Invalid domain format. Must contain a dot and no @ symbol." },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdminClient()

    const { data: inserted, error } = await supabase
      .from("superadmin_domains")
      .insert({ domain: trimmed, created_by: ctx.userId })
      .select("domain, created_at, created_by")
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Domain already exists" }, { status: 409 })
      }
      console.error("Error adding domain:", error)
      return NextResponse.json({ error: "Failed to add domain" }, { status: 500 })
    }

    return NextResponse.json({ domain: inserted }, { status: 201 })
  } catch (err) {
    if (err instanceof AuthenticationError) {
      return NextResponse.json({ error: err.message }, { status: 401 })
    }
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    console.error("Unexpected error in POST /api/admin/domains:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/domains
 *
 * Removes a superadmin domain. Only super_admin can access.
 * Prevents removing the last domain (safety check).
 * Body: { domain: string }
 */
export async function DELETE(req: Request) {
  try {
    const ctx = await requireAuthContext(req)

    if (ctx.role !== "super_admin") {
      return NextResponse.json(
        { error: "Only super admins can manage domains" },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { domain } = body

    if (!domain || typeof domain !== "string") {
      return NextResponse.json({ error: "Domain is required" }, { status: 400 })
    }

    const trimmed = domain.trim().toLowerCase()
    const supabase = getSupabaseAdminClient()

    // Safety check: prevent removing the last domain
    const { count } = await supabase
      .from("superadmin_domains")
      .select("domain", { count: "exact", head: true })

    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { error: "Cannot remove the last domain. At least one superadmin domain must exist." },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from("superadmin_domains")
      .delete()
      .eq("domain", trimmed)

    if (error) {
      console.error("Error removing domain:", error)
      return NextResponse.json({ error: "Failed to remove domain" }, { status: 500 })
    }

    return NextResponse.json({ message: `Domain "${trimmed}" removed successfully` })
  } catch (err) {
    if (err instanceof AuthenticationError) {
      return NextResponse.json({ error: err.message }, { status: 401 })
    }
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    console.error("Unexpected error in DELETE /api/admin/domains:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
