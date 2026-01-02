import "server-only"

import { getSupabaseAdminClient } from "@/lib/db/client"

type MandateLike = {
  preferredAreas?: string[]
  propertyTypes?: string[]
  minInvestment?: number
  maxInvestment?: number
  yieldTarget?: string
}

function asMandate(m: unknown): MandateLike {
  if (!m || typeof m !== "object") return {}
  const obj = m as Record<string, unknown>
  return {
    preferredAreas: Array.isArray(obj.preferredAreas) ? (obj.preferredAreas as string[]) : undefined,
    propertyTypes: Array.isArray(obj.propertyTypes) ? (obj.propertyTypes as string[]) : undefined,
    minInvestment: typeof obj.minInvestment === "number" ? obj.minInvestment : undefined,
    maxInvestment: typeof obj.maxInvestment === "number" ? obj.maxInvestment : undefined,
    yieldTarget: typeof obj.yieldTarget === "string" ? obj.yieldTarget : undefined,
  }
}

function formatAED(value: number | null | undefined) {
  const v = typeof value === "number" && Number.isFinite(value) ? value : 0
  return `AED ${Math.round(v).toLocaleString()}`
}

export async function answerQualifiedInventory(tenantId: string): Promise<string> {
  const supabase = getSupabaseAdminClient()

  type InvestorRow = { id: string; name: string; status: string; mandate: unknown }
  type ShortlistRow = { id: string; investor_id: string }
  type ShortlistItemRow = { shortlist_id: string; listing_id: string }
  type ListingRow = {
    id: string
    title: string
    area?: string | null
    type?: string | null
    status: string
    price?: number | null
    expected_rent?: number | null
  }

  const [
    { data: investors, error: invErr },
    { data: shortlists, error: slErr },
    { data: items, error: itErr },
    { data: listings, error: lsErr },
  ] = await Promise.all([
    supabase.from("investors").select("id,name,status,mandate").eq("tenant_id", tenantId),
    supabase.from("shortlists").select("id,investor_id").eq("tenant_id", tenantId),
    supabase.from("shortlist_items").select("shortlist_id,listing_id").eq("tenant_id", tenantId),
    supabase
      .from("listings")
      .select("id,title,area,type,status,price,expected_rent")
      .eq("tenant_id", tenantId)
      .eq("status", "available"),
  ])

  if (invErr) throw invErr
  if (slErr) throw slErr
  if (itErr) throw itErr
  if (lsErr) throw lsErr

  const shortlistByInvestor = new Map<string, string>()
  for (const sl of (shortlists ?? []) as ShortlistRow[]) {
    shortlistByInvestor.set(sl.investor_id, sl.id)
  }

  const itemCountByInvestor = new Map<string, number>()
  const investorListingIds = new Map<string, Set<string>>() // investor -> listing_ids already shortlisted

  const shortlistToInvestor = new Map<string, string>()
  for (const sl of (shortlists ?? []) as ShortlistRow[]) {
    shortlistToInvestor.set(sl.id, sl.investor_id)
  }

  for (const it of (items ?? []) as ShortlistItemRow[]) {
    const shortlistId = it.shortlist_id
    const investorId = shortlistToInvestor.get(shortlistId)
    if (!investorId) continue
    const listingId = it.listing_id
    itemCountByInvestor.set(investorId, (itemCountByInvestor.get(investorId) ?? 0) + 1)
    const set = investorListingIds.get(investorId) ?? new Set<string>()
    set.add(listingId)
    investorListingIds.set(investorId, set)
  }

  const investorRows = (investors ?? []) as InvestorRow[]
  const activeInvestors = investorRows.filter((i) => i.status === "active")
  const investorsNeeding = activeInvestors.filter((i) => (itemCountByInvestor.get(i.id) ?? 0) === 0)

  if (investorsNeeding.length === 0) {
    return [
      "**Qualified inventory check**",
      "",
      "All active investors currently have at least one shortlisted property.",
      "",
      `- Active investors: ${activeInvestors.length}`,
      `- Available listings in tenant: ${(listings ?? []).length}`,
    ].join("\n")
  }

  const availableListings = ((listings ?? []) as ListingRow[]).map((l) => ({
    id: l.id,
    title: l.title,
    area: l.area ?? undefined,
    type: l.type ?? undefined,
    price: l.price ?? undefined,
    expectedRent: l.expected_rent ?? undefined,
  }))

  const lines: string[] = []
  lines.push("## Investors still needing qualified inventory")
  lines.push("")
  lines.push("**Definition**: active investors with **0 shortlisted properties**.")
  lines.push("")

  // Table header
  lines.push("| Investor | Shortlisted | Matching available listings |")
  lines.push("|---|---:|---:|")

  const chartRows: Array<{ investor: string; matching: number; shortlisted: number }> = []

  for (const inv of investorsNeeding) {
    const investorId = inv.id
    const name = inv.name
    const mandate = asMandate(inv.mandate)
    const already = investorListingIds.get(investorId) ?? new Set<string>()

    let candidates = availableListings.filter((l) => !already.has(l.id))
    if (mandate.preferredAreas?.length) candidates = candidates.filter((l) => l.area && mandate.preferredAreas!.includes(l.area))
    if (mandate.propertyTypes?.length) candidates = candidates.filter((l) => l.type && mandate.propertyTypes!.includes(l.type))
    if (typeof mandate.minInvestment === "number") candidates = candidates.filter((l) => (l.price ?? 0) >= mandate.minInvestment!)
    if (typeof mandate.maxInvestment === "number") candidates = candidates.filter((l) => (l.price ?? 0) <= mandate.maxInvestment!)

    const top = candidates.slice(0, 3)
    const matchingCount = candidates.length
    const shortlistedCount = itemCountByInvestor.get(investorId) ?? 0
    chartRows.push({ investor: name, matching: matchingCount, shortlisted: shortlistedCount })

    lines.push(`| ${name} | ${shortlistedCount} | ${matchingCount} |`)
  }

  lines.push("")

  for (const inv of investorsNeeding) {
    const investorId = inv.id
    const name = inv.name
    const mandate = asMandate(inv.mandate)
    const already = investorListingIds.get(investorId) ?? new Set<string>()

    let candidates = availableListings.filter((l) => !already.has(l.id))
    if (mandate.preferredAreas?.length) candidates = candidates.filter((l) => l.area && mandate.preferredAreas!.includes(l.area))
    if (mandate.propertyTypes?.length) candidates = candidates.filter((l) => l.type && mandate.propertyTypes!.includes(l.type))
    if (typeof mandate.minInvestment === "number") candidates = candidates.filter((l) => (l.price ?? 0) >= mandate.minInvestment!)
    if (typeof mandate.maxInvestment === "number") candidates = candidates.filter((l) => (l.price ?? 0) <= mandate.maxInvestment!)

    const top = candidates.slice(0, 3)

    lines.push(`- **${name}**`)
    lines.push(
      `  - **Mandate**: ${mandate.propertyTypes?.length ? mandate.propertyTypes.join(", ") : "—"} • ${mandate.preferredAreas?.length ? mandate.preferredAreas.join(", ") : "—"} • ${mandate.minInvestment || mandate.maxInvestment ? `${formatAED(mandate.minInvestment)}–${formatAED(mandate.maxInvestment)}` : "—"}`,
    )
    lines.push(`  - **Shortlist**: none yet${shortlistByInvestor.has(investorId) ? " (shortlist exists but empty)" : " (no shortlist created)"}`)
    if (top.length === 0) {
      lines.push("  - **Suggested listings**: none match the mandate (consider relaxing area/type/budget filters).")
    } else {
      lines.push("  - **Suggested listings**:")
      for (const l of top) {
        const estYield =
          l.expectedRent && l.price ? `${(((l.expectedRent * 12) / l.price) * 100).toFixed(1)}%` : "—"
        lines.push(`    - ${l.title} (${l.area ?? "—"}) • ${formatAED(l.price)} • est. gross yield ${estYield}`)
      }
    }
    lines.push("")
  }

  lines.push(`Active investors: ${activeInvestors.length} • Available listings: ${availableListings.length}`)

  // Action block (for charts + navigation buttons in the chat UI)
  lines.push("")
  lines.push("```action")
  lines.push(
    JSON.stringify(
      {
        actions: [
          { type: "navigate", label: "Open Investors", href: "/investors" },
          { type: "navigate", label: "Open Real Estate", href: "/real-estate" },
        ],
        charts: [
          {
            type: "bar",
            title: "Inventory coverage by investor",
            xKey: "investor",
            bars: [
              { key: "matching", label: "Matching listings" },
              { key: "shortlisted", label: "Shortlisted" },
            ],
            data: chartRows,
          },
        ],
      },
      null,
      2,
    ),
  )
  lines.push("```")

  return lines.join("\n")
}


