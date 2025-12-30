import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Building2, Calendar, Mail, Phone, Sparkles } from "lucide-react"
import type { Investor } from "@/lib/types"
import { Button } from "@/components/ui/button"

interface InvestorCardProps {
  investor: Investor
}

export function InvestorCard({ investor }: InvestorCardProps) {
  const statusColors = {
    active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    inactive: "bg-muted text-muted-foreground",
  }

  const strategy = investor.mandate?.strategy
  const yieldTarget = investor.mandate?.yieldTarget
  const preferredAreasCount = investor.mandate?.preferredAreas?.length ?? 0

  return (
    <Card className="group border-border/60 transition-all hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={investor.avatar || "/placeholder.svg"} />
              <AvatarFallback>
                {investor.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <CardTitle className="text-base">
                <Link href={`/investors/${investor.id}`} className="hover:underline">
                  {investor.name}
                </Link>
              </CardTitle>
              <div className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                <Building2 className="h-3 w-3" />
                <span className="truncate">{investor.company}</span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <Badge variant="outline" className={statusColors[investor.status]}>
              {investor.status === "active" ? "Active" : investor.status === "pending" ? "Watching" : "Closed"}
            </Badge>
            {strategy ? (
              <Badge variant="secondary" className="hidden sm:inline-flex">
                {strategy}
              </Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="grid gap-3">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              <span className="truncate">{investor.email}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              <span className="truncate">{investor.phone}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Yield target</div>
              <div className="font-medium">{yieldTarget ?? "—"}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Preferred areas</div>
              <div className="font-medium">{preferredAreasCount ? `${preferredAreasCount} areas` : "—"}</div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" />
              <span>Last contact: {investor.lastContact}</span>
            </div>
            <span>{investor.totalDeals} deals</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" asChild className="flex-1 sm:flex-none">
              <Link href={`/investors/${investor.id}`}>Open</Link>
            </Button>
            <Button size="sm" variant="secondary" asChild className="flex-1 sm:flex-none">
              <Link href={`/recommendations/new?investorId=${investor.id}`}>
                <Sparkles className="mr-2 h-4 w-4" />
                Recommend
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
