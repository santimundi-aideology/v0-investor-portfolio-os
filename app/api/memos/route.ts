import { NextResponse } from "next/server"

import { AuditEvents, createAuditEventWriter } from "@/lib/audit"
import { createMemo } from "@/lib/db/memo-ops"
import { getInvestorById } from "@/lib/db/investors"
import { getSupabaseAdminClient } from "@/lib/db/client"
import { requireAuthContext } from "@/lib/auth/server"
import { AccessError, assertInvestorAccess } from "@/lib/security/rbac"

/**
 * Enrich raw memo rows with title, property info, and evaluation score
 * extracted from the latest memo_version content. This lets the list page
 * render proper titles & thumbnails for property-intake memos that have no
 * listing_id in the DB.
 */
async function enrichMemos(memos: Record<string, unknown>[]): Promise<Record<string, unknown>[]> {
  if (memos.length === 0) return memos
  const supabase = getSupabaseAdminClient()
  const memoIds = memos.map((m) => m.id as string)

  const { data: versions } = await supabase
    .from("memo_versions")
    .select("memo_id, content, version")
    .in("memo_id", memoIds)
    .order("version", { ascending: false })

  // Map memo_id → latest version content (first seen is highest version)
  const contentMap = new Map<string, Record<string, unknown>>()
  for (const v of versions ?? []) {
    const mid = v.memo_id as string
    if (!contentMap.has(mid)) {
      contentMap.set(mid, v.content as Record<string, unknown>)
    }
  }

  return memos.map((memo) => {
    const content = contentMap.get(memo.id as string)
    if (!content) return memo

    const property = content.property as Record<string, unknown> | undefined
    const evaluation = content.evaluation as Record<string, unknown> | undefined
    const source = content.source as Record<string, unknown> | undefined
    const images = property?.images as string[] | undefined

    return {
      ...memo,
      // Attach derived fields the list client can read directly
      title: property?.title
        ? `IC Memo: ${property.title}`
        : typeof evaluation?.headline === "string"
          ? String(evaluation.headline)
          : undefined,
      propertyTitle: property?.title ? String(property.title) : undefined,
      coverImage: images?.[0] ?? null,
      score: evaluation?.score ?? null,
      recommendation: evaluation?.recommendation ?? null,
      listingUrl: source?.listingUrl ?? null,
    }
  })
}

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthContext(req)
    const supabase = getSupabaseAdminClient()
    const tenantId = ctx.tenantId!
    if (ctx.role === "investor") {
      const { data, error } = await supabase
        .from("memos")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("investor_id", ctx.investorId)
      if (error) throw error
      return NextResponse.json(await enrichMemos(data ?? []))
    }
    if (ctx.role === "agent") {
      const { data: investors } = await supabase
        .from("investors")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("assigned_agent_id", ctx.userId)
      const investorIds = (investors ?? []).map((i: { id: string }) => i.id)

      const assignedMemosPromise = investorIds.length
        ? supabase
            .from("memos")
            .select("*")
            .eq("tenant_id", tenantId)
            .in("investor_id", investorIds)
        : Promise.resolve({ data: [], error: null } as const)

      // Property-intake can create unassigned memos (investor_id is null).
      // Show those to the creating agent so they appear in /memos immediately.
      const ownUnassignedMemosPromise = supabase
        .from("memos")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("created_by", ctx.userId)
        .is("investor_id", null)

      const [{ data: assignedMemos, error: assignedError }, { data: ownUnassignedMemos, error: ownError }] =
        await Promise.all([assignedMemosPromise, ownUnassignedMemosPromise])

      if (assignedError) throw assignedError
      if (ownError) throw ownError

      const merged = [...(assignedMemos ?? []), ...(ownUnassignedMemos ?? [])]
      const deduped = Array.from(
        new Map(merged.map((memo) => [String((memo as { id?: unknown }).id), memo])).values(),
      )

      return NextResponse.json(await enrichMemos(deduped as Record<string, unknown>[]))
    }
    const { data, error } = await supabase
      .from("memos")
      .select("*")
      .eq("tenant_id", tenantId)
    if (error) throw error
    return NextResponse.json(await enrichMemos(data ?? []))
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthContext(req)
    const body = await req.json()
    const investor = await getInvestorById(body.investorId)
    if (!investor) throw new AccessError("Investor not found")
    assertInvestorAccess(investor, ctx)

    if (ctx.role === "investor") throw new AccessError("Investors cannot create memos")

    const memo = await createMemo({
      investorId: body.investorId,
      listingId: body.listingId,
      underwritingId: body.underwritingId,
      content: body.content ?? {},
      createdBy: ctx.userId,
    })

    const write = createAuditEventWriter()
    await write(
      AuditEvents.memoCreated({
        tenantId: memo.tenantId,
        actorId: ctx.userId,
        role: ctx.role,
        memoId: memo.id,
      }),
    )

    return NextResponse.json(memo, { status: 201 })
  } catch (err) {
    return handleError(err)
  }
}

function handleError(err: unknown) {
  if (err instanceof AccessError) {
    return NextResponse.json({ error: err.message }, { status: err.status })
  }
  return NextResponse.json({ error: "Internal error" }, { status: 500 })
}

