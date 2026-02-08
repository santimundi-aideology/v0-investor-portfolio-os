"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Search, SlidersHorizontal, Users, UserPlus, Loader2 } from "lucide-react"

import type { Investor } from "@/lib/types"
import { initInvestorStore, useInvestors, replaceAllInvestors } from "@/lib/investor-store"
import { useApp } from "@/components/providers/app-provider"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/layout/empty-state"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { InvestorCard } from "@/components/investors/investor-card"
import { InvestorStatsBanner } from "@/components/investors/investor-stats-banner"
import { cn } from "@/lib/utils"

type ViewMode = "grid" | "table"
type StatusFilter = "all" | Investor["status"]

function statusLabel(status: Investor["status"]) {
  switch (status) {
    case "active":
      return "Active"
    case "pending":
      return "Watching"
    case "inactive":
      return "Closed"
  }
}

function statusVariant(status: Investor["status"]) {
  switch (status) {
    case "active":
      return "default"
    case "pending":
      return "secondary"
    case "inactive":
      return "outline"
  }
}

function safeDate(date: string) {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return date
  return d.toLocaleDateString("en-AE", { year: "numeric", month: "short", day: "2-digit" })
}

// Map database investor record to Investor type
function mapDbToInvestor(record: Record<string, unknown>): Investor {
  return {
    id: record.id as string,
    name: record.name as string,
    company: (record.company as string) ?? "",
    email: (record.email as string) ?? "",
    phone: (record.phone as string) ?? "",
    avatar: (record.avatar as string) ?? "/placeholder-user.jpg",
    status: record.status as Investor["status"],
    segment: "hnwi",
    location: "",
    timezone: "Asia/Dubai",
    preferredContactMethod: "email",
    aumAed: 0,
    liquidityWindow: "30-90d",
    leadSource: "",
    tags: [],
    notes: "",
    mandate: record.mandate as Investor["mandate"] ?? undefined,
    createdAt: (record.createdAt as string) ?? new Date().toISOString(),
    lastContact: (record.lastContact as string) ?? new Date().toISOString(),
    totalDeals: (record.totalDeals as number) ?? 0,
  }
}

export function InvestorsPageClient() {
  const { role } = useApp()
  const [loading, setLoading] = React.useState(true)
  const [dbError, setDbError] = React.useState<string | null>(null)

  React.useEffect(() => {
    // Fetch from database
    async function fetchFromDb() {
      try {
        const res = await fetch("/api/investors")
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data) && data.length > 0) {
            const dbInvestors = data.map(mapDbToInvestor)
            replaceAllInvestors(dbInvestors, true)
          }
        } else {
          setDbError("Failed to load investors. Please try again.")
        }
      } catch (err) {
        console.error("Could not fetch investors from database:", err)
        setDbError("Could not connect to the server. Please check your connection.")
      } finally {
        setLoading(false)
      }
    }
    
    fetchFromDb()
  }, [])

  const allInvestors = useInvestors()

  const [query, setQuery] = React.useState("")
  const [status, setStatus] = React.useState<StatusFilter>("all")
  const [strategy, setStrategy] = React.useState<string>("all")
  const [viewMode, setViewMode] = React.useState<ViewMode>("grid")

  const investors = React.useMemo(() => {
    // Investors must never see internal CRM views
    if (role === "investor") return []
    return allInvestors
  }, [allInvestors, role])

  const strategyOptions = React.useMemo(() => {
    const set = new Set<string>()
    for (const inv of investors) {
      const s = inv.mandate?.strategy?.trim()
      if (s) set.add(s)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [investors])

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return investors
      .filter((inv) => (status === "all" ? true : inv.status === status))
      .filter((inv) => (strategy === "all" ? true : (inv.mandate?.strategy ?? "") === strategy))
      .filter((inv) => {
        if (!q) return true
        return (
          inv.name.toLowerCase().includes(q) ||
          inv.company.toLowerCase().includes(q) ||
          inv.email.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => new Date(b.lastContact).getTime() - new Date(a.lastContact).getTime())
  }, [investors, query, status, strategy])

  const stats = React.useMemo(() => {
    const active = investors.filter((i) => i.status === "active").length
    const watching = investors.filter((i) => i.status === "pending").length
    const closed = investors.filter((i) => i.status === "inactive").length
    const deals = 0 // No deal_rooms DB table exists
    const ongoingDeals = 0 // No deal_rooms DB table exists
    return { total: investors.length, active, watching, closed, deals, ongoingDeals }
  }, [investors])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }

  if (role === "investor") {
    return (
      <div className="space-y-6">
        <PageHeader title="Investors" subtitle="Not available for investor accounts" />
        <EmptyState
          title="Not authorized"
          description="Investor accounts cannot access the internal investor CRM."
          icon={<Users className="size-5" />}
          action={
            <Button asChild>
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Visual Stats Banner */}
      <InvestorStatsBanner investors={investors} />

      {/* Filters */}
      <Card className="border-gray-100">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search investors by name, company, or email…"
                  className="pl-9"
                />
              </div>
              <Button
                variant="outline"
                className="hidden md:inline-flex"
                onClick={() =>
                  toast.info("Filters (demo)", {
                    description: "Use Status + Strategy filters on the right.",
                  })
                }
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Filters
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Watching</SelectItem>
                  <SelectItem value="inactive">Closed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={strategy} onValueChange={setStrategy}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Strategy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All strategies</SelectItem>
                  {strategyOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="hidden md:block">
                <Separator orientation="vertical" className="h-9" />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={viewMode === "grid" ? "default" : "outline"}
                  className={cn(viewMode === "grid" && "bg-green-500 text-white")}
                  onClick={() => setViewMode("grid")}
                >
                  Grid
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "table" ? "default" : "outline"}
                  className={cn(viewMode === "table" && "bg-green-500 text-white")}
                  onClick={() => setViewMode("table")}
                >
                  Table
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <div>
          Showing <span className="font-medium text-foreground">{filtered.length}</span> of{" "}
          <span className="font-medium text-foreground">{stats.total}</span>
        </div>
        <div className="hidden md:block">Sorted by last contact</div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No investors found"
          description="Try a different search term or reset filters."
          icon={<Users className="size-5" />}
          action={
            <Button
              variant="outline"
              onClick={() => {
                setQuery("")
                setStatus("all")
                setStrategy("all")
              }}
            >
              Reset filters
            </Button>
          }
        />
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((inv) => (
            <InvestorCard key={inv.id} investor={inv} />
          ))}
        </div>
      ) : (
        <Card className="border-border/60">
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-3 pr-4 font-medium">Investor</th>
                    <th className="pb-3 pr-4 font-medium">Company</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 pr-4 font-medium">Strategy</th>
                    <th className="pb-3 pr-4 font-medium">Last contact</th>
                    <th className="pb-3 pr-0 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => (
                    <tr key={inv.id} className="border-b last:border-b-0">
                      <td className="py-4 pr-4 font-medium">{inv.name}</td>
                      <td className="py-4 pr-4 text-gray-500">{inv.company}</td>
                      <td className="py-4 pr-4">
                        <Badge variant={statusVariant(inv.status)}>{statusLabel(inv.status)}</Badge>
                      </td>
                      <td className="py-4 pr-4 text-gray-500">{inv.mandate?.strategy ?? "—"}</td>
                      <td className="py-4 pr-4 text-gray-500">{safeDate(inv.lastContact)}</td>
                      <td className="py-4 pr-0 text-right">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/investors/${inv.id}`}>Open</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


