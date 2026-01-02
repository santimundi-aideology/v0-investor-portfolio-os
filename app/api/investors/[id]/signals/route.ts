import "server-only"

import { NextResponse } from "next/server"

import { getSupabaseAdminClient } from "@/lib/db/client"

/**
 * GET /api/investors/:id/signals
 *
 * Returns signals mapped to a specific investor (via `market_signal_target`)
 * including relevance score and target status.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: investorId } = await params
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get("tenantId") ?? req.headers.get("x-tenant-id")
    if (!tenantId) return NextResponse.json({ ok: false, error: "tenantId required" }, { status: 400 })

    const supabase = getSupabaseAdminClient()

    type TargetRow = {
      signal_id: string
      relevance_score: number
      status: string
      created_at: string
    }

    // Fetch targets (most recent first)
    const { data: targets, error: tErr } = await supabase
      .from("market_signal_target")
      .select("signal_id, relevance_score, status, created_at")
      .eq("org_id", tenantId)
      .eq("investor_id", investorId)
      .order("created_at", { ascending: false })
      .limit(100)

    if (tErr) throw tErr
    const targetRows = (targets ?? []) as TargetRow[]
    const ids = targetRows.map((t) => t.signal_id).filter(Boolean)
    if (ids.length === 0) return NextResponse.json({ ok: true, tenantId, investorId, signals: [] }, { status: 200 })

    const { data: signals, error: sErr } = await supabase
      .from("market_signal")
      .select("*")
      .eq("org_id", tenantId)
      .in("id", ids)

    if (sErr) throw sErr

    const signalMap = new Map((signals ?? []).map((s: Record<string, unknown>) => [String(s.id), s]))
    const out = targetRows.map((t) => ({
      target: {
        signalId: t.signal_id,
        relevanceScore: t.relevance_score,
        status: t.status,
        createdAt: t.created_at,
      },
      signal: signalMap.get(t.signal_id) ?? null,
    }))

    return NextResponse.json({ ok: true, tenantId, investorId, signals: out }, { status: 200 })
  } catch (e) {
    const error = e as Error
    return NextResponse.json({ ok: false, error: error?.message ?? String(e) }, { status: 500 })
  }
}


