import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Building2, Mail, Phone } from "lucide-react"
import type { Investor } from "@/lib/types"

interface InvestorCardProps {
  investor: Investor
}

export function InvestorCard({ investor }: InvestorCardProps) {
  const statusColors = {
    active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    inactive: "bg-muted text-muted-foreground",
  }

  return (
    <Link href={`/investors/${investor.id}`}>
      <Card className="transition-colors hover:bg-muted/50">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={investor.avatar || "/placeholder.svg"} />
                <AvatarFallback>
                  {investor.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-base">{investor.name}</CardTitle>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Building2 className="h-3 w-3" />
                  <span>{investor.company}</span>
                </div>
              </div>
            </div>
            <Badge variant="outline" className={statusColors[investor.status]}>
              {investor.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              <span>{investor.email}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              <span>{investor.phone}</span>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
            <span>Last contact: {investor.lastContact}</span>
            <span>{investor.totalDeals} deals</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
