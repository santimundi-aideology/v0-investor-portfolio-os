import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError, assertTenantScope } from "@/lib/security/rbac"

/**
 * PATCH /api/listings/[id]/image
 * Body: { imageUrl: string }
 *
 * Updates the primary image for a listing by setting the first image
 * attachment entry in the `attachments` JSON column.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuthContext(req)
    if (ctx.role !== "agent" && ctx.role !== "super_admin") {
      throw new AccessError("Only agents can update listing images")
    }
    assertTenantScope(ctx.tenantId!, ctx)

    const { id } = await params
    const body = await req.json()
    const imageUrl: string | undefined = body.imageUrl

    if (!imageUrl || typeof imageUrl !== "string" || !imageUrl.trim()) {
      return NextResponse.json({ error: "imageUrl is required" }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient()

    // Fetch current attachments so we can preserve non-image entries
    const { data: current, error: fetchError } = await supabase
      .from("listings")
      .select("attachments")
      .eq("id", id)
      .maybeSingle()

    if (fetchError) throw fetchError
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const existingAttachments = (current.attachments as Array<{ type?: string; url?: string }> | null) ?? []

    // Replace the first image attachment; keep all other attachment types
    const nonImageAttachments = existingAttachments.filter(
      (a) => !a.type?.startsWith("image")
    )
    const updatedAttachments = [
      { type: "image/jpeg", url: imageUrl.trim() },
      ...nonImageAttachments,
    ]

    const { error: updateError } = await supabase
      .from("listings")
      .update({ attachments: updatedAttachments, updated_at: new Date().toISOString() })
      .eq("id", id)

    if (updateError) throw updateError

    return NextResponse.json({ ok: true, imageUrl: imageUrl.trim() })
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[listings/image] PATCH error:", err)
    return NextResponse.json({ error: "Failed to update image" }, { status: 500 })
  }
}
