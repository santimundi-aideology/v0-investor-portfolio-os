import { notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, Users, Building2, Calendar, Mail, Phone, CheckCircle2, Circle, FileText, Clock } from "lucide-react"
import Link from "next/link"
import { getDealRoomById } from "@/lib/mock-data"
import type { DealRoom, TimelineEvent } from "@/lib/types"

interface DealRoomPageProps {
  params: Promise<{ id: string }>
}

const statusColors: Record<DealRoom["status"], string> = {
  preparation: "bg-muted text-muted-foreground",
  "due-diligence": "bg-amber-500/10 text-amber-600 border-amber-500/20",
  negotiation: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  closing: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
}

const statusLabels: Record<DealRoom["status"], string> = {
  preparation: "Preparation",
  "due-diligence": "Due Diligence",
  negotiation: "Negotiation",
  closing: "Closing",
  completed: "Completed",
}

const timelineIcons: Record<TimelineEvent["type"], typeof Calendar> = {
  milestone: CheckCircle2,
  document: FileText,
  meeting: Users,
  update: Clock,
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default async function DealRoomPage({ params }: DealRoomPageProps) {
  const { id } = await params
  const dealRoom = getDealRoomById(id)

  if (!dealRoom) {
    notFound()
  }

  const completedItems = dealRoom.checklist.filter((item) => item.completed).length
  const totalItems = dealRoom.checklist.length
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0

  // Group checklist by category
  const checklistByCategory = dealRoom.checklist.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = []
      }
      acc[item.category].push(item)
      return acc
    },
    {} as Record<string, typeof dealRoom.checklist>,
  )

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/investors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Investors
        </Link>
      </Button>

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{dealRoom.title}</h1>
            <Badge variant="outline" className={statusColors[dealRoom.status]}>
              {statusLabels[dealRoom.status]}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <Link href={`/investors/${dealRoom.investorId}`} className="flex items-center gap-1 hover:text-foreground">
              <Users className="h-4 w-4" />
              {dealRoom.investorName}
            </Link>
            <Link href={`/properties/${dealRoom.propertyId}`} className="flex items-center gap-1 hover:text-foreground">
              <Building2 className="h-4 w-4" />
              {dealRoom.propertyTitle}
            </Link>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Created {formatDate(dealRoom.createdAt)}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Upload Document</Button>
          <Button>Update Status</Button>
        </div>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Deal Progress</span>
            <span className="text-sm text-muted-foreground">
              {completedItems} of {totalItems} items complete
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Checklist */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Document Checklist</CardTitle>
              <CardDescription>Track required documents and approvals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(checklistByCategory).map(([category, items]) => (
                <div key={category}>
                  <h4 className="font-medium mb-3">{category}</h4>
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-3">
                          <Checkbox checked={item.completed} />
                          <div>
                            <p className={`font-medium ${item.completed ? "line-through text-muted-foreground" : ""}`}>
                              {item.title}
                            </p>
                            {item.dueDate && (
                              <p className="text-xs text-muted-foreground">Due: {formatDate(item.dueDate)}</p>
                            )}
                          </div>
                        </div>
                        {item.completed ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
              <CardDescription>Key events and milestones</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative space-y-4">
                {dealRoom.timeline.map((event, index) => {
                  const Icon = timelineIcons[event.type]
                  return (
                    <div key={event.id} className="flex gap-4">
                      <div className="relative flex flex-col items-center">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-background">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        {index < dealRoom.timeline.length - 1 && (
                          <div className="absolute top-8 h-full w-px bg-border" />
                        )}
                      </div>
                      <div className="flex-1 pb-6">
                        <p className="font-medium">{event.title}</p>
                        {event.description && <p className="text-sm text-muted-foreground">{event.description}</p>}
                        <p className="text-xs text-muted-foreground mt-1">{formatDate(event.date)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Parties Involved */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Parties Involved</CardTitle>
              <CardDescription>Key contacts for this deal</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {dealRoom.parties.map((party) => (
                <div key={party.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{party.name}</p>
                    <Badge variant="outline">{party.role}</Badge>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      <a href={`mailto:${party.email}`} className="hover:text-foreground">
                        {party.email}
                      </a>
                    </div>
                    {party.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        <a href={`tel:${party.phone}`} className="hover:text-foreground">
                          {party.phone}
                        </a>
                      </div>
                    )}
                  </div>
                  <Separator className="mt-3" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Deal Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full bg-transparent" variant="outline">
                Schedule Meeting
              </Button>
              <Button className="w-full bg-transparent" variant="outline">
                Request Documents
              </Button>
              <Button className="w-full bg-transparent" variant="outline">
                Add Party
              </Button>
              <Separator className="my-3" />
              <Button className="w-full" variant="destructive">
                Cancel Deal
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
