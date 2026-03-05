"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { realtorTopNavItems } from "@/lib/realtor-nav"

export function RealtorTopNav() {
  const pathname = usePathname()

  return (
    <nav
      className="flex items-center gap-1 border-b border-gray-200/80 bg-white overflow-x-auto"
      aria-label="Realtor navigation"
    >
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1 -mb-px">
          {realtorTopNavItems.map((item) => {
            const isActive =
              item.href === "/realtor/dashboard"
                ? pathname === "/realtor/dashboard" || pathname === "/realtor"
                : pathname.startsWith(item.href) ||
                  (item.alsoMatch?.some((p) => pathname.startsWith(p)) ?? false)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px shrink-0",
                  isActive
                    ? "text-teal-600 border-teal-600"
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
