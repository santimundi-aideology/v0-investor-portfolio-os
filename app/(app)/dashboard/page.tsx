import { redirect } from "next/navigation"

/**
 * Legacy /dashboard redirects to /realtor/dashboard.
 * Investors are routed to /investor/dashboard via middleware and auth.
 */
export default function DashboardRedirectPage() {
  redirect("/realtor/dashboard")
}
