import { redirect } from "next/navigation"

/**
 * /investor redirects to Dashboard as the landing page.
 */
export default function InvestorLandingPage() {
  redirect("/investor/dashboard")
}
