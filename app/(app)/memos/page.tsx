import { PageHeader } from "@/components/ui/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, User, Building2, Calendar, ArrowRight } from "lucide-react"
import Link from "next/link"
import { mockMemos } from "@/lib/mock-data"

function getStatusVariant(status: string) {
  switch (status) {
    case "approved":
      return "default"
    case "review":
      return "secondary"
    case "draft":
      return "outline"
    case "rejected":
      return "destructive"
    default:
      return "outline"
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-AE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export default function MemosPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="IC Memos" subtitle={`${mockMemos.length} investment committee memos`} />

      <div className="grid gap-4 md:grid-cols-2">
        {mockMemos.map((memo) => (
          <Card key={memo.id} className="group hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-base line-clamp-1">{memo.title}</CardTitle>
                    <CardDescription className="line-clamp-1">{memo.propertyTitle}</CardDescription>
                  </div>
                </div>
                <Badge variant={getStatusVariant(memo.status)} className="shrink-0 capitalize">
                  {memo.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span className="truncate">{memo.investorName}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span className="truncate">{memo.propertyTitle?.split(" ")[0]}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                  <Calendar className="h-4 w-4" />
                  <span>Updated {formatDate(memo.updatedAt)}</span>
                </div>
              </div>

              <Button variant="ghost" size="sm" className="w-full justify-between" asChild>
                <Link href={`/memos/${memo.id}`}>
                  View Memo
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {mockMemos.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-1">No memos yet</h3>
            <p className="text-sm text-muted-foreground text-center">
              Investment committee memos will appear here once created.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
