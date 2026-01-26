import { getSupabaseAdminClient } from "@/lib/db/client"
import type { MemoData, MemoVersion, MemoContent } from "@/lib/ai/memo-context"

type MemoRow = {
  id: string
  tenant_id: string
  investor_id: string
  listing_id: string | null
  underwriting_id: string | null
  state: string
  current_version: number
  created_by: string | null
  created_at: string
  updated_at: string
}

type MemoVersionRow = {
  id: string
  memo_id: string
  version: number
  content: MemoContent | null
  created_by: string | null
  created_at: string
}

function mapVersionRow(row: MemoVersionRow): MemoVersion {
  return {
    version: row.version,
    content: row.content ?? {},
    createdAt: row.created_at,
    createdBy: row.created_by ?? "unknown",
  }
}

function mapMemoRow(row: MemoRow, versions: MemoVersion[]): MemoData {
  return {
    id: row.id,
    investorId: row.investor_id,
    listingId: row.listing_id ?? undefined,
    state: row.state,
    currentVersion: row.current_version,
    versions,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * Fetch a memo by ID, including all its versions
 */
export async function getMemoById(memoId: string): Promise<MemoData | null> {
  const supabase = getSupabaseAdminClient()

  // Fetch memo
  const { data: memoRow, error: memoError } = await supabase
    .from("memos")
    .select("*")
    .eq("id", memoId)
    .maybeSingle()

  if (memoError) throw memoError
  if (!memoRow) return null

  // Fetch versions
  const { data: versionRows, error: versionsError } = await supabase
    .from("memo_versions")
    .select("*")
    .eq("memo_id", memoId)
    .order("version", { ascending: true })

  if (versionsError) throw versionsError

  const versions = (versionRows ?? []).map((row) => mapVersionRow(row as MemoVersionRow))

  return mapMemoRow(memoRow as MemoRow, versions)
}

/**
 * List memos for an investor
 */
export async function listMemosForInvestor(
  tenantId: string,
  investorId: string
): Promise<MemoData[]> {
  const supabase = getSupabaseAdminClient()

  const { data: memoRows, error: memoError } = await supabase
    .from("memos")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("investor_id", investorId)
    .order("updated_at", { ascending: false })

  if (memoError) throw memoError
  if (!memoRows || memoRows.length === 0) return []

  // Fetch all versions for these memos
  const memoIds = memoRows.map((m) => m.id)
  const { data: versionRows, error: versionsError } = await supabase
    .from("memo_versions")
    .select("*")
    .in("memo_id", memoIds)
    .order("version", { ascending: true })

  if (versionsError) throw versionsError

  // Group versions by memo_id
  const versionsByMemo = new Map<string, MemoVersion[]>()
  for (const row of versionRows ?? []) {
    const memoId = row.memo_id as string
    if (!versionsByMemo.has(memoId)) {
      versionsByMemo.set(memoId, [])
    }
    versionsByMemo.get(memoId)!.push(mapVersionRow(row as MemoVersionRow))
  }

  return memoRows.map((row) =>
    mapMemoRow(row as MemoRow, versionsByMemo.get(row.id) ?? [])
  )
}
