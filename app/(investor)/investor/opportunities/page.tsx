"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Building2,
  ChevronRight,
  ExternalLink,
  Heart,
  Loader2,
  MapPin,
  MessageSquare,
  Maximize2,
  Minimize2,
  Search,
  Sparkles,
  ThumbsDown,
  Clock3,
  User,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { InvestorImage } from "@/components/investor/investor-image"
import { OpportunitiesChatPanel } from "@/components/investor/opportunities-chat-panel"
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatAED } from "@/lib/real-estate"
import { cn } from "@/lib/utils"
import { useAPI } from "@/lib/hooks/use-api"
import { useApp } from "@/components/providers/app-provider"
import { toast } from "sonner"
import {
  OpportunitiesFavouritesSection,
  getStoredLinkFavourites,
  setStoredLinkFavourites,
  type LinkFavourite,
  type FavouriteStatus,
} from "@/components/investor/opportunities-favourites-section"

type OpportunityProperty = {
  title: string | null
  area: string | null
  type: string | null
  price: number | null
  size: number | null
  bedrooms: number | null
  imageUrl: string | null
  developer: string | null
  expectedRent: number | null
}

type Opportunity = {
  id: string
  investorId: string
  listingId: string
  status: string
  decision: string
  decisionAt: string | null
  decisionNote: string | null
  sharedBy: string
  sharedByName: string | null
  sharedAt: string
  sharedMessage: string | null
  matchScore: number | null
  matchReasons: string[]
  memoId: string | null
  dealRoomId: string | null
  messageCount: number
  property: OpportunityProperty | null
}

type OpportunityCounts = {
  recommended: number
  interested: number
  veryInterested: number
  pipeline: number
  rejected: number
  total: number
}

const statusConfig: Record<string, { label: string; color: string }> = {
  recommended: { label: "Recommended", color: "bg-emerald-500/20 text-emerald-200 border-emerald-400/30" },
  shortlisted: { label: "Shortlisted", color: "bg-blue-500/20 text-blue-200 border-blue-400/30" },
  memo_review: { label: "Memo Review", color: "bg-purple-500/20 text-purple-200 border-purple-400/30" },
  deal_room: { label: "Deal Room", color: "bg-amber-500/20 text-amber-200 border-amber-400/30" },
  acquired: { label: "Acquired", color: "bg-green-500/20 text-green-200 border-green-400/30" },
  rejected: { label: "Rejected", color: "bg-white/10 text-white/60 border-white/20" },
}

function getUiDecision(decision: string, decisionAt: string | null): "interested" | "not_now" | "pass" | null {
  if (decision === "interested" || decision === "very_interested") return "interested"
  if (decision === "not_interested") return "pass"
  if (decision === "pending" && decisionAt) return "not_now"
  return null
}

const DUBAI_REAL_ESTATE_SITES = [
  { name: "Bayut", url: "https://www.bayut.com", description: "Dubai property listings" },
  { name: "Property Finder", url: "https://www.propertyfinder.ae", description: "UAE real estate" },
  { name: "Dubizzle", url: "https://www.dubizzle.com/property-for-sale/", description: "Classifieds & property" },
  { name: "Dubai Land Dept", url: "https://dubailand.gov.ae/", description: "Official portal" },
]

function OpportunityCard({
  opportunity,
  onDecision,
}: {
  opportunity: Opportunity
  onDecision: (id: string, decision: string, note?: string) => void
}) {
  const router = useRouter()
  const p = opportunity.property
  const st = statusConfig[opportunity.status] ?? statusConfig.recommended
  const uiDecision = getUiDecision(opportunity.decision, opportunity.decisionAt)
  const primaryHref = opportunity.memoId
    ? `/investor/memos/${opportunity.memoId}`
    : `/investor/opportunities/${opportunity.id}`

  return (
    <div
      className={cn(
        "group overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm transition-all hover:bg-white/10 hover:border-white/20"
      )}
    >
      <div
        className="relative aspect-[4/3] cursor-pointer overflow-hidden bg-black/20"
        onClick={() => router.push(primaryHref)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            router.push(primaryHref)
          }
        }}
      >
        <InvestorImage
          src={p?.imageUrl}
          alt={p?.title ?? "Property"}
          lazy
          aspectRatio="4/3"
          className="absolute inset-0 h-full w-full"
          imageClassName="transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-semibold text-white text-sm truncate">
            {p?.title ?? "Property"}
          </h3>
          {p?.area && (
            <div className="flex items-center gap-1 text-xs text-white/80 mt-0.5">
              <MapPin className="size-3.5 shrink-0" />
              {p.area}
            </div>
          )}
        </div>
        <Badge variant="outline" className={cn("absolute top-3 right-3 text-[10px]", st.color)}>
          {st.label}
        </Badge>
      </div>

      <div className="p-4 space-y-3 border-t border-white/10">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="border border-white/10 bg-white/5 py-2">
            <p className="text-[10px] text-white/60 uppercase tracking-wider">Price</p>
            <p className="text-sm font-semibold text-white">
              {p?.price ? formatAED(p.price) : "—"}
            </p>
          </div>
          <div className="border border-white/10 bg-white/5 py-2">
            <p className="text-[10px] text-white/60 uppercase tracking-wider">Size</p>
            <p className="text-sm font-semibold text-white">
              {p?.size ? `${p.size} sqm` : "—"}
            </p>
          </div>
          <div className="border border-white/10 bg-white/5 py-2">
            <p className="text-[10px] text-white/60 uppercase tracking-wider">Beds</p>
            <p className="text-sm font-semibold text-white">{p?.bedrooms ?? "—"}</p>
          </div>
        </div>

        {opportunity.matchScore != null && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-emerald-500/20 text-emerald-200 border-emerald-400/30 text-[10px]">
              {opportunity.matchScore}% match
            </Badge>
          </div>
        )}

        <div className="text-xs text-white/70">
          By <span className="font-medium text-white/90">{opportunity.sharedByName ?? "Sarah"}</span>
          {" · "}
          {new Date(opportunity.sharedAt).toLocaleDateString()}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10" onClick={(e) => e.stopPropagation()}>
          <Button
            variant={uiDecision === "interested" ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500 border-0"
            onClick={() => onDecision(opportunity.id, "interested")}
          >
            <Heart className="size-3.5" />
            Interested
          </Button>
          <Button
            variant={uiDecision === "not_now" ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs gap-1.5 border-white/30 !text-black hover:bg-white/10 hover:!text-black"
            onClick={() => onDecision(opportunity.id, "not_now")}
          >
            <Clock3 className="size-3.5" />
            Not now
          </Button>
          <Button
            variant={uiDecision === "pass" ? "destructive" : "outline"}
            size="sm"
            className="h-8 text-xs gap-1.5 border-white/30 !text-black hover:bg-red-500/20 hover:border-red-400/30 hover:!text-black"
            onClick={() => onDecision(opportunity.id, "pass")}
          >
            <ThumbsDown className="size-3.5" />
            Pass
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 ml-auto text-white/80 hover:text-white hover:bg-white/10" asChild>
            <Link href={`/investor/opportunities/${opportunity.id}`}>
              <MessageSquare className="size-3.5" />
              Chat ({opportunity.messageCount})
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function InvestorOpportunitiesPage() {
  const { scopedInvestorId } = useApp()
  const [linkFavourites, setLinkFavourites] = React.useState<LinkFavourite[]>([])

  React.useEffect(() => {
    setLinkFavourites(getStoredLinkFavourites(scopedInvestorId ?? null))
  }, [scopedInvestorId])

  const investorApiUrl = scopedInvestorId
    ? `/api/investor/opportunities?investorId=${scopedInvestorId}`
    : null

  const {
    data: apiData,
    isLoading,
    mutate,
  } = useAPI<{ opportunities: Opportunity[]; counts: OpportunityCounts }>(
    investorApiUrl
  )

  const opportunities = apiData?.opportunities ?? []
  const counts = apiData?.counts ?? {
    recommended: 0,
    interested: 0,
    veryInterested: 0,
    pipeline: 0,
    rejected: 0,
    total: 0,
  }

  const [activeTab, setActiveTab] = React.useState("new")

  const handleDecision = async (id: string, decision: string, note?: string) => {
    try {
      const res = await fetch(`/api/investor/opportunities/${id}/decision`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: decision === "pass" ? "not_interested" : decision === "not_now" ? "pending" : decision,
          note,
        }),
      })
      if (!res.ok) {
        toast.error("Failed to update decision")
        return
      }
      if (decision === "interested" || decision === "very_interested") {
        setActiveTab("interested")
      }
      mutate()
    } catch (err) {
      console.error("Failed to update decision:", err)
      toast.error("Something went wrong")
    }
  }

  const newOpps = opportunities.filter(
    (o) =>
      o.status === "recommended" &&
      !["interested", "pass"].includes(getUiDecision(o.decision, o.decisionAt) ?? "")
  )
  const interestedOpps = opportunities.filter(
    (o) => getUiDecision(o.decision, o.decisionAt) === "interested"
  )
  const pipelineOpps = opportunities.filter((o) =>
    ["shortlisted", "memo_review", "deal_room"].includes(o.status)
  )
  const passedOpps = opportunities.filter(
    (o) => o.status === "rejected" || getUiDecision(o.decision, o.decisionAt) === "pass"
  )

  const [chatPanel, setChatPanel] = React.useState<null | "sarah" | "ai">(null)
  const [chatExpanded, setChatExpanded] = React.useState(false)

  const favouriteOpps = opportunities.filter(
    (o) => o.decision === "interested" || o.decision === "very_interested"
  )
  const handleAddLinkFavourite = (item: { url: string; title: string; pros: string[]; cons: string[] }) => {
    const newItem: LinkFavourite = {
      id: `link-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      ...item,
      status: "new",
      addedAt: new Date().toISOString(),
    }
    const next = [...linkFavourites, newItem]
    setLinkFavourites(next)
    setStoredLinkFavourites(scopedInvestorId ?? null, next)
  }
  const handleRemoveLinkFavourite = (id: string) => {
    const next = linkFavourites.filter((f) => f.id !== id)
    setLinkFavourites(next)
    setStoredLinkFavourites(scopedInvestorId ?? null, next)
  }
  const handleLinkFavouriteStatusChange = (id: string, status: FavouriteStatus) => {
    const next = linkFavourites.map((f) => (f.id === id ? { ...f, status } : f))
    setLinkFavourites(next)
    setStoredLinkFavourites(scopedInvestorId ?? null, next)
  }

  const handleDecisionFav = async (id: string, decision: string) => {
    try {
      const res = await fetch(`/api/investor/opportunities/${id}/decision`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: decision === "pass" ? "not_interested" : decision }),
      })
      if (!res.ok) {
        toast.error("Failed to update decision")
        return
      }
      mutate()
    } catch (err) {
      console.error("Failed to update decision:", err)
      toast.error("Something went wrong")
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-background" aria-busy="true" aria-label="Loading opportunities">
        <div className="h-[280px] bg-muted/30" />
        <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
          <div className="h-8 w-48 rounded bg-muted/50 animate-pulse" />
          <div className="mt-6 flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 w-24 rounded bg-muted/40 animate-pulse" />
            ))}
          </div>
          <div className="mt-8 flex items-center justify-center gap-2 py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
            <span className="text-sm text-muted-foreground">Loading opportunities...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background">
      {/* Hero igual que Overview: verde con imagen sutil solo arriba */}
      <div
        className="relative -mx-4 -mt-4 overflow-hidden sm:-mx-6 lg:-mx-8 lg:-mt-6"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(15,41,34,0.90) 0%, rgba(15,41,34,0.86) 50%, rgba(15,41,34,0.93) 100%), url('https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1920&q=80')",
          backgroundSize: "115%",
          backgroundPosition: "center 40%",
          backgroundColor: "#0f2922",
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(34,197,94,0.12),transparent)]" />
        <div className="relative mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
                Opportunities
              </h1>
              <p className="text-sm text-white/60 mt-1">
                Proposals from Sarah your realtor, chat with her or the AI, discover new listings and manage your favourites with AI pros &amp; cons.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 border-white/20 text-gray-900 hover:bg-white/10 hover:text-gray-900 bg-white/90"
                onClick={() => setChatPanel("sarah")}
              >
                <User className="size-4" />
                Chat with Sarah
              </Button>
              <Button
                size="sm"
                className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white border-0"
                onClick={() => setChatPanel("ai")}
              >
                <Sparkles className="size-4" />
                Consult AI
              </Button>
            </div>
          </div>

          <p className="text-xl font-semibold text-white/90">
            Sarah&apos;s proposals
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="h-auto p-0 gap-0 bg-transparent border-0 flex flex-wrap">
                <TabsTrigger
                  value="new"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-400 data-[state=active]:bg-white/10 data-[state=active]:text-white bg-white/5 text-white/80 hover:text-white hover:bg-white/10 px-4 py-2.5 text-sm font-medium"
                >
                  New ({newOpps.length})
                </TabsTrigger>
                <TabsTrigger
                  value="interested"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-400 data-[state=active]:bg-white/10 data-[state=active]:text-white bg-white/5 text-white/80 hover:text-white hover:bg-white/10 px-4 py-2.5 text-sm font-medium"
                >
                  Interested ({interestedOpps.length})
                </TabsTrigger>
                <TabsTrigger
                  value="pipeline"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-400 data-[state=active]:bg-white/10 data-[state=active]:text-white bg-white/5 text-white/80 hover:text-white hover:bg-white/10 px-4 py-2.5 text-sm font-medium"
                >
                  Pipeline ({pipelineOpps.length})
                </TabsTrigger>
                <TabsTrigger
                  value="passed"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-400 data-[state=active]:bg-white/10 data-[state=active]:text-white bg-white/5 text-white/80 hover:text-white hover:bg-white/10 px-4 py-2.5 text-sm font-medium"
                >
                  Passed ({passedOpps.length})
                </TabsTrigger>
              </TabsList>

              {[
                { value: "new", items: newOpps },
                { value: "interested", items: interestedOpps },
                { value: "pipeline", items: pipelineOpps },
                { value: "passed", items: passedOpps },
              ].map(({ value, items }) => (
                <TabsContent key={value} value={value} className="mt-0 pt-6">
                  {items.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {items.map((opp) => (
                        <OpportunityCard
                          key={opp.id}
                          opportunity={opp}
                          onDecision={handleDecision}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="border border-white/10 bg-white/5 backdrop-blur-sm p-12 text-center">
                      <Sparkles className="mx-auto size-12 text-white/30" />
                      <h3 className="mt-4 text-xl font-semibold text-white/90">
                        No {value === "new" ? "new" : value} opportunities yet
                      </h3>
                      <p className="mt-2 text-sm text-white/60">
                        {value === "new"
                          ? "Sarah will share properties here when she finds matches for you."
                          : "Update your interest on cards to move them here."}
                      </p>
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </div>
      </div>

      {/* Contenido inferior: fondo claro como Overview */}
      <div className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
        {/* Find new investments + Dubai sites */}
        <section className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Search className="size-5 text-emerald-600" />
                Find new investments
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Search Dubai listings or open top real estate portals
              </p>
            </div>
            <Button asChild className="w-full sm:w-auto h-10 gap-2 bg-emerald-600 hover:bg-emerald-500 text-white border-0">
              <Link href="/investor/opportunities/finder">
                Open finder
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {DUBAI_REAL_ESTATE_SITES.map((site) => (
              <a
                key={site.name}
                href={site.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-emerald-200 hover:shadow-md group dark:border-border dark:bg-card"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 dark:bg-emerald-950/50">
                  <ExternalLink className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 truncate dark:text-gray-100">{site.name}</p>
                  <p className="text-xs text-gray-500 truncate dark:text-gray-400">{site.description}</p>
                </div>
                <ChevronRight className="size-4 text-gray-400 shrink-0" />
              </a>
            ))}
          </div>
        </section>

        {/* My Favourites: solid content container for clear separation from background */}
        <section>
          <div className="rounded-2xl bg-gradient-to-br from-white via-emerald-50 to-white border border-emerald-100/60 shadow-lg px-8 py-10">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 mb-8">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Heart className="size-5 text-rose-500" />
                  My Favourites
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Properties you highlighted. Add a listing link to get AI pros &amp; cons.
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="w-full sm:w-auto h-9 gap-1.5 text-gray-700 border-gray-200 hover:bg-gray-50">
                <Link href="/investor/opportunities/favourites">
                  View all
                  <ChevronRight className="size-4" />
                </Link>
              </Button>
            </div>
            <OpportunitiesFavouritesSection
              opportunities={favouriteOpps.map((o) => ({
                id: o.id,
                decision: o.decision,
                decisionAt: o.decisionAt,
                status: o.status,
                matchScore: o.matchScore,
                matchReasons: o.matchReasons ?? [],
                memoId: o.memoId,
                property: o.property,
              }))}
              linkFavourites={linkFavourites}
              onDecision={handleDecisionFav}
              onAddLinkFavourite={handleAddLinkFavourite}
              onRemoveLinkFavourite={handleRemoveLinkFavourite}
              onLinkFavouriteStatusChange={handleLinkFavouriteStatusChange}
              investorId={scopedInvestorId ?? null}
              embedded
            />
          </div>
        </section>
      </div>

      {/* Chat panel: desplegable desde abajo, opción de agrandar */}
      <Sheet
        open={chatPanel !== null}
        onOpenChange={(open) => {
          if (!open) {
            setChatPanel(null)
            setChatExpanded(false)
          }
        }}
      >
        <SheetContent
          side="bottom"
          className={cn(
            "flex flex-col p-0 gap-0 left-0 right-0 mx-0 max-w-none rounded-t-2xl border-emerald-200 bg-white",
            chatExpanded ? "h-[100dvh] max-h-[100dvh]" : "h-[75vh] max-h-[75vh]"
          )}
        >
          <header className="flex items-center justify-between border-b border-emerald-100 bg-emerald-50/80 px-4 py-3 pr-12 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {chatPanel === "sarah" ? (
                <>
                  <div className="relative size-10 shrink-0 overflow-hidden rounded-full bg-emerald-100 ring-2 ring-emerald-200">
                    <Image
                      src="/professional-woman-avatar.png"
                      alt="Sarah"
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  </div>
                  <div className="min-w-0">
                    <SheetTitle className="text-base font-semibold text-gray-900 truncate">
                      Chat with Sarah
                    </SheetTitle>
                    <p className="text-xs text-emerald-700 truncate">Your realtor</p>
                  </div>
                </>
              ) : (
                <>
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <Sparkles className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <SheetTitle className="text-base font-semibold text-gray-900 truncate">
                      Consult AI
                    </SheetTitle>
                    <p className="text-xs text-emerald-700 truncate">AI Advisor</p>
                  </div>
                </>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-gray-600 hover:bg-emerald-100 hover:text-emerald-800"
              onClick={() => setChatExpanded((e) => !e)}
              aria-label={chatExpanded ? "Restaurar ventana" : "Agrandar chat"}
            >
              {chatExpanded ? (
                <Minimize2 className="size-4" />
              ) : (
                <Maximize2 className="size-4" />
              )}
            </Button>
          </header>
          <div className="flex-1 min-h-0 flex flex-col">
            {chatPanel && <OpportunitiesChatPanel mode={chatPanel} className="flex-1 min-h-0" />}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
