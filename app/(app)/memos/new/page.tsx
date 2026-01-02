import Link from "next/link"
import { FileText } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MemoEditor } from "@/components/memos/memo-editor"
import { getMemoById, mockInvestors, mockProperties } from "@/lib/mock-data"

export default async function NewMemoPage({
  searchParams,
}: {
  searchParams?: Promise<{ investorId?: string; propertyId?: string; memoId?: string }>
}) {
  const sp = searchParams ? await searchParams : undefined
  const investorId = sp?.investorId
  const propertyId = sp?.propertyId
  const memoId = sp?.memoId

  const memo = memoId ? getMemoById(memoId) : undefined
  const investor = investorId ? mockInvestors.find((i) => i.id === investorId) : undefined
  const property = propertyId ? mockProperties.find((p) => p.id === propertyId) : undefined

  const headerBadges = (
    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
      {investor?.name ? <Badge variant="outline">Investor: {investor.name}</Badge> : null}
      {property?.title ? <Badge variant="outline">Property: {property.title}</Badge> : null}
      {!investor && investorId ? <Badge variant="secondary">Investor ID: {investorId}</Badge> : null}
      {!property && propertyId ? <Badge variant="secondary">Property ID: {propertyId}</Badge> : null}
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={memo ? "Edit IC memo" : "Generate IC memo"}
        subtitle={memo ? "Refine and share this memo with AI assistance." : "Draft an investment committee memo with AI helpers."}
        badges={headerBadges}
        primaryAction={
          <Button variant="outline" asChild>
            <Link href="/memos">
              Back to memos
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            Memo context
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-muted-foreground">
          <div>
            <span className="font-medium text-foreground">Investor:</span> {memo?.investorName ?? investor?.name ?? "Not set"}
          </div>
          <div>
            <span className="font-medium text-foreground">Property:</span> {memo?.propertyTitle ?? property?.title ?? "Not set"}
          </div>
          <div>
            <span className="font-medium text-foreground">Status:</span> {memo?.status ?? "draft"}
          </div>
        </CardContent>
      </Card>

      <MemoEditor initialMemo={memo} investorName={memo?.investorName ?? investor?.name} propertyTitle={memo?.propertyTitle ?? property?.title} />
    </div>
  )
}
