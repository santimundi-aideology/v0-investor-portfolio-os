"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/layout/empty-state"
import { NewInvestorDialog } from "@/components/investors/new-investor-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea, ScrollAreaViewport, ScrollBar } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Filter, MoreHorizontal, Plus, Users } from "lucide-react"

import { mockInvestors } from "@/lib/mock-data"
import { useApp } from "@/components/providers/app-provider"

export default function InvestorsPage() {
  const router = useRouter()
  const { role, scopedInvestorId } = useApp()

  React.useEffect(() => {
    if (role === "investor") router.replace(`/investors/${scopedInvestorId ?? "inv-1"}`)
  }, [role, router, scopedInvestorId])

  const [q, setQ] = React.useState("")
  const [strategy, setStrategy] = React.useState<string>("all")
  const [risk, setRisk] = React.useState<string>("all")

  const strategies = React.useMemo(() => {
    const s = new Set<string>()
    for (const inv of mockInvestors) if (inv.mandate?.strategy) s.add(inv.mandate.strategy)
    return ["all", ...Array.from(s)]
  }, [])

  const filtered = React.useMemo(() => {
    return mockInvestors.filter((inv) => {
      const matchesQ =
        q.trim() === "" ||
        inv.name.toLowerCase().includes(q.toLowerCase()) ||
        inv.company.toLowerCase().includes(q.toLowerCase()) ||
        inv.email.toLowerCase().includes(q.toLowerCase())

      const matchesStrategy = strategy === "all" || inv.mandate?.strategy === strategy
      const matchesRisk = risk === "all" || inv.mandate?.riskTolerance === risk
      return matchesQ && matchesStrategy && matchesRisk
    })
  }, [q, strategy, risk])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Investors"
        subtitle={`${filtered.length} of ${mockInvestors.length} investors`}
        primaryAction={<NewInvestorDialog />}
        secondaryActions={
          <Button variant="outline" asChild>
            <Link href="/tasks">
              <Plus className="mr-2 h-4 w-4" />
              Add task
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex flex-1 gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search investors…" />
          <Button variant="outline" className="gap-2" type="button">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>
        <div className="flex gap-2">
          <Select value={strategy} onValueChange={setStrategy}>
            <SelectTrigger className="w-[190px]">
              <SelectValue placeholder="Strategy" />
            </SelectTrigger>
            <SelectContent>
              {strategies.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "all" ? "All strategies" : s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={risk} onValueChange={setRisk}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Risk" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All risk</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No investors found"
          description="Try adjusting filters, or add a new investor to start building your portfolio."
          icon={<Users className="size-5" />}
          action={<NewInvestorDialog />}
        />
      ) : (
        <ScrollArea className="rounded-lg border">
          <ScrollAreaViewport>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Investor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Strategy</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <div className="min-w-[220px]">
                        <div className="font-medium">{inv.name}</div>
                        <div className="text-muted-foreground text-xs">{inv.company}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={inv.status === "active" ? "secondary" : "outline"}>{inv.status}</Badge>
                    </TableCell>
                    <TableCell>{inv.mandate?.strategy ?? "—"}</TableCell>
                    <TableCell className="capitalize">{inv.mandate?.riskTolerance ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Row actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/investors/${inv.id}`}>View</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/memos/new?investorId=${inv.id}`}>Create memo</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/tasks?investorId=${inv.id}`}>Add task</Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollAreaViewport>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}
    </div>
  )
}
