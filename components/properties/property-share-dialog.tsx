"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { toast } from "sonner"
import { Search, Sparkles, UsersRound } from "lucide-react"

import type { Property } from "@/lib/types"
import { mockInvestors } from "@/lib/mock-data"
import { matchInvestorsToProperty } from "@/lib/property-matching"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface PropertyShareDialogProps {
  property: Property | null
  open: boolean
  onOpenChange: (open: boolean) => void
  initialInvestorIds?: string[]
  onShared?: (payload: { investorIds: string[]; propertyId: string }) => void
}

function formatPrice(price?: number) {
  if (!price) return "Price on request"
  if (price >= 1_000_000) return `AED ${(price / 1_000_000).toFixed(1)}M`
  return `AED ${(price / 1_000).toFixed(0)}K`
}

export function PropertyShareDialog({ property, open, onOpenChange, initialInvestorIds, onShared }: PropertyShareDialogProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(initialInvestorIds ?? [])
  const [searchQuery, setSearchQuery] = useState("")
  const [message, setMessage] = useState("")
  const [sharing, setSharing] = useState(false)

  const investors = mockInvestors

  const aiMatches = useMemo(() => matchInvestorsToProperty(property, investors).slice(0, 3), [property, investors])

  const filteredInvestors = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) return investors.slice(0, 8)
    return investors
      .filter((inv) => {
        const haystack = `${inv.name} ${inv.company}`.toLowerCase()
        return haystack.includes(query)
      })
      .slice(0, 8)
  }, [investors, searchQuery])

  useEffect(() => {
    if (!open) return
    setSelectedIds(initialInvestorIds ?? [])
    setMessage("")
    setSearchQuery("")
  }, [open, initialInvestorIds])

  const toggleInvestor = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  const investorLabel = (ids: string[]) =>
    investors
      .filter((inv) => ids.includes(inv.id))
      .map((inv) => inv.name)
      .join(", ")

  const copyLink = async (shareUrl: string, title: string) => {
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) return
    try {
      await navigator.clipboard.writeText(`${title} — ${shareUrl}`)
    } catch {
      // ignore clipboard failures
    }
  }

  const handleShare = async (ids: string[]) => {
    if (!property || ids.length === 0) return
    setSharing(true)
    try {
      const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
      const shareUrl = `${baseUrl}/properties/${property.id}`
      await copyLink(shareUrl, property.title)
      toast.success(`Shared ${property.title}`, {
        description: `Sent to ${investorLabel(ids)}${message ? ` · “${message}”` : ""}`,
        duration: 5000,
      })
      onShared?.({ investorIds: ids, propertyId: property.id })
      onOpenChange(false)
    } finally {
      setSharing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl overflow-hidden border border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <DialogHeader className="space-y-2">
          <DialogTitle>Share property with investors</DialogTitle>
          <DialogDescription>Select one or more investors and send this property with AI-guided matches.</DialogDescription>
        </DialogHeader>

        {!property ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Select a property to share.</div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-2xl border bg-muted/20 p-4">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="relative h-32 w-full overflow-hidden rounded-xl sm:w-40">
                  <Image src={property.imageUrl || "/placeholder.svg"} alt={property.title} fill className="object-cover" sizes="160px" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {property.type}
                    </Badge>
                    <Badge variant="secondary">{property.readinessStatus.replace(/_/g, " ")}</Badge>
                  </div>
                  <div>
                    <p className="text-lg font-semibold">{property.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {property.area} · {formatPrice(property.price)}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {property.features?.slice(0, 3).join(" • ") || "No highlights captured yet"}
                  </div>
                </div>
              </div>
            </div>

            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-emerald-500/10 p-2 text-emerald-600">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium">AI suggested matches</p>
                  <p className="text-sm text-muted-foreground">Top investors based on mandate fit, area focus, and ticket size.</p>
                </div>
              </div>
              {aiMatches.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  No perfect matches yet — try manual share below.
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-3">
                  {aiMatches.map(({ investor, score, reasons }) => (
                    <div key={investor.id} className="rounded-xl border p-4 shadow-sm">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={investor.avatar} />
                          <AvatarFallback>{investor.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-semibold leading-tight">{investor.name}</p>
                          <p className="text-xs text-muted-foreground">{investor.company}</p>
                        </div>
                      </div>
                      <div className="mt-3 text-xs font-medium text-emerald-600">Match score {score}/100</div>
                      <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {reasons.slice(0, 3).map((reason) => (
                          <li key={reason} className="flex items-start gap-1.5">
                            <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                      <Button className="mt-3 w-full" size="sm" onClick={() => handleShare([investor.id])} disabled={sharing}>
                        Share with {investor.name.split(" ")[0]}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-muted p-2 text-muted-foreground">
                  <UsersRound className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium">Share with other investors</p>
                  <p className="text-sm text-muted-foreground">Search, multi-select, and add an optional note.</p>
                </div>
                <div className="ml-auto text-xs text-muted-foreground">{selectedIds.length} selected</div>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or company"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="space-y-2">
                {filteredInvestors.map((investor) => (
                  <label
                    key={investor.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm hover:bg-muted/40"
                  >
                    <Checkbox checked={selectedIds.includes(investor.id)} onCheckedChange={() => toggleInvestor(investor.id)} />
                    <div className="flex-1">
                      <div className="font-medium">{investor.name}</div>
                      <p className="text-xs text-muted-foreground">{investor.company}</p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {investor.segment?.replace(/_/g, " ") ?? "investor"}
                    </Badge>
                  </label>
                ))}
                {filteredInvestors.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No investors found.</div>
                ) : null}
              </div>

              <Textarea
                placeholder="Optional note (e.g. “This matches your Core Plus ticket for Q1.”)"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />

              <Button onClick={() => handleShare(selectedIds)} disabled={!selectedIds.length || sharing}>
                Share selection
              </Button>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}


