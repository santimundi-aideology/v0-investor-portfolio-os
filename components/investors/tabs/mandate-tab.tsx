import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Mandate } from "@/lib/types"

interface MandateTabProps {
  mandate?: Mandate
}

export function MandateTab({ mandate }: MandateTabProps) {
  if (!mandate) {
    return (
      <Card>
        <CardContent className="flex h-40 items-center justify-center">
          <p className="text-muted-foreground">No mandate defined yet</p>
        </CardContent>
      </Card>
    )
  }

  const riskColors = {
    low: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    medium: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    high: "bg-red-500/10 text-red-600 border-red-500/20",
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Investment Strategy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Strategy</span>
            <span className="font-medium">{mandate.strategy}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Investment Horizon</span>
            <span className="font-medium">{mandate.investmentHorizon}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Yield Target</span>
            <span className="font-medium">{mandate.yieldTarget}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Risk Tolerance</span>
            <Badge variant="outline" className={riskColors[mandate.riskTolerance]}>
              {mandate.riskTolerance}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Investment Range</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Minimum</span>
            <span className="font-medium">AED {mandate.minInvestment.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Maximum</span>
            <span className="font-medium">AED {mandate.maxInvestment.toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preferred Areas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {mandate.preferredAreas.map((area) => (
              <Badge key={area} variant="secondary">
                {area}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Property Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {mandate.propertyTypes.map((type) => (
              <Badge key={type} variant="secondary" className="capitalize">
                {type}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {mandate.notes && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{mandate.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
