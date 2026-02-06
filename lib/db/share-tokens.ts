import "server-only"

import { randomUUID } from "crypto"
import { getSupabaseAdminClient } from "@/lib/db/client"

export type ShareMethod = "whatsapp" | "email" | "link"

export type ShareTokenRow = {
  id: string
  tenant_id: string
  memo_id: string
  investor_id: string
  token: string
  share_method: ShareMethod
  recipient_contact: string | null
  created_by: string | null
  created_at: string
  expires_at: string | null
  opened_at: string | null
  opened_count: number
  last_opened_at: string | null
  clicked_at: string | null
  metadata: Record<string, unknown>
}

export type CreateShareTokenInput = {
  tenantId: string
  memoId: string
  investorId: string
  shareMethod: ShareMethod
  recipientContact?: string
  createdBy?: string
  expiresAt?: Date
  metadata?: Record<string, unknown>
}

/**
 * Create a new share token for a memo
 */
export async function createShareToken(input: CreateShareTokenInput): Promise<ShareTokenRow> {
  const supabase = getSupabaseAdminClient()
  const token = randomUUID()

  const { data, error } = await supabase
    .from("memo_share_tokens")
    .insert({
      tenant_id: input.tenantId,
      memo_id: input.memoId,
      investor_id: input.investorId,
      token,
      share_method: input.shareMethod,
      recipient_contact: input.recipientContact ?? null,
      created_by: input.createdBy ?? null,
      expires_at: input.expiresAt?.toISOString() ?? null,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single()

  if (error) throw error
  return data as ShareTokenRow
}

/**
 * Resolve a share token and track the open
 */
export async function resolveShareToken(token: string): Promise<ShareTokenRow | null> {
  const supabase = getSupabaseAdminClient()

  // First, find the token
  const { data, error } = await supabase
    .from("memo_share_tokens")
    .select("*")
    .eq("token", token)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  // Check if expired
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return null
  }

  // Track the open
  const now = new Date().toISOString()
  const { data: updated, error: updateError } = await supabase
    .from("memo_share_tokens")
    .update({
      opened_at: data.opened_at ?? now,
      opened_count: (data.opened_count ?? 0) + 1,
      last_opened_at: now,
    })
    .eq("id", data.id)
    .select("*")
    .single()

  if (updateError) throw updateError
  return updated as ShareTokenRow
}

/**
 * Track a click-through (when investor views the memo)
 */
export async function trackShareTokenClick(token: string): Promise<void> {
  const supabase = getSupabaseAdminClient()

  const { error } = await supabase
    .from("memo_share_tokens")
    .update({
      clicked_at: new Date().toISOString(),
    })
    .eq("token", token)

  if (error) throw error
}

/**
 * Get share tokens for a memo
 */
export async function getShareTokensForMemo(
  tenantId: string,
  memoId: string
): Promise<ShareTokenRow[]> {
  const supabase = getSupabaseAdminClient()

  const { data, error } = await supabase
    .from("memo_share_tokens")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("memo_id", memoId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as ShareTokenRow[]
}

/**
 * Get share statistics for a memo
 */
export async function getShareStatsForMemo(
  tenantId: string,
  memoId: string
): Promise<{
  totalShares: number
  totalOpens: number
  uniqueOpens: number
  totalClicks: number
  byMethod: Record<ShareMethod, number>
}> {
  const tokens = await getShareTokensForMemo(tenantId, memoId)

  const stats = {
    totalShares: tokens.length,
    totalOpens: tokens.reduce((sum, t) => sum + (t.opened_count ?? 0), 0),
    uniqueOpens: tokens.filter((t) => t.opened_at).length,
    totalClicks: tokens.filter((t) => t.clicked_at).length,
    byMethod: {
      whatsapp: tokens.filter((t) => t.share_method === "whatsapp").length,
      email: tokens.filter((t) => t.share_method === "email").length,
      link: tokens.filter((t) => t.share_method === "link").length,
    },
  }

  return stats
}
