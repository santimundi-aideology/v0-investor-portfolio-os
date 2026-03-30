"use client"

import * as React from "react"
import { toast } from "sonner"
import { usePathname, useSearchParams } from "next/navigation"

import { useBreadcrumbs } from "@/components/providers/app-provider"
import { ContextPanel } from "@/components/layout/context-panel"
import { ScopedInvestorGuard } from "@/components/security/scoped-investor-guard"
import { RoleRedirect } from "@/components/security/role-redirect"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  BarChart3,
  Banknote,
  Building2,
  Calendar,
  FolderKanban,
  Globe,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Phone,
  Target,
  TrendingUp,
  UserCircle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EditableAvatar } from "@/components/ui/editable-avatar"

import type { DealRoom, Investor, Memo, Property, ShortlistItem, Task } from "@/lib/types"
import { MandateTab } from "@/components/investors/tabs/mandate-tab"
import { OpportunitiesTab } from "@/components/investors/tabs/opportunities-tab"
import { DealRoomsTab } from "@/components/investors/tabs/deal-rooms-tab"
import { PropertiesTab } from "@/components/investors/tabs/properties-tab"
import { PaymentsTab } from "@/components/investors/tabs/payments-tab"
import { InvestorRecommendedProperties } from "@/components/investors/investor-recommended-properties"
import { PropertyShareDialog } from "@/components/properties/property-share-dialog"
import { ContextualAICard } from "@/components/ai/contextual-ai-card"
import { useAPI } from "@/lib/hooks/use-api"

export function InvestorDetail({
  investor,
  shortlist,
  memos,
  tasks,
  dealRooms,
}: {
  investor: Investor
  shortlist: ShortlistItem[]
  memos: Memo[]
  tasks: Task[]
  dealRooms: DealRoom[]
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const basePath = pathname?.startsWith("/realtor") ? "/realtor" : ""

  const [shareConfig, setShareConfig] = React.useState<{ property: Property; investorIds?: string[] } | null>(null)

  const { data: oppData } = useAPI<{ opportunities: Array<{ id: string }>; counts: { total: number } }>(
    investor.id ? `/api/investors/${investor.id}/opportunities` : null
  )
  const opportunityCount = oppData?.counts?.total ?? 0

  const tabParam = searchParams?.get("tab")
  const defaultTab = tabParam === "opportunities"
    ? "opportunities"
    : opportunityCount > 0
      ? "opportunities"
      : "mandate"

  const openShareDialog = React.useCallback(
    (property: Property, investorId?: string) => {
      setShareConfig({ property, investorIds: investorId ? [investorId] : undefined })
    },
    [],
  )

  const crumbs = React.useMemo(
    () => [
      { label: "Investors", href: `${basePath}/investors` },
      { label: investor.name },
    ],
    [investor.name, basePath],
  )
  useBreadcrumbs(crumbs)

  const statusLabel =
    investor.status === "active" ? "Active" : investor.status === "pending" ? "Watching" : "Closed"

  const statusClass =
    investor.status === "active"
      ? "bg-green-50 text-green-600 border-green-200"
      : investor.status === "pending"
        ? "bg-amber-50 text-amber-600 border-amber-200"
        : "bg-gray-100 text-gray-500"

  const formattedLastContact = React.useMemo(() => {
    if (!investor.lastContact) return "Unknown"
    try {
      const d = new Date(investor.lastContact)
      if (Number.isNaN(d.getTime())) return investor.lastContact
      const now = new Date()
      const diffMs = now.getTime() - d.getTime()
      const diffDays = Math.floor(diffMs / 86_400_000)
      if (diffDays === 0) return "Today"
      if (diffDays === 1) return "Yesterday"
      if (diffDays < 7) return `${diffDays} days ago`
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    } catch {
      return investor.lastContact
    }
  }, [investor.lastContact])

  const profileRows: Array<{ icon: React.ComponentType<{ className?: string }>; label: string; value: string | undefined }> = [
    { icon: UserCircle,    label: "Segment",          value: investor.segment?.replace(/_/g, " ") },
    { icon: Globe,         label: "Location",          value: investor.location ?? undefined },
    { icon: MessageSquare, label: "Preferred contact", value: investor.preferredContactMethod ?? undefined },
    { icon: Banknote,      label: "AUM",               value: typeof investor.aumAed === "number" ? `AED ${(investor.aumAed / 1_000_000).toFixed(0)}M` : undefined },
  ]


  return (
    <>
      {/* Internal-only: investors must never see internal CRM views */}
      <RoleRedirect allow={["owner", "admin", "realtor"]} redirectTo="/realtor/dashboard" />

      <ScopedInvestorGuard investorId={investor.id}>
        <div className="space-y-6">

          {/* ── Hero card ── */}
          <Card className="overflow-hidden border-gray-100 shadow-sm">
            <div className="h-1.5 w-full bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400" />
            <CardContent className="p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">

                {/* Left: avatar + identity */}
                <div className="flex items-start gap-4">
                  <EditableAvatar
                    storageKey={`investor:${investor.id}`}
                    name={investor.name}
                    src={investor.avatar}
                    size={56}
                    onPersist={async (next) => {
                      try {
                        const res = await fetch(`/api/investors/${investor.id}`, {
                          method: "PATCH",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify({ avatar: next }),
                        })
                        if (!res.ok) throw new Error("Failed")
                      } catch {
                        toast.message("Saved locally", {
                          description: "Photo is saved on this device (server persistence not configured).",
                        })
                      }
                    }}
                    className="ring-2 ring-white shadow-md shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-2xl font-bold tracking-tight text-gray-900">{investor.name}</h1>
                      <Badge variant="outline" className={statusClass}>{statusLabel}</Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-gray-500">{investor.company}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                      {investor.email && (
                        <a href={`mailto:${investor.email}`} className="flex items-center gap-1 hover:text-gray-700 transition-colors">
                          <Mail className="h-3.5 w-3.5" />
                          <span>{investor.email}</span>
                        </a>
                      )}
                      {investor.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" />
                          <span>{investor.phone}</span>
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Last contact: {formattedLastContact}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: actions */}
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Button asChild className="bg-green-500 hover:bg-green-600 text-white">
                    <a href={`${basePath}/recommendations/new?investorId=${investor.id}`}>+ New Recommendation</a>
                  </Button>
                  <Button variant="outline" asChild>
                    <a href={`${basePath}/memos/new?investorId=${investor.id}`}>Generate IC Memo</a>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuItem asChild>
                        <a href={`${basePath}/investors/${investor.id}/analytics`} className="flex items-center gap-2">
                          <BarChart3 className="h-4 w-4" />
                          Portfolio Analytics
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a href={`${basePath}/properties/new?investorId=${investor.id}&returnTo=investor`} className="flex items-center gap-2">
                          Add candidate property
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a href={`/tasks?investorId=${investor.id}`} className="flex items-center gap-2">
                          Add task
                        </a>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Stats row */}
              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-gray-100 pt-5 sm:grid-cols-4">
                <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-3">
                  <Building2 className="h-5 w-5 shrink-0 text-green-500" />
                  <div>
                    <div className="text-xl font-bold text-gray-900">{shortlist.length}</div>
                    <div className="text-xs text-gray-500">Properties</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-3">
                  <FolderKanban className="h-5 w-5 shrink-0 text-purple-500" />
                  <div>
                    <div className="text-xl font-bold text-gray-900">{dealRooms.filter((d) => d.status !== "completed").length}</div>
                    <div className="text-xs text-gray-500">Active Deals</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-3">
                  <TrendingUp className="h-5 w-5 shrink-0 text-blue-500" />
                  <div>
                    <div className="text-sm font-bold text-gray-900 leading-tight">{investor.mandate?.strategy ?? "—"}</div>
                    <div className="text-xs text-gray-500">Strategy</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-3">
                  <Target className="h-5 w-5 shrink-0 text-amber-500" />
                  <div>
                    <div className="text-sm font-bold text-gray-900 leading-tight">{investor.mandate?.yieldTarget ?? "—"}</div>
                    <div className="text-xs text-gray-500">Target Yield</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Main grid ── */}
          <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
            <div className="space-y-6 min-w-0">
              <Tabs defaultValue={defaultTab} key={defaultTab} className="space-y-4">
                <TabsList className="border border-gray-100 bg-gray-50/80 h-10">
                  <TabsTrigger value="mandate">Mandate</TabsTrigger>
                  <TabsTrigger value="opportunities" className="gap-1.5">
                    Opportunities
                    {opportunityCount > 0 && (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-green-500 px-1.5 text-[10px] font-bold text-white">
                        {opportunityCount}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="dealRooms">Deal Rooms ({dealRooms.filter((d) => d.status !== "completed").length})</TabsTrigger>
                  <TabsTrigger value="properties">Properties ({shortlist.length})</TabsTrigger>
                  <TabsTrigger value="payments">Payments</TabsTrigger>
                </TabsList>

                <TabsContent value="mandate">
                  <MandateTab mandate={investor.mandate} />
                </TabsContent>

                <TabsContent value="opportunities">
                  <OpportunitiesTab investorId={investor.id} />
                </TabsContent>

                <TabsContent value="dealRooms">
                  <DealRoomsTab dealRooms={dealRooms} />
                </TabsContent>

                <TabsContent value="properties">
                  <PropertiesTab items={shortlist} investorId={investor.id} />
                </TabsContent>

                <TabsContent value="payments">
                  <PaymentsTab investorId={investor.id} />
                </TabsContent>
              </Tabs>

              {/* AI Investor Matching Assistant */}
              <ContextualAICard
                agentId="investor_matching"
                title="Investor Matching"
                description="Find properties that match this investor's mandate"
                suggestions={[
                  "Find properties for this investor",
                  "Score mandate fit for new listings",
                  "What's missing in their portfolio?"
                ]}
                investorId={investor.id}
              />

              <InvestorRecommendedProperties investor={investor} onShare={(property) => openShareDialog(property, investor.id)} />
            </div>

            {/* ── Sidebar ── */}
            <ContextPanel title="Context">
              {/* Profile facts */}
              <Card className="border-gray-100">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold text-gray-700">Profile</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-0">
                  {profileRows.map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <span className="flex items-center gap-1.5 text-xs text-gray-400">
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        {label}
                      </span>
                      <span className="text-xs font-medium text-gray-700 capitalize">{value ?? "—"}</span>
                    </div>
                  ))}
                  {investor.tags?.length ? (
                    <div className="flex flex-wrap gap-1.5 pt-3">
                      {investor.tags.slice(0, 6).map((t) => (
                        <Badge key={t} variant="secondary" className="rounded-full text-xs font-normal">{t}</Badge>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              {/* Mandate snapshot */}
              {investor.mandate && (
                <Card className="border-gray-100">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm font-semibold text-gray-700">Mandate snapshot</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg bg-green-50 p-2.5">
                        <div className="text-[10px] text-gray-400 uppercase tracking-wide">Strategy</div>
                        <div className="mt-0.5 text-xs font-semibold text-green-700 leading-tight">{investor.mandate.strategy || "—"}</div>
                      </div>
                      <div className="rounded-lg bg-blue-50 p-2.5">
                        <div className="text-[10px] text-gray-400 uppercase tracking-wide">Target Yield</div>
                        <div className="mt-0.5 text-xs font-semibold text-blue-700 leading-tight">{investor.mandate.yieldTarget || "—"}</div>
                      </div>
                    </div>
                    {investor.mandate.preferredAreas?.length ? (
                      <div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5">Preferred areas</div>
                        <div className="flex flex-wrap gap-1">
                          {investor.mandate.preferredAreas.slice(0, 4).map((a) => (
                            <Badge key={a} variant="secondary" className="rounded-full text-xs font-normal py-0 h-5">{a}</Badge>
                          ))}
                          {investor.mandate.preferredAreas.length > 4 && (
                            <Badge variant="outline" className="rounded-full text-xs py-0 h-5">+{investor.mandate.preferredAreas.length - 4}</Badge>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              )}

              {/* Relationship notes */}
              <Card className="border-gray-100">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold text-gray-700">Relationship notes</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {investor.notes ? (
                    <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{investor.notes}</p>
                  ) : (
                    <p className="text-xs text-gray-400 italic">No notes yet. Add relationship notes via Edit profile.</p>
                  )}
                </CardContent>
              </Card>
            </ContextPanel>
          </div>
        </div>
      </ScopedInvestorGuard>

      <PropertyShareDialog
        property={shareConfig?.property ?? null}
        initialInvestorIds={shareConfig?.investorIds}
        open={!!shareConfig}
        onOpenChange={(open) => {
          if (!open) setShareConfig(null)
        }}
      />
    </>
  )
}
