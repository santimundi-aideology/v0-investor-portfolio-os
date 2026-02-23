"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const topNavItems = [
  { label: "Overview", href: "/investor/dashboard" },
  { label: "Portfolio", href: "/investor/portfolio", alsoMatch: ["/investor/portfolio"] },
  { label: "Opportunities", href: "/investor/opportunities" },
  { label: "Payments", href: "/investor/payments" },
  { label: "Analytics", href: "/investor/analytics" },
  { label: "Context & Activity", href: "/investor/context-activity" },
  { label: "Profile", href: "/investor/profile" },
] as const

export function InvestorTopNav() {
  const pathname = usePathname()

  return (
    <nav
      className="flex items-center gap-1 border-b border-gray-200/80 bg-white overflow-x-auto"
      aria-label="Main navigation"
    >
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1 -mb-px">
          {topNavItems.map((item) => {
            const isActive =
              item.href === "/investor/dashboard"
                ? pathname === "/investor/dashboard" || pathname === "/investor"
                : pathname.startsWith(item.href) ||
                  (item.alsoMatch?.some((p) => pathname.startsWith(p)) ?? false)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px shrink-0",
                  isActive
                    ? "text-primary border-primary"
                    : "text-gray-500 border-transparent hover:text-gray-900 hover:border-gray-300"
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
