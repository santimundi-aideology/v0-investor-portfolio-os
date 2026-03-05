"use client"

import * as React from "react"
import Link from "next/link"
import {
  AlertCircle,
  Calendar as CalendarIcon,
  CreditCard,
  Download,
  FileDown,
  Loader2,
  CalendarDays,
  List,
  History,
  BellPlus,
  ChevronLeft,
  ChevronRight,
  Pencil,
  X,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  PortfolioPaymentOverview,
  getDisplayStatus,
  formatDateFull,
  type Milestone,
  type PaymentSummary,
  type PaymentMilestonesAPIResponse,
} from "@/components/investor/payment-milestones"
import { useApp } from "@/components/providers/app-provider"
import { useAPI } from "@/lib/hooks/use-api"
import { formatAED } from "@/lib/real-estate"
import { cn } from "@/lib/utils"

const TODAY = new Date().toISOString().slice(0, 10)
const DAYS_UPCOMING = 7

export type CustomReminder = {
  id: string
  date: string
  subject?: string
  description: string
  color?: string
  linkedPropertyId?: string
  linkedPropertyTitle?: string
}

const REMINDER_COLORS = [
  { value: "blue", label: "Blue", bg: "bg-blue-200/90 dark:bg-blue-800/90", text: "text-blue-900 dark:text-blue-100" },
  { value: "emerald", label: "Emerald", bg: "bg-emerald-200/90 dark:bg-emerald-800/90", text: "text-emerald-900 dark:text-emerald-100" },
  { value: "amber", label: "Amber", bg: "bg-amber-200/90 dark:bg-amber-800/90", text: "text-amber-900 dark:text-amber-100" },
  { value: "violet", label: "Violet", bg: "bg-violet-200/90 dark:bg-violet-800/90", text: "text-violet-900 dark:text-violet-100" },
  { value: "rose", label: "Rose", bg: "bg-rose-200/90 dark:bg-rose-800/90", text: "text-rose-900 dark:text-rose-100" },
  { value: "sky", label: "Sky", bg: "bg-sky-200/90 dark:bg-sky-800/90", text: "text-sky-900 dark:text-sky-100" },
] as const

function computeSummary(milestones: Milestone[]): PaymentSummary {
  const totalAmount = milestones.reduce((s, m) => s + m.amount, 0)
  const totalPaid = milestones.filter((m) => m.status === "paid").reduce((s, m) => s + m.amount, 0)
  const upcoming = milestones
    .filter((m) => m.status !== "paid" && m.dueDate)
    .sort((a, b) => (a.dueDate! > b.dueDate! ? 1 : -1))
  return {
    totalAmount,
    totalPaid,
    totalUpcoming: totalAmount - totalPaid,
    paidPct: totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0,
    holdingCount: new Set(milestones.map((m) => m.holdingId)).size,
    nextPayment:
      upcoming[0] != null
        ? {
            propertyTitle: upcoming[0].propertyTitle,
            label: upcoming[0].label,
            amount: upcoming[0].amount,
            dueDate: upcoming[0].dueDate!,
          }
        : null,
    upcomingPayments: upcoming.slice(0, 10).map((p) => ({
      propertyTitle: p.propertyTitle,
      label: p.label,
      amount: p.amount,
      dueDate: p.dueDate!,
      holdingId: p.holdingId,
    })),
  }
}

function getMonthDays(year: number, month: number) {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const startPad = first.getDay()
  const daysInMonth = last.getDate()
  const total = startPad + daysInMonth
  const rows = Math.ceil(total / 7)
  const cells: (number | null)[] = []
  for (let i = 0; i < startPad; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  const rest = rows * 7 - cells.length
  for (let i = 0; i < rest; i++) cells.push(null)
  return cells
}

function generateICS(milestones: Milestone[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Investor Portfolio//Payment Milestones//EN",
    "CALSCALE:GREGORIAN",
  ]
  for (const m of milestones) {
    if (m.status === "paid" || !m.dueDate) continue
    const date = m.dueDate.replace(/-/g, "")
    lines.push("BEGIN:VEVENT")
    lines.push(`UID:${m.id}@payments`)
    lines.push(`DTSTART;VALUE=DATE:${date}`)
    lines.push(`DTEND;VALUE=DATE:${date}`)
    lines.push(`SUMMARY:${m.label} - ${m.propertyTitle} (${formatAED(m.amount)})`)
    lines.push(`DESCRIPTION:Payment milestone for ${m.propertyTitle}`)
    lines.push("END:VEVENT")
  }
  lines.push("END:VCALENDAR")
  return lines.join("\r\n")
}

function downloadCSV(milestones: Milestone[]) {
  const headers = ["Property", "Label", "Amount (AED)", "Due Date", "Paid Date", "Status"]
  const rows = milestones.map((m) => [
    m.propertyTitle,
    m.label,
    String(m.amount),
    m.dueDate ?? "",
    m.paidDate ?? "",
    m.status,
  ])
  const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n")
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `payment-schedule-${TODAY}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function downloadICS(milestones: Milestone[]) {
  const ics = generateICS(milestones)
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `payment-schedule-${TODAY}.ics`
  a.click()
  URL.revokeObjectURL(url)
}

const REMINDERS_STORAGE_KEY = "investor_payment_reminders"

function loadReminders(): CustomReminder[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(REMINDERS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as CustomReminder[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveReminders(reminders: CustomReminder[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(reminders))
  } catch {}
}

export default function InvestorPaymentsPage() {
  const { scopedInvestorId } = useApp()
  const { data, isLoading, mutate } = useAPI<PaymentMilestonesAPIResponse>("/api/investor/payment-milestones")

  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [propertyFilter, setPropertyFilter] = React.useState<string>("all")
  const [dateFrom, setDateFrom] = React.useState<string>("")
  const [dateTo, setDateTo] = React.useState<string>("")
  const [sortBy, setSortBy] = React.useState<string>("dueDate")
  const [viewMode, setViewMode] = React.useState<"schedule" | "calendar" | "history">("schedule")
  const [historySearch, setHistorySearch] = React.useState("")
  const [calendarMonth, setCalendarMonth] = React.useState(() => new Date().getMonth())
  const [calendarYear, setCalendarYear] = React.useState(() => new Date().getFullYear())
  const [customReminders, setCustomReminders] = React.useState<CustomReminder[]>(loadReminders)
  const [addReminderOpen, setAddReminderOpen] = React.useState(false)
  const [editSheetOpen, setEditSheetOpen] = React.useState(false)
  const [editSheetDate, setEditSheetDate] = React.useState<string | null>(null)
  const [editSheetMilestone, setEditSheetMilestone] = React.useState<Milestone | null>(null)

  React.useEffect(() => {
    saveReminders(customReminders)
  }, [customReminders])

  const milestones = React.useMemo(() => data?.milestones ?? [], [data])

  const propertyOptions = React.useMemo(() => {
    const set = new Set(milestones.map((m) => m.holdingId))
    return Array.from(set).map((holdingId) => {
      const m = milestones.find((x) => x.holdingId === holdingId)!
      return { holdingId, title: m.propertyTitle }
    })
  }, [milestones])

  const filteredMilestones = React.useMemo(() => {
    let list = [...milestones]
    if (statusFilter === "paid") list = list.filter((m) => m.status === "paid")
    else if (statusFilter === "scheduled")
      list = list.filter((m) => m.status !== "paid" && m.dueDate && m.dueDate >= TODAY)
    else if (statusFilter === "overdue")
      list = list.filter((m) => m.status !== "paid" && m.dueDate && m.dueDate < TODAY)
    if (propertyFilter !== "all") list = list.filter((m) => m.holdingId === propertyFilter)
    if (dateFrom) list = list.filter((m) => (m.dueDate || m.paidDate) && (m.dueDate || m.paidDate)! >= dateFrom)
    if (dateTo) list = list.filter((m) => (m.dueDate || m.paidDate) && (m.dueDate || m.paidDate)! <= dateTo)
    if (sortBy === "dueDate")
      list.sort((a, b) => {
        const da = a.dueDate || a.paidDate || "9999-99-99"
        const db = b.dueDate || b.paidDate || "9999-99-99"
        return da.localeCompare(db)
      })
    else if (sortBy === "amount") list.sort((a, b) => b.amount - a.amount)
    else if (sortBy === "property") list.sort((a, b) => a.propertyTitle.localeCompare(b.propertyTitle))
    return list
  }, [milestones, statusFilter, propertyFilter, dateFrom, dateTo, sortBy])

  const historyMilestones = React.useMemo(() => {
    let paid = milestones.filter((m) => m.status === "paid")
    if (propertyFilter !== "all") paid = paid.filter((m) => m.holdingId === propertyFilter)
    if (dateFrom) paid = paid.filter((m) => m.paidDate && m.paidDate >= dateFrom)
    if (dateTo) paid = paid.filter((m) => m.paidDate && m.paidDate <= dateTo)
    if (!historySearch.trim()) return paid
    const q = historySearch.toLowerCase()
    return paid.filter(
      (m) =>
        m.label.toLowerCase().includes(q) ||
        m.propertyTitle.toLowerCase().includes(q)
    )
  }, [milestones, historySearch, propertyFilter, dateFrom, dateTo])

  const overdueList = React.useMemo(
    () => milestones.filter((m) => m.status !== "paid" && m.dueDate && m.dueDate < TODAY),
    [milestones]
  )
  const upcomingSoonList = React.useMemo(() => {
    const end = new Date()
    end.setDate(end.getDate() + DAYS_UPCOMING)
    const endStr = end.toISOString().slice(0, 10)
    return milestones.filter(
      (m) => m.status !== "paid" && m.dueDate && m.dueDate >= TODAY && m.dueDate <= endStr
    )
  }, [milestones])

  const scheduleData = React.useMemo((): PaymentMilestonesAPIResponse | null => {
    if (!data) return null
    return {
      milestones: filteredMilestones,
      summary: computeSummary(filteredMilestones),
    }
  }, [data, filteredMilestones])

  const summaryForHero = React.useMemo(
    () => (data?.milestones?.length ? computeSummary(data.milestones) : null),
    [data]
  )

  const handleExportPDF = React.useCallback(() => {
    window.print()
  }, [])

  const openEditSheet = React.useCallback((dateKey: string, milestone: Milestone) => {
    setEditSheetDate(dateKey)
    setEditSheetMilestone(milestone)
    setEditSheetOpen(true)
  }, [])

  const closeEditSheet = React.useCallback(() => {
    setEditSheetOpen(false)
    setEditSheetDate(null)
    setEditSheetMilestone(null)
  }, [])

  const addReminder = React.useCallback((reminder: Omit<CustomReminder, "id">) => {
    setCustomReminders((prev) => [
      ...prev,
      { ...reminder, id: `rem-${Date.now()}-${Math.random().toString(36).slice(2)}` },
    ])
    setAddReminderOpen(false)
  }, [])

  const removeReminder = React.useCallback((id: string) => {
    setCustomReminders((prev) => prev.filter((r) => r.id !== id))
  }, [])

  if (!scopedInvestorId) {
    return (
      <div className="w-full space-y-6 py-4 sm:py-6">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto size-8 animate-spin text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">Loading payments...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background">
      {/* Hero: My Payments — money-themed photo + green gradient overlay (premium, readable) */}
      <div
        className="relative -mx-4 -mt-4 min-h-[320px] overflow-hidden sm:-mx-6 lg:-mx-8 lg:-mt-6"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(15,41,34,0.88) 0%, rgba(15,41,34,0.82) 45%, rgba(15,41,34,0.90) 100%), url('https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=1920&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundColor: "#0f2922",
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(34,197,94,0.15),transparent)]" />
        <div className="relative px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 flex-1 max-w-4xl">
              <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                <CreditCard className="h-7 w-7 text-emerald-300" />
                My Payments
              </h1>
              <p className="mt-2 text-sm text-white/80 sm:text-base">
                Track payment milestones and upcoming installments across your capital
              </p>
            </div>
          </div>

          {!isLoading && summaryForHero && (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              <div className="rounded-xl border border-white/20 bg-emerald-900/60 backdrop-blur-sm px-4 py-4 shadow-lg">
                <p className="text-[10px] font-medium uppercase tracking-wider text-white/60">Total Commitments</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-white sm:text-2xl">{formatAED(summaryForHero.totalAmount)}</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-emerald-900/60 backdrop-blur-sm px-4 py-4 shadow-lg">
                <p className="text-[10px] font-medium uppercase tracking-wider text-white/60">Paid</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-emerald-300 sm:text-2xl">{formatAED(summaryForHero.totalPaid)}</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-emerald-900/60 backdrop-blur-sm px-4 py-4 shadow-lg">
                <p className="text-[10px] font-medium uppercase tracking-wider text-white/60">Remaining</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-white sm:text-2xl">{formatAED(summaryForHero.totalUpcoming)}</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-emerald-900/60 backdrop-blur-sm px-4 py-4 shadow-lg">
                <p className="text-[10px] font-medium uppercase tracking-wider text-white/60">Progress</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-emerald-300 sm:text-2xl">{summaryForHero.paidPct}%</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main content layer */}
      <div className="relative z-10 w-full py-6">
        {isLoading ? (
          <Card className="rounded-2xl border border-gray-200/80 shadow-sm dark:border-border">
            <CardContent className="flex items-center justify-center py-16">
              <Loader2 className="size-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Alerts: overdue and upcoming — premium styling */}
            {(overdueList.length > 0 || upcomingSoonList.length > 0) && (
              <div className="mb-6 space-y-3 print:hidden">
                {overdueList.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-rose-200/80 bg-rose-50/90 p-4 shadow-sm dark:border-rose-800 dark:bg-rose-950/40">
                    <AlertCircle className="size-5 shrink-0 text-rose-600" />
                    <span className="text-sm font-medium text-rose-800 dark:text-rose-200">
                      {overdueList.length} payment{overdueList.length !== 1 ? "s" : ""} overdue
                    </span>
                    <Link href="#schedule" className="text-sm font-medium text-rose-700 underline dark:text-rose-300">
                      View schedule
                    </Link>
                  </div>
                )}
                {upcomingSoonList.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200/80 bg-amber-50/90 p-4 shadow-sm dark:border-amber-800 dark:bg-amber-950/40">
                    <CalendarIcon className="size-5 shrink-0 text-amber-600" />
                    <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      {upcomingSoonList.length} payment{upcomingSoonList.length !== 1 ? "s" : ""} due in the next {DAYS_UPCOMING} days
                    </span>
                    <Link href="#schedule" className="text-sm font-medium text-amber-700 underline dark:text-amber-300">
                      View schedule
                    </Link>
                  </div>
                )}
              </div>
            )}

            {!data || data.milestones.length === 0 ? (
              <Card className="rounded-2xl border border-dashed border-gray-200 dark:border-border">
                <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <CreditCard className="size-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No payment milestones yet</h3>
                  <p className="text-sm text-muted-foreground max-w-md mb-6">
                    Payment milestones are installments linked to properties in your portfolio. Add assets with a payment plan to see your schedule here.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <Button asChild variant="default">
                      <Link href="/investor/portfolio">Go to Portfolio</Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="/investor/opportunities">Browse opportunities</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "schedule" | "calendar" | "history")} className="w-full">
                {/* Toolbar: layered card, premium look */}
                <div
                  id="schedule"
                  className="flex flex-col gap-3 rounded-2xl border border-gray-200/80 bg-white/95 p-4 shadow-sm dark:border-border dark:bg-card/95 print:hidden"
                >
                  <div className="flex min-h-[44px] flex-wrap items-center gap-2 sm:min-h-0">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-9 min-w-[120px] rounded-lg sm:w-[140px]" size="sm">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={propertyFilter} onValueChange={setPropertyFilter}>
                      <SelectTrigger className="h-9 min-w-[120px] max-w-[200px] rounded-lg sm:min-w-[140px]" size="sm">
                        <SelectValue placeholder="Property" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All properties</SelectItem>
                        {propertyOptions.map((o) => (
                          <SelectItem key={o.holdingId} value={o.holdingId}>
                            <span className="truncate">{o.title}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input type="date" className="h-9 w-[130px] min-w-0 rounded-lg" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                    <Input type="date" className="h-9 w-[130px] min-w-0 rounded-lg" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="h-9 min-w-[120px] rounded-lg sm:w-[160px]" size="sm">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dueDate">Due date</SelectItem>
                        <SelectItem value="amount">Amount</SelectItem>
                        <SelectItem value="property">Property name</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3 dark:border-border">
                    <TabsList className="h-9 rounded-lg bg-gray-100 p-0.5 dark:bg-muted">
                      <TabsTrigger value="schedule" className="gap-1.5 rounded-md text-xs sm:text-sm">
                        <List className="size-4" />
                        Schedule
                      </TabsTrigger>
                      <TabsTrigger value="calendar" className="gap-1.5 rounded-md text-xs sm:text-sm">
                        <CalendarDays className="size-4" />
                        Calendar
                      </TabsTrigger>
                      <TabsTrigger value="history" className="gap-1.5 rounded-md text-xs sm:text-sm">
                        <History className="size-4" />
                        History
                      </TabsTrigger>
                    </TabsList>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="min-h-[44px] gap-2 rounded-lg sm:min-h-0">
                          <Download className="size-4" />
                          Export
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl">
                        <DropdownMenuItem onClick={() => downloadCSV(milestones)}>
                          <FileDown className="mr-2 size-4" />
                          CSV
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => downloadICS(milestones)}>
                          <CalendarIcon className="mr-2 size-4" />
                          iCal / Google Calendar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExportPDF}>
                          <FileDown className="mr-2 size-4" />
                          PDF (print)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <TabsContent value="schedule" className="mt-6">
                  <div className="rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-border dark:bg-card">
                    <PortfolioPaymentOverview
                      data={scheduleData}
                      showMarkAsPaid
                      mutate={mutate}
                      onMarkPaid={() => mutate()}
                      hideSummaryKpis
                    />
                  </div>
                </TabsContent>

                <TabsContent value="calendar" className="mt-6">
                  <PaymentsCalendarView
                    milestones={filteredMilestones}
                    allMilestonesForMonth={milestones}
                    month={calendarMonth}
                    year={calendarYear}
                    onMonthChange={(m, y) => {
                      setCalendarMonth(m)
                      setCalendarYear(y)
                    }}
                    customReminders={customReminders}
                    onReminderRemove={removeReminder}
                    onCellClick={openEditSheet}
                    onAddReminderClick={() => setAddReminderOpen(true)}
                    propertyOptions={propertyOptions}
                  />
                  <div className="mt-4 flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => downloadICS(milestones)} className="gap-2 rounded-lg">
                      <CalendarIcon className="size-4" />
                      Export to iCal / Google Calendar
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="history" className="mt-6">
                  <PaymentsHistorySection
                    historyMilestones={historyMilestones}
                    historySearch={historySearch}
                    onSearchChange={setHistorySearch}
                  />
                </TabsContent>
              </Tabs>
            )}
          </>
        )}
      </div>

      {/* Edit payment sheet (from calendar cell) */}
      <EditPaymentSheet
        open={editSheetOpen}
        onOpenChange={(open) => !open && closeEditSheet()}
        milestone={editSheetMilestone}
        dateKey={editSheetDate}
        onSuccess={() => {
          mutate()
          closeEditSheet()
        }}
      />

      {/* Add reminder sheet */}
      <AddReminderSheet
        open={addReminderOpen}
        onOpenChange={setAddReminderOpen}
        onAdd={addReminder}
        propertyOptions={propertyOptions}
      />
    </div>
  )
}

/* ─── Edit Payment Sheet ─────────────────────────────────── */

function EditPaymentSheet({
  open,
  onOpenChange,
  milestone,
  dateKey,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  milestone: Milestone | null
  dateKey: string | null
  onSuccess: () => void
}) {
  const [loading, setLoading] = React.useState(false)
  const [dueDateEdit, setDueDateEdit] = React.useState("")

  React.useEffect(() => {
    if (milestone) {
      setDueDateEdit(milestone.dueDate ?? "")
    }
  }, [milestone])

  if (!milestone) return null

  const displayStatus = getDisplayStatus(milestone)
  const isPaid = milestone.status === "paid"

  const handleMarkPaid = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/investor/payment-milestones/${milestone.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (res.ok) onSuccess()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-0 overflow-hidden rounded-l-2xl sm:max-w-md"
      >
        <SheetHeader className="shrink-0 pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Pencil className="size-5 text-primary" />
            Edit payment
          </SheetTitle>
          <SheetDescription>
            {milestone.propertyTitle} — {milestone.label}
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto py-1">
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-border dark:bg-muted/30">
              <p className="text-xs font-medium text-muted-foreground">Amount</p>
              <p className="text-xl font-bold tabular-nums">{formatAED(milestone.amount)}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Due date</Label>
              <Input
                type="date"
                value={dueDateEdit}
                onChange={(e) => setDueDateEdit(e.target.value)}
                className="mt-1 rounded-lg"
                disabled
                title="Editing milestone due date requires backend support; display only for now."
              />
            </div>
            {isPaid && milestone.paidDate && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Paid on</p>
                <p className="font-semibold text-emerald-800 dark:text-emerald-200">{formatDateFull(milestone.paidDate)}</p>
              </div>
            )}
          </div>
        </div>
        <SheetFooter className="mt-4 shrink-0 border-t border-gray-200 pt-4 dark:border-border">
          {!isPaid && (
            <Button onClick={handleMarkPaid} disabled={loading} className="rounded-lg bg-emerald-600 hover:bg-emerald-700">
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Mark as paid"}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-lg">
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

/* ─── Add Reminder Sheet ───────────────────────────────────── */

function getReminderColorClasses(colorValue: string | undefined) {
  const found = REMINDER_COLORS.find((c) => c.value === colorValue)
  return found ? `${found.bg} ${found.text}` : `${REMINDER_COLORS[0].bg} ${REMINDER_COLORS[0].text}`
}

function AddReminderSheet({
  open,
  onOpenChange,
  onAdd,
  propertyOptions,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (r: Omit<CustomReminder, "id">) => void
  propertyOptions: { holdingId: string; title: string }[]
}) {
  const [date, setDate] = React.useState("")
  const [subject, setSubject] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [color, setColor] = React.useState<string>("blue")
  const [linkedPropertyId, setLinkedPropertyId] = React.useState<string>("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!date.trim() || !description.trim()) return
    const linked = propertyOptions.find((p) => p.holdingId === linkedPropertyId)
    onAdd({
      date: date.trim(),
      subject: subject.trim() || undefined,
      description: description.trim(),
      color: color || "blue",
      linkedPropertyId: linkedPropertyId || undefined,
      linkedPropertyTitle: linked?.title,
    })
    setDate("")
    setSubject("")
    setDescription("")
    setColor("blue")
    setLinkedPropertyId("")
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-[40vw] min-w-[280px] max-w-[520px] flex-col gap-0 overflow-hidden rounded-l-2xl border-l shadow-xl"
      >
        <SheetHeader className="shrink-0 pb-4">
          <SheetTitle className="flex items-center gap-2">
            <BellPlus className="size-5 text-primary" />
            Add reminder
          </SheetTitle>
          <SheetDescription>
            Create a custom reminder with date, subject, color and more. When the date arrives, check your Notifications or this calendar.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto py-1 pr-1">
            <div className="space-y-4">
              <div>
                <Label htmlFor="rem-date">Date</Label>
                <Input id="rem-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 rounded-lg" required />
              </div>
              <div>
                <Label htmlFor="rem-subject">Subject</Label>
                <Input id="rem-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Handover inspection" className="mt-1 rounded-lg" />
              </div>
              <div>
                <Label htmlFor="rem-desc">Description</Label>
                <Input id="rem-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Follow up with developer" className="mt-1 rounded-lg" required />
              </div>
              <div>
                <Label>Color</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {REMINDER_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setColor(c.value)}
                      className={cn(
                        "h-8 w-8 rounded-full border-2 transition-all hover:scale-110",
                        c.bg,
                        color === c.value ? "border-foreground ring-2 ring-offset-2 ring-offset-background ring-foreground/30" : "border-transparent"
                      )}
                      title={c.label}
                      aria-label={`Color ${c.label}`}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="rem-property">Linked property (optional)</Label>
                <Select value={linkedPropertyId || "none"} onValueChange={(v) => setLinkedPropertyId(v === "none" ? "" : v)}>
                  <SelectTrigger id="rem-property" className="mt-1 rounded-lg">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {propertyOptions.map((o) => (
                      <SelectItem key={o.holdingId} value={o.holdingId}>
                        <span className="truncate">{o.title}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <SheetFooter className="mt-4 shrink-0 border-t border-gray-200 pt-4 dark:border-border">
            <Button type="submit" className="rounded-lg" disabled={!date.trim() || !description.trim()}>
              Add reminder
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-lg">
              Cancel
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

/* ─── Payments History (grouped by month, timeline) ────────── */

function PaymentsHistorySection({
  historyMilestones,
  historySearch,
  onSearchChange,
}: {
  historyMilestones: Milestone[]
  historySearch: string
  onSearchChange: (v: string) => void
}) {
  const grouped = React.useMemo(() => {
    const byMonth = new Map<string, Milestone[]>()
    for (const m of historyMilestones) {
      const d = m.paidDate ?? m.dueDate ?? ""
      if (!d) continue
      const [y, mo] = d.split("-")
      const key = `${y}-${mo}`
      if (!byMonth.has(key)) byMonth.set(key, [])
      byMonth.get(key)!.push(m)
    }
    for (const arr of byMonth.values()) {
      arr.sort((a, b) => (b.paidDate ?? b.dueDate ?? "").localeCompare(a.paidDate ?? a.dueDate ?? ""))
    }
    const keys = Array.from(byMonth.keys()).sort((a, b) => b.localeCompare(a))
    return keys.map((key) => {
      const [y, mo] = key.split("-")
      const monthLabel = new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })
      return { key, monthLabel, items: byMonth.get(key)! }
    })
  }, [historyMilestones])

  return (
    <div className="rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-border dark:bg-card overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">Payment history</CardTitle>
        <CardDescription>Paid milestones. Filter by date or property in the toolbar, or search below.</CardDescription>
        <div className="relative mt-3 max-w-sm">
          <Input
            placeholder="Search by label or property..."
            value={historySearch}
            onChange={(e) => onSearchChange(e.target.value)}
            className="rounded-lg pl-9"
          />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {historyMilestones.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No paid milestones match your filters.</p>
        ) : (
          <div className="relative space-y-8">
            {grouped.map(({ key, monthLabel, items }) => (
              <div key={key}>
                <div className="sticky top-0 z-10 flex items-center gap-3 py-2">
                  <div className="h-px flex-1 bg-gray-200 dark:bg-border" />
                  <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{monthLabel}</span>
                  <div className="h-px flex-1 bg-gray-200 dark:bg-border" />
                </div>
                <div className="relative mt-4 space-y-0">
                  {items.map((m, idx) => (
                    <div key={m.id} className="relative flex">
                      {/* Timeline line */}
                      {idx < items.length - 1 && (
                        <div className="absolute left-[11px] top-10 bottom-0 w-px bg-emerald-200 dark:bg-emerald-800/60" />
                      )}
                      <div className="relative z-10 flex shrink-0 pt-1">
                        <div className="flex size-6 items-center justify-center rounded-full border-2 border-emerald-500 bg-white dark:bg-card dark:border-emerald-500" />
                      </div>
                      <div className="ml-4 flex-1 pb-6">
                        <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 shadow-sm transition-shadow hover:shadow dark:border-border dark:bg-muted/30">
                          <div className="flex flex-wrap items-center justify-between gap-3 sm:flex-nowrap">
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium text-foreground">{m.propertyTitle}</p>
                              <p className="text-sm text-muted-foreground">{m.label}</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-3">
                              <Badge className="rounded-md border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                                Paid
                              </Badge>
                              <span className="text-base font-semibold tabular-nums">{formatAED(m.amount)}</span>
                              <span className="text-sm text-muted-foreground">{formatDateFull(m.paidDate)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </div>
  )
}

/* ─── Calendar view: paid (green), upcoming (neutral), overdue (red), reminder (blue) ─── */

function PaymentsCalendarView({
  milestones,
  allMilestonesForMonth,
  month,
  year,
  onMonthChange,
  customReminders,
  onReminderRemove,
  onCellClick,
  onAddReminderClick,
  propertyOptions,
}: {
  milestones: Milestone[]
  allMilestonesForMonth: Milestone[]
  month: number
  year: number
  onMonthChange: (month: number, year: number) => void
  customReminders: CustomReminder[]
  onReminderRemove: (id: string) => void
  onCellClick: (dateKey: string, milestone: Milestone) => void
  onAddReminderClick: () => void
  propertyOptions: { holdingId: string; title: string }[]
}) {
  const cells = getMonthDays(year, month)
  const byDay = React.useMemo(() => {
    const map = new Map<string, { milestones: Milestone[]; reminders: CustomReminder[] }>()
    for (const m of allMilestonesForMonth) {
      const dateStr = m.dueDate || m.paidDate
      if (!dateStr) continue
      const [y, mo, d] = dateStr.split("-").map(Number)
      if (y !== year || mo !== month + 1) continue
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
      if (!map.has(key)) map.set(key, { milestones: [], reminders: [] })
      map.get(key)!.milestones.push(m)
    }
    for (const r of customReminders) {
      const [y, mo, d] = r.date.split("-").map(Number)
      if (y !== year || mo !== month + 1) continue
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
      if (!map.has(key)) map.set(key, { milestones: [], reminders: [] })
      map.get(key)!.reminders.push(r)
    }
    return map
  }, [allMilestonesForMonth, customReminders, year, month])

  const monthLabel = new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  return (
    <div className="rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-border dark:bg-card overflow-hidden">
      <div className="flex flex-row flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-4 dark:border-border">
        <CardTitle className="text-lg">Calendar</CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 rounded-lg"
            onClick={onAddReminderClick}
          >
            <BellPlus className="size-4" />
            Add reminder
          </Button>
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50/50 p-0.5 dark:border-border dark:bg-muted/50">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-md"
              onClick={() => {
                if (month === 0) onMonthChange(11, year - 1)
                else onMonthChange(month - 1, year)
              }}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-[140px] text-center text-sm font-semibold">{monthLabel}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-md"
              onClick={() => {
                if (month === 11) onMonthChange(0, year + 1)
                else onMonthChange(month + 1, year)
              }}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
      <CardContent className="p-3 sm:p-4">
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-muted-foreground">
          {weekDays.map((d) => (
            <div key={d}>{d}</div>
          ))}
          {cells.map((d, i) => {
            if (d == null) return <div key={i} className="min-h-[64px] sm:min-h-[88px] rounded-xl" />
            const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
            const { milestones: dayMilestones, reminders: dayReminders } = byDay.get(dateKey) ?? { milestones: [], reminders: [] }
            const isOverdue = dateKey < TODAY
            const isToday = dateKey === TODAY
            const hasPaid = dayMilestones.some((m) => m.status === "paid")
            const hasUnpaid = dayMilestones.some((m) => m.status !== "paid")
            const hasReminder = dayReminders.length > 0
            const cellVariant =
              hasUnpaid && isOverdue
                ? "overdue"
                : hasPaid && !hasUnpaid
                  ? "paid"
                  : hasUnpaid && !isOverdue
                    ? "upcoming"
                    : hasReminder
                      ? "reminder"
                      : "neutral"

            return (
              <div
                key={i}
                className={cn(
                  "min-h-[64px] rounded-xl border p-1.5 shadow-sm transition-all sm:min-h-[88px] sm:p-2",
                  "hover:shadow-md",
                  isToday && "ring-2 ring-primary/40",
                  cellVariant === "overdue" && "border-rose-200 bg-rose-50/80 dark:border-rose-800 dark:bg-rose-950/30",
                  cellVariant === "paid" && "border-emerald-200 bg-emerald-50/60 dark:border-emerald-800/50 dark:bg-emerald-950/20",
                  cellVariant === "upcoming" && "border-primary/20 bg-primary/5 dark:border-primary/30 dark:bg-primary/10",
                  cellVariant === "reminder" && !hasUnpaid && !hasPaid && "border-blue-200 bg-blue-50/60 dark:border-blue-800/50 dark:bg-blue-950/20",
                  cellVariant === "neutral" && "border-gray-100 bg-gray-50/30 dark:border-border dark:bg-muted/20"
                )}
              >
                <span className={cn("text-sm font-medium", isToday && "text-primary")}>{d}</span>
                <div className="mt-1 space-y-0.5 overflow-hidden">
                  {dayMilestones.slice(0, 2).map((m) => {
                    const paid = m.status === "paid"
                    const overdue = !paid && m.dueDate && m.dueDate < TODAY
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => onCellClick(dateKey, m)}
                        className={cn(
                          "w-full truncate rounded-md px-1.5 py-0.5 text-left text-[10px] transition-all sm:text-xs hover:opacity-90",
                          paid && "bg-emerald-200/80 text-emerald-900 dark:bg-emerald-800/80 dark:text-emerald-100",
                          overdue && "bg-rose-200/80 text-rose-900 dark:bg-rose-800/80 dark:text-rose-100",
                          !paid && !overdue && "bg-primary/15 text-primary-foreground dark:bg-primary/25"
                        )}
                        title={`${m.label} - ${formatAED(m.amount)} (click to edit)`}
                      >
                        {m.label} {formatAED(m.amount)}
                      </button>
                    )
                  })}
                  {dayReminders.slice(0, 2).map((r) => (
                    <div
                      key={r.id}
                      className={cn(
                        "flex items-center gap-0.5 truncate rounded-md px-1.5 py-0.5 text-[10px] sm:text-xs",
                        getReminderColorClasses(r.color)
                      )}
                      title={[r.subject, r.description].filter(Boolean).join(" — ")}
                    >
                      <span className="truncate">{r.subject || r.description}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onReminderRemove(r.id)
                        }}
                        className="shrink-0 rounded p-0.5 opacity-80 hover:opacity-100"
                        aria-label="Remove reminder"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                  {(dayMilestones.length + dayReminders.length) > 4 && (
                    <span className="text-[10px] text-muted-foreground">
                      +{dayMilestones.length + dayReminders.length - 4}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </div>
  )
}
