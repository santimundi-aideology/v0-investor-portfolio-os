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
 * Extracts request context from headers.
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

