import "server-only"
import { getSupabaseAdminClient } from "./client"

export type TaskRecord = {
  id: string
  tenantId: string
  title: string
  description?: string
  status: "open" | "in-progress" | "done"
  priority: "low" | "medium" | "high"
  dueDate?: string
  assigneeId?: string
  investorId?: string
  listingId?: string
  createdBy?: string
  createdAt: string
  updatedAt: string
}

function mapTaskRow(row: Record<string, unknown>): TaskRecord {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    title: row.title as string,
    description: row.description as string | undefined,
    status: row.status as "open" | "in-progress" | "done",
    priority: row.priority as "low" | "medium" | "high",
    dueDate: row.due_date as string | undefined,
    assigneeId: row.assignee_id as string | undefined,
    investorId: row.investor_id as string | undefined,
    listingId: row.listing_id as string | undefined,
    createdBy: row.created_by as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

/**
 * List all tasks for a tenant
 */
export async function listTasksByTenant(tenantId: string): Promise<TaskRecord[]> {
  const supabase = getSupabaseAdminClient()

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("due_date", { ascending: true, nullsFirst: false })

  if (error) throw error
  return (data ?? []).map(mapTaskRow)
}

/**
 * List tasks assigned to a specific user
 */
export async function listTasksByAssignee(tenantId: string, assigneeId: string): Promise<TaskRecord[]> {
  const supabase = getSupabaseAdminClient()

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("assignee_id", assigneeId)
    .order("due_date", { ascending: true, nullsFirst: false })

  if (error) throw error
  return (data ?? []).map(mapTaskRow)
}

/**
 * List tasks related to a specific investor
 */
export async function listTasksByInvestor(tenantId: string, investorId: string): Promise<TaskRecord[]> {
  const supabase = getSupabaseAdminClient()

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("investor_id", investorId)
    .order("due_date", { ascending: true, nullsFirst: false })

  if (error) throw error
  return (data ?? []).map(mapTaskRow)
}

/**
 * Get a single task by ID
 */
export async function getTaskById(id: string): Promise<TaskRecord | null> {
  const supabase = getSupabaseAdminClient()

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error) throw error
  return data ? mapTaskRow(data) : null
}

/**
 * Create a new task
 */
export async function createTask(
  input: Omit<TaskRecord, "id" | "createdAt" | "updatedAt">
): Promise<TaskRecord | null> {
  const supabase = getSupabaseAdminClient()

  const payload = {
    tenant_id: input.tenantId,
    title: input.title,
    description: input.description ?? null,
    status: input.status ?? "open",
    priority: input.priority ?? "medium",
    due_date: input.dueDate ?? null,
    assignee_id: input.assigneeId ?? null,
    investor_id: input.investorId ?? null,
    listing_id: input.listingId ?? null,
    created_by: input.createdBy ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert(payload)
    .select("*")
    .maybeSingle()

  if (error) throw error
  return data ? mapTaskRow(data) : null
}

/**
 * Update an existing task
 */
export async function updateTask(
  id: string,
  patch: Partial<Omit<TaskRecord, "id" | "tenantId" | "createdAt" | "updatedAt">>
): Promise<TaskRecord | null> {
  const supabase = getSupabaseAdminClient()

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (patch.title !== undefined) payload.title = patch.title
  if (patch.description !== undefined) payload.description = patch.description
  if (patch.status !== undefined) payload.status = patch.status
  if (patch.priority !== undefined) payload.priority = patch.priority
  if (patch.dueDate !== undefined) payload.due_date = patch.dueDate
  if (patch.assigneeId !== undefined) payload.assignee_id = patch.assigneeId
  if (patch.investorId !== undefined) payload.investor_id = patch.investorId
  if (patch.listingId !== undefined) payload.listing_id = patch.listingId
  if (patch.createdBy !== undefined) payload.created_by = patch.createdBy

  const { data, error } = await supabase
    .from("tasks")
    .update(payload)
    .eq("id", id)
    .select("*")
    .maybeSingle()

  if (error) throw error
  return data ? mapTaskRow(data) : null
}

/**
 * Delete a task
 */
export async function deleteTask(id: string): Promise<boolean> {
  const supabase = getSupabaseAdminClient()

  const { error } = await supabase.from("tasks").delete().eq("id", id)

  if (error) throw error
  return true
}

/**
 * Get tasks due soon (within specified days)
 */
export async function getTasksDueSoon(tenantId: string, daysAhead: number = 7): Promise<TaskRecord[]> {
  const supabase = getSupabaseAdminClient()

  const today = new Date().toISOString().split("T")[0]
  const futureDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("tenant_id", tenantId)
    .neq("status", "done")
    .gte("due_date", today)
    .lte("due_date", futureDate)
    .order("due_date", { ascending: true })

  if (error) throw error
  return (data ?? []).map(mapTaskRow)
}

/**
 * Get overdue tasks
 */
export async function getOverdueTasks(tenantId: string): Promise<TaskRecord[]> {
  const supabase = getSupabaseAdminClient()

  const today = new Date().toISOString().split("T")[0]

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("tenant_id", tenantId)
    .neq("status", "done")
    .lt("due_date", today)
    .order("due_date", { ascending: true })

  if (error) throw error
  return (data ?? []).map(mapTaskRow)
}
