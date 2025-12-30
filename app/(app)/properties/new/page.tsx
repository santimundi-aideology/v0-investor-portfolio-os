"use client"

import { PropertyIntakeWizard } from "@/components/properties/property-intake-wizard"
import { RoleRedirect } from "@/components/security/role-redirect"
import "@/lib/init-property-store"

export default function NewPropertyPage() {
  return (
    <>
      <RoleRedirect allow={["owner", "admin", "realtor"]} redirectTo="/dashboard" />
      <PropertyIntakeWizard />
    </>
  )
}

