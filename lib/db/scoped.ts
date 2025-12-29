export function assertTenantMatch(resourceTenantId: string | null | undefined, ctxTenantId: string | undefined) {
  if (!resourceTenantId || !ctxTenantId) return false
  return resourceTenantId === ctxTenantId
}

