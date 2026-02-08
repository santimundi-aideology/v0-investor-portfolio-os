import Link from "next/link"
import { headers } from "next/headers"
import { FileText } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MemoEditor } from "@/components/memos/memo-editor"
import { getListingById } from "@/lib/db/listings"
import { mapListingToProperty } from "@/lib/utils/map-listing"
import type { Memo } from "@/lib/types"

async function fetchMemo(memoId: string, cookie: string, baseUrl: string): Promise<Memo | undefined> {
  try {
    const res = await fetch(`${baseUrl}/api/memos/${memoId}`, {
      headers: { cookie },
      cache: "no-store",
    })
    if (!res.ok) return undefined
    return (await res.json()) as Memo
  } catch {
    return undefined
  }
}

async function fetchInvestorName(investorId: string, cookie: string, baseUrl: string): Promise<string | undefined> {
  try {
    const res = await fetch(`${baseUrl}/api/investors/${investorId}`, {
      headers: { cookie },
      cache: "no-store",
    })
    if (!res.ok) return undefined
    const data = await res.json()
    return data.name as string | undefined
  } catch {
    return undefined
  }
}

export default async function NewMemoPage({
  searchParams,
}: {
  searchParams?: Promise<{ investorId?: string; propertyId?: string; memoId?: string }>
}) {
  const sp = searchParams ? await searchParams : undefined
  const investorId = sp?.investorId
  const propertyId = sp?.propertyId
  const memoId = sp?.memoId

  const hdrs = await headers()
  const host = hdrs.get("host") ?? "localhost:3000"
  const protocol = hdrs.get("x-forwarded-proto") ?? "http"
  const cookie = hdrs.get("cookie") ?? ""
  const baseUrl = `${protocol}://${host}`

  // Fetch memo, investor, and property in parallel
  const [memo, investorName, listing] = await Promise.all([
    memoId ? fetchMemo(memoId, cookie, baseUrl) : Promise.resolve(undefined),
    investorId ? fetchInvestorName(investorId, cookie, baseUrl) : Promise.resolve(undefined),
    propertyId ? getListingById(propertyId) : Promise.resolve(null),
  ])

  const property = listing ? mapListingToProperty(listing as Record<string, unknown>) : undefined

  const headerBadges = (
    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
      {(memo?.investorName ?? investorName) ? <Badge variant="outline">Investor: {memo?.investorName ?? investorName}</Badge> : null}
      {(memo?.propertyTitle ?? property?.title) ? <Badge variant="outline">Property: {memo?.propertyTitle ?? property?.title}</Badge> : null}
      {!investorName && !memo?.investorName && investorId ? <Badge variant="secondary">Investor ID: {investorId}</Badge> : null}
      {!property && !memo?.propertyTitle && propertyId ? <Badge variant="secondary">Property ID: {propertyId}</Badge> : null}
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
            <span className="font-medium text-foreground">Investor:</span> {memo?.investorName ?? investorName ?? "Not set"}
          </div>
          <div>
            <span className="font-medium text-foreground">Property:</span> {memo?.propertyTitle ?? property?.title ?? "Not set"}
          </div>
          <div>
            <span className="font-medium text-foreground">Status:</span> {memo?.status ?? "draft"}
          </div>
        </CardContent>
      </Card>

      <MemoEditor initialMemo={memo} investorName={memo?.investorName ?? investorName} propertyTitle={memo?.propertyTitle ?? property?.title} />
    </div>
  )
}
