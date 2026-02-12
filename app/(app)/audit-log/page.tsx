"use client"

import * as React from "react"
import { Download, ScrollText } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { RoleRedirect } from "@/components/security/role-redirect"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAPI } from "@/lib/hooks/use-api"

type AuditEvent = {
  id: string
  timestamp: string
  eventType: string
  actorRole: string | null
  actorName: string | null
  actorEmail: string | null
  objectType: string | null
  objectId: string | null
  metadata: Record<string, unknown> | null
}

type AuditLogResponse = {
  events: AuditEvent[]
}

export default function AuditLogPage() {
  const [eventType, setEventType] = React.useState("all")
  const [search, setSearch] = React.useState("")

  const endpoint = `/api/audit-log?limit=150${
    eventType !== "all" ? `&eventType=${encodeURIComponent(eventType)}` : ""
  }${search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ""}`

  const { data, isLoading, error } = useAPI<AuditLogResponse>(endpoint)

  const exportHref = `/api/audit-log?format=csv${
    eventType !== "all" ? `&eventType=${encodeURIComponent(eventType)}` : ""
  }${search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ""}`

  return (
    <>
      <RoleRedirect allow={["owner", "admin"]} redirectTo="/dashboard" />
      <div className="space-y-6">
        <PageHeader
          title="Audit log"
          subtitle="Compliance events, role changes, and operational activity."
          primaryAction={
            <Button asChild>
              <a href={exportHref}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </a>
            </Button>
          }
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger>
                  <SelectValue placeholder="Event type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All event types</SelectItem>
                  <SelectItem value="investor.created">Investor created</SelectItem>
                  <SelectItem value="memo.created">Memo created</SelectItem>
                  <SelectItem value="memo.approved_by_manager">Memo approved</SelectItem>
                  <SelectItem value="deal_room.updated">Deal updated</SelectItem>
                  <SelectItem value="deal_room.stage_changed">Deal stage changed</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Search actor, object, metadata..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading audit events...</div>
            ) : error ? (
              <div className="text-sm text-destructive">Failed to load audit events.</div>
            ) : (data?.events?.length ?? 0) === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                <ScrollText className="h-6 w-6 text-muted-foreground" />
                <div className="text-sm text-muted-foreground">No audit entries for current filters.</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Object</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(event.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{event.eventType}</div>
                          {event.actorRole ? (
                            <div className="text-xs text-muted-foreground">{event.actorRole}</div>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <div>{event.actorName ?? "System"}</div>
                          <div className="text-xs text-muted-foreground">{event.actorEmail ?? "—"}</div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div>{event.objectType ?? "—"}</div>
                          <div className="text-muted-foreground">{event.objectId ?? "—"}</div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
