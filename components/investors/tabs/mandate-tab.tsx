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

  const formatLabel = (value: string) => value.replace(/_/g, " ")
  const hasExecutionPrefs =
    mandate.furnishedPreference ||
    mandate.completionStatus ||
    mandate.tenantRequirements ||
    typeof mandate.paymentPlanRequired === "boolean" ||
    mandate.leverageAppetite ||
    mandate.dueDiligenceLevel

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Strategy & Returns</CardTitle>
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
              {formatLabel(mandate.riskTolerance)}
            </Badge>
          </div>
          {mandate.decisionTimeline && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Decision timeline</span>
              <span className="font-medium capitalize">{formatLabel(mandate.decisionTimeline)}</span>
            </div>
          )}
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
          <CardTitle className="text-base">Markets & Asset Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-2 text-sm text-muted-foreground">Preferred areas</p>
            <div className="flex flex-wrap gap-2">
              {mandate.preferredAreas.map((area) => (
                <Badge key={area} variant="secondary">
                  {area}
                </Badge>
              ))}
            </div>
          </div>
          {mandate.primaryObjectives?.length ? (
            <div>
              <p className="mb-2 text-sm text-muted-foreground">Primary objectives</p>
              <div className="flex flex-wrap gap-2">
                {mandate.primaryObjectives.map((objective) => (
                  <Badge key={objective} variant="outline">
                    {objective}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
          {mandate.preferredViews?.length ? (
            <div>
              <p className="mb-2 text-sm text-muted-foreground">Preferred views</p>
              <div className="flex flex-wrap gap-2">
                {mandate.preferredViews.map((view) => (
                  <Badge key={view} variant="outline">
                    {view}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
          {mandate.preferredBedrooms?.length ? (
            <div>
              <p className="mb-2 text-sm text-muted-foreground">Preferred bedrooms</p>
              <div className="flex flex-wrap gap-2">
                {mandate.preferredBedrooms.map((bed) => (
                  <Badge key={bed} variant="outline">
                    {bed} BR
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
          {mandate.developerPreferences?.length ? (
            <div>
              <p className="mb-2 text-sm text-muted-foreground">Preferred developers</p>
              <div className="flex flex-wrap gap-2">
                {mandate.developerPreferences.map((developer) => (
                  <Badge key={developer} variant="outline">
                    {developer}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
          {mandate.dealBreakers?.length ? (
            <div>
              <p className="mb-2 text-sm text-muted-foreground">Deal breakers</p>
              <div className="flex flex-wrap gap-2">
                {mandate.dealBreakers.map((breaker) => (
                  <Badge key={breaker} variant="destructive">
                    {breaker}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
          {mandate.communicationExpectations ? (
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Communication expectations</p>
              <p className="text-sm">{mandate.communicationExpectations}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Property Types</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {mandate.propertyTypes.map((type) => (
              <Badge key={type} variant="secondary" className="capitalize">
                {type}
              </Badge>
            ))}
          </div>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Size range</span>
              <span className="font-medium">
                {mandate.minSize ? `${mandate.minSize.toLocaleString()} sqft` : "—"} - {mandate.maxSize ? `${mandate.maxSize.toLocaleString()} sqft` : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Max service charge</span>
              <span className="font-medium">
                {typeof mandate.maxServiceCharge === "number" ? `AED ${mandate.maxServiceCharge.toLocaleString()}/sqft` : "—"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {hasExecutionPrefs ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Execution Preferences</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            {mandate.furnishedPreference && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Furnished</span>
                <span className="font-medium capitalize">{formatLabel(mandate.furnishedPreference)}</span>
              </div>
            )}
            {mandate.completionStatus && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Completion</span>
                <span className="font-medium capitalize">{formatLabel(mandate.completionStatus)}</span>
              </div>
            )}
            {mandate.tenantRequirements && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tenant status</span>
                <span className="font-medium capitalize">{formatLabel(mandate.tenantRequirements)}</span>
              </div>
            )}
            {typeof mandate.paymentPlanRequired === "boolean" && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment plan</span>
                <span className="font-medium">{mandate.paymentPlanRequired ? "Required" : "Not required"}</span>
              </div>
            )}
            {mandate.leverageAppetite && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Leverage appetite</span>
                <span className="font-medium capitalize">{formatLabel(mandate.leverageAppetite)}</span>
              </div>
            )}
            {mandate.dueDiligenceLevel && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Due diligence</span>
                <span className="font-medium capitalize">{formatLabel(mandate.dueDiligenceLevel)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

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
