"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Search, SlidersHorizontal, Users, UserPlus } from "lucide-react"

import { mockInvestors } from "@/lib/mock-data"
import type { Investor } from "@/lib/types"
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

export function InvestorsPageClient() {
  const { role } = useApp()

  const [query, setQuery] = React.useState("")
  const [status, setStatus] = React.useState<StatusFilter>("all")
  const [strategy, setStrategy] = React.useState<string>("all")
  const [viewMode, setViewMode] = React.useState<ViewMode>("grid")

  const investors = React.useMemo(() => {
    // Investors must never see internal CRM views
    if (role === "investor") return []
    return mockInvestors
  }, [role])

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
    const deals = investors.reduce((sum, i) => sum + (i.totalDeals ?? 0), 0)
    return { total: investors.length, active, watching, closed, deals }
  }, [investors])

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
      <PageHeader
        title="Investors"
        subtitle={`${stats.total} investors • ${stats.active} active • ${stats.watching} watching`}
        primaryAction={
          <Button
            onClick={() =>
              toast.info("New investor (demo)", {
                description: "Investor creation UI is coming next. For now, use seeded demo investors.",
              })
            }
          >
            <UserPlus className="mr-2 h-4 w-4" />
            New investor
          </Button>
        }
        secondaryActions={
          <Button variant="outline" asChild>
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-2xl font-semibold">{stats.active}</div>
            <Badge variant="secondary">Pipeline</Badge>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Watching</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-2xl font-semibold">{stats.watching}</div>
            <Badge variant="outline">Pre-mandate</Badge>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Deals (total)</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-2xl font-semibold">{stats.deals}</div>
            <Badge variant="secondary">All time</Badge>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                  className={cn(viewMode === "grid" && "bg-primary text-primary-foreground")}
                  onClick={() => setViewMode("grid")}
                >
                  Grid
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "table" ? "default" : "outline"}
                  className={cn(viewMode === "table" && "bg-primary text-primary-foreground")}
                  onClick={() => setViewMode("table")}
                >
                  Table
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
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
                  <tr className="border-b text-left text-muted-foreground">
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
                      <td className="py-4 pr-4 text-muted-foreground">{inv.company}</td>
                      <td className="py-4 pr-4">
                        <Badge variant={statusVariant(inv.status)}>{statusLabel(inv.status)}</Badge>
                      </td>
                      <td className="py-4 pr-4 text-muted-foreground">{inv.mandate?.strategy ?? "—"}</td>
                      <td className="py-4 pr-4 text-muted-foreground">{safeDate(inv.lastContact)}</td>
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


