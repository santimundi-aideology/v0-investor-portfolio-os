import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Ruler, TrendingUp, ExternalLink } from "lucide-react"
import type { ShortlistItem } from "@/lib/types"

interface ShortlistTabProps {
  items: ShortlistItem[]
}

export function ShortlistTab({ items }: ShortlistTabProps) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex h-40 items-center justify-center">
          <p className="text-muted-foreground">No properties shortlisted yet</p>
        </CardContent>
      </Card>
    )
  }

  const statusColors: Record<string, string> = {
    pending: "bg-muted text-muted-foreground",
    presented: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    interested: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    rejected: "bg-red-500/10 text-red-600 border-red-500/20",
    "under-offer": "bg-amber-500/10 text-amber-600 border-amber-500/20",
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <Card key={item.id}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">{item.property.title}</CardTitle>
                <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{item.property.area}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {item.score}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                Shortlisted
              </Badge>
              <Badge variant="outline" className={statusColors[item.status]}>
                {item.status.replace("-", " ")}
              </Badge>
              <Badge variant="secondary" className="capitalize">
                {item.property.type}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Ruler className="h-3.5 w-3.5" />
                <span>{item.property.size.toLocaleString()} sqft</span>
              </div>
              {item.property.roi && (
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>{item.property.roi}% ROI</span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="font-semibold">AED {item.property.price.toLocaleString()}</span>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/properties/${item.property.id}`}>
                  View <ExternalLink className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
            {item.notes && <p className="text-xs text-muted-foreground border-t pt-2">{item.notes}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
