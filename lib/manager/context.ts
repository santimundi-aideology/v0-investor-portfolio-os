import type { RequestContext } from "@/lib/security/rbac"
import { AccessError } from "@/lib/security/rbac"

export function requireManagerTenantContext(ctx: RequestContext): { tenantId: string } {
  if (ctx.role !== "manager") {
    throw new AccessError("Manager access required")
  }

  if (!ctx.tenantId) {
    throw new AccessError("Tenant context is required")
  }

  return { tenantId: ctx.tenantId }
}

