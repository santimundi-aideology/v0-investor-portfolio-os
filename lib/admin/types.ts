// ─── Admin shared types ──────────────────────────────────────

export type AdminStats = {
  totalTenants: number
  activeTenants: number
  totalUsers: number
  activeUsers: number
  usersByRole: { agent: number; manager: number; investor: number; super_admin: number }
  tenantsByPlan: { starter: number; pro: number; enterprise: number }
  tenantsByType: { brokerage: number; developer: number; family_office: number; other: number }
  superadminDomains: number
}

export type Tenant = {
  id: string
  name: string
  plan: string
  type: string | null
  logo_url: string | null
  domain: string | null
  contact_email: string | null
  is_active: boolean | null
  is_demo: boolean | null
  created_at: string
  created_by: string | null
  userCount?: number
}

export type InviteStatus = "pending_invite" | "active" | "inactive"

export type UserRow = {
  id: string
  tenant_id: string | null
  auth_user_id: string | null
  name: string
  email: string
  role: string
  is_active: boolean | null
  is_demo: boolean | null
  created_at: string
  tenantName?: string
  invited_at?: string | null
  email_confirmed_at?: string | null
  auth_last_sign_in_at?: string | null
  invite_status?: InviteStatus
}

export type DomainRow = {
  domain: string
  created_at: string
  created_by: string | null
}

// ─── Constants ───────────────────────────────────────────────

export const TENANT_TYPES = ["brokerage", "developer", "family_office", "other"] as const
export const TENANT_PLANS = ["starter", "pro", "enterprise"] as const
export const USER_ROLES = ["super_admin", "manager", "agent", "investor"] as const
export const ORG_ROLES = ["owner", "admin", "member"] as const

// ─── Helpers ─────────────────────────────────────────────────

export function roleBadgeVariant(role: string) {
  switch (role) {
    case "super_admin":
      return "bg-purple-100 text-purple-800 border-purple-200"
    case "manager":
      return "bg-blue-100 text-blue-800 border-blue-200"
    case "agent":
      return "bg-green-100 text-green-800 border-green-200"
    case "investor":
      return "bg-amber-100 text-amber-800 border-amber-200"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

export function statusBadgeVariant(active: boolean | null) {
  return active
    ? "bg-green-100 text-green-800 border-green-200"
    : "bg-red-100 text-red-700 border-red-200"
}

export function inviteStatusBadgeVariant(status: InviteStatus | undefined) {
  switch (status) {
    case "pending_invite":
      return "bg-yellow-100 text-yellow-800 border-yellow-200"
    case "active":
      return "bg-green-100 text-green-800 border-green-200"
    case "inactive":
      return "bg-red-100 text-red-700 border-red-200"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

export function inviteStatusLabel(status: InviteStatus | undefined) {
  switch (status) {
    case "pending_invite":
      return "Pending Invite"
    case "active":
      return "Active"
    case "inactive":
      return "Inactive"
    default:
      return "Unknown"
  }
}

export function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "-"
  return new Date(dateStr).toLocaleDateString()
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export function typeLabel(type: string | null) {
  if (!type) return "-"
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
