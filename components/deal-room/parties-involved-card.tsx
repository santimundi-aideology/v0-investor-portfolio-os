"use client"

import * as React from "react"
import { Mail, Phone } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { EditableAvatar } from "@/components/ui/editable-avatar"
import type { DealParty } from "@/lib/types"

export function PartiesInvolvedCard({ dealRoomId, parties }: { dealRoomId: string; parties: DealParty[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Parties Involved</CardTitle>
        <CardDescription>Key contacts for this deal</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {parties.map((party) => (
          <div key={party.id} className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <EditableAvatar
                  storageKey={`dealParty:${dealRoomId}:${party.id}`}
                  name={party.name}
                  src={party.avatar}
                  size={36}
                />
                <p className="min-w-0 truncate font-medium">{party.name}</p>
              </div>
              <Badge variant="outline" className="shrink-0">
                {party.role}
              </Badge>
            </div>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Mail className="h-3 w-3" />
                <a href={`mailto:${party.email}`} className="hover:text-foreground">
                  {party.email}
                </a>
              </div>
              {party.phone ? (
                <div className="flex items-center gap-2">
                  <Phone className="h-3 w-3" />
                  <a href={`tel:${party.phone}`} className="hover:text-foreground">
                    {party.phone}
                  </a>
                </div>
              ) : null}
            </div>
            <Separator className="mt-3" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}


