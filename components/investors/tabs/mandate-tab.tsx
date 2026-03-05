import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, BarChart2, Clock, Compass, MapPin, Building, Ruler, DollarSign, Wrench, StickyNote } from "lucide-react"
import type { Mandate } from "@/lib/types"

interface MandateTabProps {
  mandate?: Mandate
}

function formatAED(n: number) {
  if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `AED ${(n / 1_000).toFixed(0)}K`
  return `AED ${n.toLocaleString()}`
}

const formatLabel = (value: string) => value.replace(/_/g, " ")

const riskConfig = {
  low:    { label: "Low",    color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  medium: { label: "Medium", color: "text-amber-700",   bg: "bg-amber-50 border-amber-200" },
  high:   { label: "High",   color: "text-red-700",     bg: "bg-red-50 border-red-200" },
}

function Section({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <Card className="border-gray-100">
      <CardContent className="pt-4 pb-4 px-5">
        <div className="mb-3 flex items-center gap-2">
          <Icon className="h-4 w-4 text-gray-400 shrink-0" />
          <span className="text-sm font-semibold text-gray-700">{title}</span>
        </div>
        {children}
      </CardContent>
    </Card>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  )
}

export function MandateTab({ mandate }: MandateTabProps) {
  if (!mandate) {
    return (
      <Card className="border-gray-100">
        <CardContent className="flex h-40 items-center justify-center">
          <p className="text-gray-400 text-sm">No mandate defined yet</p>
        </CardContent>
      </Card>
    )
  }

  const risk = riskConfig[mandate.riskTolerance] ?? riskConfig.medium

  const hasExecutionPrefs =
    mandate.furnishedPreference ||
    mandate.completionStatus ||
    mandate.tenantRequirements ||
    typeof mandate.paymentPlanRequired === "boolean" ||
    mandate.leverageAppetite ||
    mandate.dueDiligenceLevel

  return (
    <div className="space-y-4">

      {/* ── Key metrics ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Strategy</div>
          <div className="mt-1.5 font-semibold text-green-700 text-sm leading-tight">{mandate.strategy || "—"}</div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Target Yield</div>
          <div className="mt-1.5 font-semibold text-blue-700 text-sm leading-tight">{mandate.yieldTarget || "—"}</div>
        </div>
        <div className={`rounded-xl border p-4 shadow-sm ${risk.bg}`}>
          <div className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Risk</div>
          <div className={`mt-1.5 font-semibold text-sm leading-tight ${risk.color}`}>{risk.label}</div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Horizon</div>
          <div className="mt-1.5 font-semibold text-purple-700 text-sm leading-tight">{mandate.investmentHorizon || "—"}</div>
        </div>
      </div>

      {/* ── Investment range ── */}
      <Section icon={DollarSign} title="Investment Range">
        <div className="flex items-center gap-4">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">Minimum</div>
            <div className="text-lg font-bold text-gray-900">{formatAED(mandate.minInvestment)}</div>
          </div>
          <div className="flex-1 relative mx-2">
            <div className="h-2 rounded-full bg-gradient-to-r from-green-300 to-green-600 shadow-sm" />
            <div className="mt-1 text-center text-[10px] text-gray-400">Investment band</div>
          </div>
          <div className="min-w-0 text-right">
            <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">Maximum</div>
            <div className="text-lg font-bold text-gray-900">{formatAED(mandate.maxInvestment)}</div>
          </div>
        </div>
        {mandate.decisionTimeline && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <Row label="Decision timeline" value={<span className="capitalize">{formatLabel(mandate.decisionTimeline)}</span>} />
          </div>
        )}
      </Section>

      {/* ── Markets & Areas ── */}
      <Section icon={MapPin} title="Preferred Markets">
        {mandate.preferredAreas.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {mandate.preferredAreas.map((area) => (
              <Badge key={area} variant="secondary" className="rounded-full bg-green-50 text-green-700 border border-green-200 font-normal">
                {area}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No preferred areas specified</p>
        )}
        {mandate.dealBreakers?.length ? (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="mb-1.5 text-xs font-medium text-red-500 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Deal breakers
            </div>
            <div className="flex flex-wrap gap-1.5">
              {mandate.dealBreakers.map((b) => (
                <Badge key={b} variant="outline" className="rounded-full border-red-200 text-red-600 font-normal">
                  {b}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}
      </Section>

      {/* ── Property types ── */}
      <div className="grid gap-4 md:grid-cols-2">
        <Section icon={Building} title="Property Types">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {mandate.propertyTypes.map((type) => (
                <Badge key={type} variant="secondary" className="rounded-full capitalize font-normal">
                  {type}
                </Badge>
              ))}
            </div>
            {(mandate.minSize || mandate.maxSize) && (
              <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wide">Min Size</div>
                  <div className="font-semibold text-gray-800 mt-0.5">{mandate.minSize ? `${mandate.minSize.toLocaleString()} sqft` : "—"}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wide">Max Size</div>
                  <div className="font-semibold text-gray-800 mt-0.5">{mandate.maxSize ? `${mandate.maxSize.toLocaleString()} sqft` : "—"}</div>
                </div>
              </div>
            )}
            {typeof mandate.maxServiceCharge === "number" && (
              <div className="pt-2 border-t border-gray-100">
                <Row label="Max service charge" value={`AED ${mandate.maxServiceCharge.toLocaleString()}/sqft`} />
              </div>
            )}
          </div>
        </Section>

        <Section icon={Compass} title="Objectives & Views">
          <div className="space-y-3">
            {mandate.primaryObjectives?.length ? (
              <div>
                <div className="text-xs text-gray-400 mb-1.5">Primary objectives</div>
                <div className="flex flex-wrap gap-1.5">
                  {mandate.primaryObjectives.map((o) => (
                    <Badge key={o} variant="outline" className="rounded-full font-normal">{o}</Badge>
                  ))}
                </div>
              </div>
            ) : null}
            {mandate.preferredBedrooms?.length ? (
              <div>
                <div className="text-xs text-gray-400 mb-1.5">Bedrooms</div>
                <div className="flex flex-wrap gap-1.5">
                  {mandate.preferredBedrooms.map((b) => (
                    <Badge key={b} variant="secondary" className="rounded-full font-normal">{b} BR</Badge>
                  ))}
                </div>
              </div>
            ) : null}
            {mandate.preferredViews?.length ? (
              <div>
                <div className="text-xs text-gray-400 mb-1.5">Preferred views</div>
                <div className="flex flex-wrap gap-1.5">
                  {mandate.preferredViews.map((v) => (
                    <Badge key={v} variant="outline" className="rounded-full font-normal">{v}</Badge>
                  ))}
                </div>
              </div>
            ) : null}
            {mandate.developerPreferences?.length ? (
              <div>
                <div className="text-xs text-gray-400 mb-1.5">Preferred developers</div>
                <div className="flex flex-wrap gap-1.5">
                  {mandate.developerPreferences.map((d) => (
                    <Badge key={d} variant="outline" className="rounded-full font-normal">{d}</Badge>
                  ))}
                </div>
              </div>
            ) : null}
            {!mandate.primaryObjectives?.length && !mandate.preferredBedrooms?.length && !mandate.preferredViews?.length && !mandate.developerPreferences?.length && (
              <p className="text-sm text-gray-400">No additional preferences specified</p>
            )}
          </div>
        </Section>
      </div>

      {/* ── Execution preferences ── */}
      {hasExecutionPrefs && (
        <Section icon={Wrench} title="Execution Preferences">
          <div className="divide-y divide-gray-50">
            {mandate.furnishedPreference && <Row label="Furnished" value={<span className="capitalize">{formatLabel(mandate.furnishedPreference)}</span>} />}
            {mandate.completionStatus && <Row label="Completion" value={<span className="capitalize">{formatLabel(mandate.completionStatus)}</span>} />}
            {mandate.tenantRequirements && <Row label="Tenant status" value={<span className="capitalize">{formatLabel(mandate.tenantRequirements)}</span>} />}
            {typeof mandate.paymentPlanRequired === "boolean" && <Row label="Payment plan" value={mandate.paymentPlanRequired ? "Required" : "Not required"} />}
            {mandate.leverageAppetite && <Row label="Leverage appetite" value={<span className="capitalize">{formatLabel(mandate.leverageAppetite)}</span>} />}
            {mandate.dueDiligenceLevel && <Row label="Due diligence level" value={<span className="capitalize">{formatLabel(mandate.dueDiligenceLevel)}</span>} />}
          </div>
          {mandate.communicationExpectations && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="text-xs text-gray-400 mb-1">Communication expectations</div>
              <p className="text-sm text-gray-700">{mandate.communicationExpectations}</p>
            </div>
          )}
        </Section>
      )}

      {/* ── Notes ── */}
      {mandate.notes && (
        <Section icon={StickyNote} title="Notes">
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{mandate.notes}</p>
        </Section>
      )}
    </div>
  )
}
