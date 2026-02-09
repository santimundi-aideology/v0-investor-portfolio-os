import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError } from "@/lib/security/rbac"

/**
 * GET /api/insights
 * Returns user insights, optionally filtered by page_path
 */
export async function GET(req: Request) {
  try {
    const ctx = await requireAuthContext(req)
    const supabase = getSupabaseAdminClient()

    const { searchParams } = new URL(req.url)
    const pagePath = searchParams.get("pagePath")
    const status = searchParams.get("status")
    const limit = Number(searchParams.get("limit") || "100")

    let query = supabase
      .from("user_insights")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit)

    // Optionally scope to tenant
    if (ctx.tenantId) {
      query = query.or(`tenant_id.eq.${ctx.tenantId},tenant_id.is.null`)
    }

    if (pagePath) {
      query = query.eq("page_path", pagePath)
    }

    if (status && status !== "all") {
      query = query.eq("status", status)
    }

    const { data: insights, error } = await query

    if (error) throw error

    // Transform snake_case DB columns to camelCase for the frontend
    const transformed = (insights || []).map((row) => ({
      id: row.id,
      tenantId: row.tenant_id,
      userId: row.user_id,
      pagePath: row.page_path,
      elementSelector: row.element_selector,
      elementText: row.element_text,
      elementRect: row.element_rect,
      category: row.category,
      status: row.status,
      title: row.title,
      body: row.body,
      screenshotUrl: row.screenshot_url,
      metadata: row.metadata,
      userName: row.user_name,
      userEmail: row.user_email,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))

    return NextResponse.json({ insights: transformed })
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[insights] GET error:", err)
    return NextResponse.json({ error: "Failed to fetch insights" }, { status: 500 })
  }
}

/**
 * POST /api/insights
 * Create a new user insight
 */
export async function POST(req: Request) {
  try {
    const ctx = await requireAuthContext(req)
    const supabase = getSupabaseAdminClient()
    const body = await req.json()

    const {
      pagePath,
      elementSelector,
      elementText,
      elementRect,
      category = "suggestion",
      title,
      bodyText,
      metadata,
    } = body

    if (!pagePath || !title) {
      return NextResponse.json(
        { error: "pagePath and title are required" },
        { status: 400 }
      )
    }

    // Get user info for denormalized fields
    const { data: userData } = await supabase
      .from("users")
      .select("name, email")
      .eq("id", ctx.userId)
      .single()

    const { data: insight, error } = await supabase
      .from("user_insights")
      .insert({
        tenant_id: ctx.tenantId || null,
        user_id: ctx.userId,
        page_path: pagePath,
        element_selector: elementSelector || null,
        element_text: elementText || null,
        element_rect: elementRect || null,
        category,
        status: "open",
        title,
        body: bodyText || null,
        metadata: metadata || {},
        user_name: userData?.name || null,
        user_email: userData?.email || null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      insight: {
        id: insight.id,
        tenantId: insight.tenant_id,
        userId: insight.user_id,
        pagePath: insight.page_path,
        elementSelector: insight.element_selector,
        elementText: insight.element_text,
        elementRect: insight.element_rect,
        category: insight.category,
        status: insight.status,
        title: insight.title,
        body: insight.body,
        screenshotUrl: insight.screenshot_url,
        metadata: insight.metadata,
        userName: insight.user_name,
        userEmail: insight.user_email,
        createdAt: insight.created_at,
        updatedAt: insight.updated_at,
      },
    })
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[insights] POST error:", err)
    return NextResponse.json({ error: "Failed to create insight" }, { status: 500 })
  }
}
