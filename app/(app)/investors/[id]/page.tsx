import { notFound } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getInvestorById, getShortlistByInvestorId, getMemosByInvestorId, getTasksByInvestorId } from "@/lib/mock-data"
import { MandateTab } from "@/components/investors/tabs/mandate-tab"
import { ShortlistTab } from "@/components/investors/tabs/shortlist-tab"
import { MemosTab } from "@/components/investors/tabs/memos-tab"
import { TasksTab } from "@/components/investors/tabs/tasks-tab"
import { DocumentsTab } from "@/components/investors/tabs/documents-tab"

interface InvestorPageProps {
  params: Promise<{ id: string }>
}

export default async function InvestorPage({ params }: InvestorPageProps) {
  const { id } = await params
  const investor = getInvestorById(id)

  if (!investor) {
    notFound()
  }

  const shortlist = getShortlistByInvestorId(id)
  const memos = getMemosByInvestorId(id)
  const tasks = getTasksByInvestorId(id)

  const statusColors = {
    active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    inactive: "bg-muted text-muted-foreground",
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={investor.avatar || "/placeholder.svg"} />
            <AvatarFallback className="text-lg">
              {investor.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{investor.name}</h1>
              <Badge variant="outline" className={statusColors[investor.status]}>
                {investor.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">{investor.company}</p>
            <p className="text-sm text-muted-foreground">
              {investor.email} · {investor.phone}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="mandate" className="space-y-4">
        <TabsList>
          <TabsTrigger value="mandate">Mandate</TabsTrigger>
          <TabsTrigger value="shortlist">Shortlist ({shortlist.length})</TabsTrigger>
          <TabsTrigger value="memos">IC Memos ({memos.length})</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="mandate">
          <MandateTab mandate={investor.mandate} />
        </TabsContent>

        <TabsContent value="shortlist">
          <ShortlistTab items={shortlist} />
        </TabsContent>

        <TabsContent value="memos">
          <MemosTab memos={memos} investorId={investor.id} />
        </TabsContent>

        <TabsContent value="tasks">
          <TasksTab tasks={tasks} />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
