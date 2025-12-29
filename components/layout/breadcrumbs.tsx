"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { useApp } from "@/components/providers/app-provider"
import { findNavItemByHref } from "@/lib/nav"

function titleizeSegment(seg: string) {
  return seg
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function buildAutoCrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean)
  const crumbs: { label: string; href?: string }[] = []

  let href = ""
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    href += `/${seg}`

    // Prefer nav label for exact href matches
    const nav = findNavItemByHref(href)
    if (nav) {
      crumbs.push({ label: nav.label, href })
      continue
    }

    // Normalize some known dynamic segments
    if (seg === "deal-room") {
      crumbs.push({ label: "Deal Rooms", href })
      continue
    }

    // Render numeric or prefixed ids as "Details"
    if (/^\d+$/.test(seg) || /^(inv|prop|memo|deal)-/.test(seg)) {
      crumbs.push({ label: "Details" })
      continue
    }

    crumbs.push({ label: titleizeSegment(seg), href })
  }

  return crumbs
}

export function AppBreadcrumbs({ className }: { className?: string }) {
  const pathname = usePathname()
  const { breadcrumbsOverride } = useApp()

  const items = React.useMemo(() => {
    if (breadcrumbsOverride && breadcrumbsOverride.length > 0) return breadcrumbsOverride
    return buildAutoCrumbs(pathname)
  }, [pathname, breadcrumbsOverride])

  if (!items.length) return null

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1
          return (
            <React.Fragment key={`${item.label}-${idx}`}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : item.href ? (
                  <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
                ) : (
                  <span className="text-muted-foreground">{item.label}</span>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}


