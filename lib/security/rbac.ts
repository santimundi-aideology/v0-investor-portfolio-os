import { getSupabaseAdminClient } from "@/lib/db/client"

export type PlatformRole = "agent" | "manager" | "investor" | "super_admin"

export type RequestContext = {
  tenantId?: string
  userId: string
  role: PlatformRole
  investorId?: string
}

type InvestorScope = {
  id: string
  tenantId: string
  assignedAgentId: string
  ownerUserId?: string | null
}

type MemoScope = {
  tenantId: string
  investorId: string
}

export class AccessError extends Error {
  status = 403
  code = "FORBIDDEN"

  constructor(message: string) {
    super(message)
    this.name = "AccessError"
  }
}

export class AuthenticationError extends AccessError {
  status = 401
  code = "UNAUTHORIZED"

  constructor(message = "Authentication required") {
    super(message)
    this.name = "AuthenticationError"
  }
}

function requireTenantContext(ctx: RequestContext): string {
  if (!ctx.tenantId) {
    if (ctx.role === "super_admin") {
      throw new AccessError("Super admin must select a tenant context before acting")
    }
    throw new AccessError("Tenant context is required")
  }
  return ctx.tenantId
}

export function assertTenantScope(resourceTenantId: string, ctx: RequestContext) {
  const tenantId = requireTenantContext(ctx)
  if (ctx.role !== "super_admin" && resourceTenantId !== tenantId) {
    throw new AccessError("Cross-tenant access denied")
  }
}

export function assertInvestorAccess(investor: InvestorScope, ctx: RequestContext) {
  assertTenantScope(investor.tenantId, ctx)

  switch (ctx.role) {
    case "super_admin":
    case "manager":
      return
    case "agent":
      if (investor.assignedAgentId !== ctx.userId) {
        throw new AccessError("Agents can only access investors assigned to them")
      }
      return
    case "investor": {
      const ownsByUser = investor.ownerUserId && investor.ownerUserId === ctx.userId
      const ownsByInvestorId = ctx.investorId && ctx.investorId === investor.id
      if (ownsByUser || ownsByInvestorId) return
      throw new AccessError("Investors can only access their own records")
    }
    default:
      throw new AccessError("Unknown role")
  }
}

export function assertMemoAccess(memo: MemoScope, ctx: RequestContext, investor?: InvestorScope) {
  assertTenantScope(memo.tenantId, ctx)

  if (ctx.role === "manager" || ctx.role === "super_admin") return
  if (ctx.role === "investor") {
    if (ctx.investorId !== memo.investorId) {
      throw new AccessError("Investors can only access memos linked to their investor record")
    }
    return
  }
  if (ctx.role === "agent") {
    if (!investor) {
      throw new AccessError("Investor context required to validate agent memo access")
    }
    assertInvestorAccess(investor, ctx)
    return
  }
  throw new AccessError("Unknown role")
}

/**
 * Extracts request context from headers (legacy mode).
 * Expected headers:
 *  - x-tenant-id (required for all roles; super_admin must also set it before acting)
 *  - x-user-id (required)
 *  - x-role (agent|manager|investor|super_admin)
 *  - x-investor-id (optional, for investor portal scoping)
 */
export function buildRequestContext(req: Request): RequestContext {
  const role = (req.headers.get("x-role") as PlatformRole | null) ?? "investor"
  const userId = req.headers.get("x-user-id") ?? ""
  const tenantId = req.headers.get("x-tenant-id") ?? undefined
  const investorId = req.headers.get("x-investor-id") ?? undefined

  if (!userId) {
    throw new AccessError("Missing userId in request")
  }

  if (!["agent", "manager", "investor", "super_admin"].includes(role)) {
    throw new AccessError("Invalid role")
  }

  if (role !== "super_admin" && !tenantId) {
    throw new AccessError("Tenant context is required")
  }

  return { tenantId, userId, role, investorId }
}

/**
 * Builds request context from session (authenticated mode).
 * Fetches user data from database using the auth session.
 */
export async function buildSessionContext(authUserId: string): Promise<RequestContext | null> {
  try {
    const supabase = getSupabaseAdminClient()
    
    const { data: user, error } = await supabase
      .from("users")
      .select("id, tenant_id, role, is_active")
      .eq("auth_user_id", authUserId)
      .single()

    if (error || !user) {
      console.error("Failed to get user from session:", error)
      return null
    }

    if (!user.is_active) {
      throw new AccessError("User account is deactivated")
    }

    return {
      tenantId: user.tenant_id,
      userId: user.id,
      role: user.role as PlatformRole,
    }
  } catch (err) {
    if (err instanceof AccessError) throw err
    console.error("Error building session context:", err)
    return null
  }
}

/**
 * Check if user has permission to perform an action.
 */
export function hasPermission(
  ctx: RequestContext, 
  action: "read" | "write" | "delete" | "admin",
  resource: "investors" | "listings" | "memos" | "tasks" | "users" | "settings" | "deal_rooms" | "domains" | "tenants"
): boolean {
  // Super admin can do everything
  if (ctx.role === "super_admin") return true

  // Define permissions matrix
  const permissions: Record<PlatformRole, Record<string, string[]>> = {
    super_admin: {
      investors: ["read", "write", "delete", "admin"],
      listings: ["read", "write", "delete", "admin"],
      memos: ["read", "write", "delete", "admin"],
      tasks: ["read", "write", "delete", "admin"],
      users: ["read", "write", "delete", "admin"],
      settings: ["read", "write", "admin"],
      deal_rooms: ["read", "write", "delete", "admin"],
      domains: ["read", "write", "delete", "admin"],
      tenants: ["read", "write", "delete", "admin"],
    },
    manager: {
      investors: ["read", "write", "delete"],
      listings: ["read", "write", "delete"],
      memos: ["read", "write", "delete"],
      tasks: ["read", "write", "delete"],
      users: ["read", "write"],
      settings: ["read", "write"],
      deal_rooms: ["read", "write", "delete"],
      domains: [],
      tenants: ["read"],
    },
    agent: {
      investors: ["read", "write"],
      listings: ["read", "write"],
      memos: ["read", "write"],
      tasks: ["read", "write"],
      users: ["read"],
      settings: ["read"],
      deal_rooms: ["read", "write"],
      domains: [],
      tenants: ["read"],
    },
    investor: {
      investors: ["read"],
      listings: ["read"],
      memos: ["read"],
      tasks: ["read"],
      users: [],
      settings: [],
      deal_rooms: ["read"],
      domains: [],
      tenants: [],
    },
  }

  const rolePermissions = permissions[ctx.role]?.[resource] ?? []
  return rolePermissions.includes(action)
}

/**
 * Role display names for UI.
 */
export const roleDisplayNames: Record<PlatformRole, string> = {
  super_admin: "Super Administrator",
  manager: "Manager",
  agent: "Agent",
  investor: "Investor",
}

/**
 * Get role badge color for UI.
 */
export function getRoleBadgeColor(role: PlatformRole): string {
  const colors: Record<PlatformRole, string> = {
    super_admin: "bg-purple-100 text-purple-800",
    manager: "bg-blue-100 text-blue-800",
    agent: "bg-green-100 text-green-800",
    investor: "bg-amber-100 text-amber-800",
  }
  return colors[role] || "bg-gray-100 text-gray-800"
}

