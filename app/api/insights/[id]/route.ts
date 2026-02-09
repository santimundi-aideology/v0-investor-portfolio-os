import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError } from "@/lib/security/rbac"

/**
 * PATCH /api/insights/:id
 * Update an existing insight (status, body, category, etc.)
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuthContext(req)
    const { id } = await params
    const supabase = getSupabaseAdminClient()
    const body = await req.json()

    const updates: Record<string, unknown> = {}
    if (body.status !== undefined) updates.status = body.status
    if (body.title !== undefined) updates.title = body.title
    if (body.bodyText !== undefined) updates.body = body.bodyText
    if (body.category !== undefined) updates.category = body.category

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      )
    }

    const { data: insight, error } = await supabase
      .from("user_insights")
      .update(updates)
      .eq("id", id)
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
    console.error("[insights] PATCH error:", err)
    return NextResponse.json({ error: "Failed to update insight" }, { status: 500 })
  }
}

/**
 * DELETE /api/insights/:id
 * Delete an insight
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuthContext(req)
    const { id } = await params
    const supabase = getSupabaseAdminClient()

    const { error } = await supabase
      .from("user_insights")
      .delete()
      .eq("id", id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[insights] DELETE error:", err)
    return NextResponse.json({ error: "Failed to delete insight" }, { status: 500 })
  }
}
