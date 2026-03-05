import { notFound } from "next/navigation"
import { headers } from "next/headers"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, User, Building2 } from "lucide-react"
import Link from "next/link"
import { MemoActions } from "@/components/memos/memo-actions"
import { MemoDetailView } from "@/components/memos/memo-detail-view"
import { buildStaticMapUrl } from "@/lib/utils/build-static-map-url"
import { getListingById } from "@/lib/db/listings"
import { getInvestorById } from "@/lib/db/investors"
import { mapListingToProperty } from "@/lib/utils/map-listing"
import { ContextualAICard } from "@/components/ai/contextual-ai-card"
import { MemoShareActivity } from "@/components/memos/memo-share-activity"
import { MemoSendVantage } from "@/components/memos/memo-send-vantage"
import { MemoWorkflowCard } from "@/components/memos/memo-workflow-card"
import type { Memo } from "@/lib/types"

interface MemoPageProps {
  params: Promise<{ id: string }>
  routePrefix?: string
}

function normalizeStatus(rawStatus: unknown, rawState: unknown): Memo["status"] {
  if (rawStatus === "draft" || rawStatus === "review" || rawStatus === "approved" || rawStatus === "sent") {
    return rawStatus
  }

  switch (rawState) {
    case "draft":
      return "draft"
    case "pending_review":
      return "review"
    case "ready":
      return "approved"
    case "sent":
    case "opened":
    case "decided":
      return "sent"
    default:
      return "draft"
  }
}

function readLatestContent(rawMemo: Record<string, unknown>): unknown {
  if (typeof rawMemo.content === "string") return rawMemo.content
  if (typeof rawMemo.content === "object" && rawMemo.content !== null) return rawMemo.content

  if (Array.isArray(rawMemo.versions) && rawMemo.versions.length > 0) {
    const latest = rawMemo.versions[rawMemo.versions.length - 1] as Record<string, unknown>
    return latest?.content
  }

  return ""
}

function toNarrative(content: unknown): string {
  if (typeof content === "string") return content
  if (!content || typeof content !== "object") return ""

  const obj = content as Record<string, unknown>
  const lines: string[] = []

  if (typeof obj.execSummary === "string") {
    lines.push("## Executive Summary", obj.execSummary, "")
  }
  if (typeof obj.mandateFit === "string") {
    lines.push("## Mandate Fit", obj.mandateFit, "")
  }
  if (Array.isArray(obj.assumptions) && obj.assumptions.length > 0) {
    lines.push("## Assumptions")
    for (const item of obj.assumptions) {
      if (typeof item === "string") lines.push(`- ${item}`)
    }
    lines.push("")
  }
  if (Array.isArray(obj.risks) && obj.risks.length > 0) {
    lines.push("## Risks")
    for (const item of obj.risks) {
      if (typeof item === "string") lines.push(`- ${item}`)
    }
    lines.push("")
  }
  if (typeof obj.recommendation === "string") {
    lines.push("## Recommendation", obj.recommendation, "")
  }

  if (lines.length === 0) {
    return JSON.stringify(obj, null, 2)
  }

  return lines.join("\n").trim()
}

export default async function MemoPage({ params, routePrefix = "" }: MemoPageProps) {
  const { id } = await params
  const prefix = routePrefix

  const hdrs = await headers()
  const host = hdrs.get("host") ?? "localhost:3000"
  const protocol = hdrs.get("x-forwarded-proto") ?? "http"
  const cookie = hdrs.get("cookie") ?? ""
  const memoRes = await fetch(`${protocol}://${host}/api/memos/${id}`, {
    headers: { cookie },
    cache: "no-store",
  })

  if (!memoRes.ok) {
    notFound()
  }

  const rawMemo = (await memoRes.json()) as Record<string, unknown>

  const rawContent = readLatestContent(rawMemo)
  const structuredContent =
    rawContent && typeof rawContent === "object" && !Array.isArray(rawContent)
      ? (rawContent as Record<string, unknown>)
      : null

  const contentProperty = structuredContent?.property as Record<string, unknown> | undefined
  const contentEvaluation = structuredContent?.evaluation as Record<string, unknown> | undefined
  const contentSource = structuredContent?.source as Record<string, unknown> | undefined
  const contentImages = contentProperty?.images as string[] | undefined

  const sourceCoords = contentSource?.coordinates as { lat: number; lng: number } | null | undefined
  const memoMapImageUrl = buildStaticMapUrl(
    sourceCoords,
    `${contentProperty?.area ?? ""}${contentProperty?.subArea ? `, ${contentProperty.subArea}` : ""}`,
  )
  const memoFloorPlanImageUrls = (contentSource?.floorPlanImages as string[] | undefined)?.filter(Boolean)

  const investorId =
    (typeof rawMemo.investorId === "string" && rawMemo.investorId) ||
    (typeof rawMemo.investor_id === "string" && rawMemo.investor_id) ||
    ""

  const propertyId =
    (typeof rawMemo.propertyId === "string" && rawMemo.propertyId) ||
    (typeof rawMemo.listingId === "string" && rawMemo.listingId) ||
    (typeof rawMemo.listing_id === "string" && rawMemo.listing_id) ||
    ""

  const [listing, investor] = await Promise.all([
    propertyId ? getListingById(propertyId) : Promise.resolve(null),
    investorId ? getInvestorById(investorId) : Promise.resolve(null),
  ])
  const dbProperty = listing ? mapListingToProperty(listing as Record<string, unknown>) : undefined

  const property = dbProperty ?? (contentProperty
    ? {
        id: propertyId || "",
        title: String(contentProperty.title ?? "Property"),
        area: String(contentProperty.area ?? ""),
        subArea: contentProperty.subArea ? String(contentProperty.subArea) : undefined,
        propertyType: String(contentProperty.type ?? ""),
        price: 0,
        bedrooms: Number(contentProperty.bedrooms ?? 0),
        bathrooms: Number(contentProperty.bathrooms ?? 0),
        size: contentProperty.size ? Number(contentProperty.size) : undefined,
        images: contentImages?.map((url: string) => ({ url, description: undefined, category: undefined })),
        imageUrl: contentImages?.[0] ?? undefined,
      } as unknown as import("@/lib/types").Property
    : undefined)

  const normalizedContent = toNarrative(rawContent)

  const isOffplan = structuredContent?.type === "offplan"
  const offplanProject = isOffplan ? (structuredContent?.project as Record<string, unknown> | undefined) : undefined
  const offplanUnit = isOffplan ? (structuredContent?.unit as Record<string, unknown> | undefined) : undefined
  const offplanAnalysis = isOffplan ? (structuredContent?.analysis as Record<string, unknown> | undefined) : undefined
  const offplanPaymentPlan = isOffplan ? (structuredContent?.paymentPlan as Record<string, unknown> | undefined) : undefined

  const derivedTitle =
    (typeof rawMemo.title === "string" && rawMemo.title.trim()) ||
    (isOffplan && offplanProject?.name ? `IC Memo: ${offplanProject.name}` : null) ||
    (property?.title ? `IC Memo: ${property.title}` : null) ||
    (contentProperty?.title ? `IC Memo: ${contentProperty.title}` : null) ||
    (typeof contentEvaluation?.headline === "string" ? String(contentEvaluation.headline) : null) ||
    "Investment Committee Memo"

  const memo: Memo = {
    id: (rawMemo.id as string) ?? id,
    title: derivedTitle,
    investorId,
    investorName:
      (typeof rawMemo.investorName === "string" && rawMemo.investorName) ||
      investor?.name ||
      (investorId ? "Investor" : "Unassigned"),
    propertyId,
    propertyTitle:
      (typeof rawMemo.propertyTitle === "string" && rawMemo.propertyTitle) ||
      property?.title ||
      (contentProperty?.title ? String(contentProperty.title) : "Property"),
    status: normalizeStatus(rawMemo.status, rawMemo.state),
    content: normalizedContent,
    analysis: (rawMemo.analysis as Memo["analysis"]) ??
      (structuredContent?.analysis as Memo["analysis"]) ??
      undefined,
    createdAt: (rawMemo.createdAt as string) || (rawMemo.created_at as string) || new Date().toISOString(),
    updatedAt: (rawMemo.updatedAt as string) || (rawMemo.updated_at as string) || new Date().toISOString(),
  }

  const analysis = memo.analysis
  const memoState =
    (typeof rawMemo.state === "string" && rawMemo.state) ||
    (memo.status === "review"
      ? "pending_review"
      : memo.status === "approved"
        ? "ready"
        : memo.status)

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href={prefix ? `${prefix}/opportunities` : (memo.investorId ? `/investors/${memo.investorId}` : "/memos")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {prefix ? "Back to Opportunities" : memo.investorId ? "Back to Investor" : "Back to Memos"}
        </Link>
      </Button>

      <MemoDetailView
        memo={memo}
        analysis={analysis ?? null}
        contentEvaluation={contentEvaluation ?? null}
        structuredContent={structuredContent ?? null}
        contentSource={contentSource ?? null}
        property={property}
        normalizedContent={normalizedContent}
        memoMapImageUrl={memoMapImageUrl}
        memoMapCoords={sourceCoords ?? null}
        memoFloorPlanImageUrls={memoFloorPlanImageUrls}
        isOffplan={isOffplan}
        offplanProject={offplanProject ?? null}
        offplanUnit={offplanUnit ?? null}
        offplanAnalysis={offplanAnalysis ?? null}
        offplanPaymentPlan={offplanPaymentPlan ?? null}
        routePrefix={prefix}
        headerActions={<MemoActions memo={memo} property={property} />}
        sidebarTop={
          <ContextualAICard
            agentId="risk_assessment"
            title="Risk Assessment"
            description="Analyze risks and get recommendations"
            suggestions={[
              "What are the risks in this deal?",
              "Does this fit the investor's mandate?",
              "Stress test this investment"
            ]}
            propertyId={memo.propertyId}
            investorId={memo.investorId}
            memoId={memo.id}
          />
        }
        sidebarBottom={
          <>
            <MemoWorkflowCard
              key="workflow"
              memoId={memo.id}
              memoState={memoState}
              investorId={memo.investorId}
              propertyId={memo.propertyId}
            />

            <MemoSendVantage
              key="vantage"
              memoId={memo.id}
              memoState={memoState}
              currentInvestorId={memo.investorId}
              currentInvestorName={memo.investorName}
            />

            <MemoShareActivity key="activity" memoId={memo.id} />

            <Card key="related">
              <CardHeader>
                <CardTitle className="text-base">Related</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {memo.investorId ? (
                  <Button variant="ghost" className="w-full justify-start" asChild>
                    <Link href={`${prefix}/investors/${memo.investorId}`}>
                      <User className="mr-2 h-4 w-4" />
                      View Investor
                    </Link>
                  </Button>
                ) : null}
                {memo.propertyId ? (
                  <Button variant="ghost" className="w-full justify-start" asChild>
                    <Link href={`${prefix}/properties/${memo.propertyId}`}>
                      <Building2 className="mr-2 h-4 w-4" />
                      View Property
                    </Link>
                  </Button>
                ) : null}
                {!memo.investorId && !memo.propertyId ? (
                  <p className="text-sm text-gray-500 py-2 text-center">No linked records</p>
                ) : null}
              </CardContent>
            </Card>
          </>
        }
      />
    </div>
  )
}
