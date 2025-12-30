"use client"

import * as React from "react"
import { toast } from "sonner"
import { Home, KeyRound, Save } from "lucide-react"

import type { Property } from "@/lib/types"
import "@/lib/init-property-store"
import { updateProperty } from "@/lib/property-store"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function RentalManagementCard({ property }: { property: Property }) {
  const [draft, setDraft] = React.useState<Property>(property)
  React.useEffect(() => setDraft(property), [property])

  const listingType = draft.listingType ?? "sale"

  if (listingType !== "rent") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Rental management
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          This property is currently marked <Badge variant="secondary">For sale</Badge>. Switch it to{" "}
          <Badge variant="secondary">For rent</Badge> to manage tenants and lease details.
        </CardContent>
      </Card>
    )
  }

  const save = () => {
    const updated = updateProperty(property.id, {
      listingType: "rent",
      leaseStatus: draft.leaseStatus ?? "listed",
      rentPaymentFrequency: draft.rentPaymentFrequency ?? "annually",
      securityDepositAed: draft.securityDepositAed ? Number(draft.securityDepositAed) : undefined,
      furnished: !!draft.furnished,
      tenantName: draft.tenantName?.trim() || undefined,
      tenantEmail: draft.tenantEmail?.trim() || undefined,
      tenantPhone: draft.tenantPhone?.trim() || undefined,
      leaseStart: draft.leaseStart?.trim() || undefined,
      leaseEnd: draft.leaseEnd?.trim() || undefined,
      // We reuse property.price as the annual rent in this demo to keep compatibility
      price: Number(draft.price || 0),
    })

    if (!updated) {
      toast.error("Could not save rental details")
      return
    }
    toast.success("Rental details saved")
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          Rental management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-2 sm:col-span-2">
            <Label>Annual rent (AED) – stored as price in demo</Label>
            <Input
              inputMode="numeric"
              value={draft.price?.toString() ?? ""}
              onChange={(e) => setDraft((p) => ({ ...p, price: Number(e.target.value || 0) }))}
              placeholder="450000"
            />
          </div>
          <div className="grid gap-2">
            <Label>Lease status</Label>
            <Select
              value={draft.leaseStatus ?? "listed"}
              onValueChange={(v) => setDraft((p) => ({ ...p, leaseStatus: v as Property["leaseStatus"] }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="listed">Listed</SelectItem>
                <SelectItem value="vacant">Vacant</SelectItem>
                <SelectItem value="occupied">Occupied</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Payment frequency</Label>
            <Select
              value={draft.rentPaymentFrequency ?? "annually"}
              onValueChange={(v) =>
                setDraft((p) => ({ ...p, rentPaymentFrequency: v as Property["rentPaymentFrequency"] }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="annually">Annually</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label>Security deposit (AED)</Label>
            <Input
              inputMode="numeric"
              value={draft.securityDepositAed?.toString() ?? ""}
              onChange={(e) => setDraft((p) => ({ ...p, securityDepositAed: Number(e.target.value || 0) }))}
              placeholder="30000"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Tenant name</Label>
            <Input value={draft.tenantName ?? ""} onChange={(e) => setDraft((p) => ({ ...p, tenantName: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>Tenant email</Label>
            <Input value={draft.tenantEmail ?? ""} onChange={(e) => setDraft((p) => ({ ...p, tenantEmail: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>Tenant phone</Label>
            <Input value={draft.tenantPhone ?? ""} onChange={(e) => setDraft((p) => ({ ...p, tenantPhone: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>Lease start (YYYY-MM-DD)</Label>
            <Input value={draft.leaseStart ?? ""} onChange={(e) => setDraft((p) => ({ ...p, leaseStart: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>Lease end (YYYY-MM-DD)</Label>
            <Input value={draft.leaseEnd ?? ""} onChange={(e) => setDraft((p) => ({ ...p, leaseEnd: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>Furnished</Label>
            <Select
              value={draft.furnished ? "yes" : "no"}
              onValueChange={(v) => setDraft((p) => ({ ...p, furnished: v === "yes" }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="button" onClick={save}>
            <Save className="mr-2 h-4 w-4" />
            Save rental details
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}


