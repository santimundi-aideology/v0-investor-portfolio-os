"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Calendar, User, Building2, ExternalLink, Sparkles } from "lucide-react"
import Link from "next/link"
import { MemoChapterTabs } from "@/components/memos/memo-chapter-tabs"
import type { Memo, MemoAnalysis, Property } from "@/lib/types"

export interface MemoDetailViewProps {
  memo: Memo
  analysis: MemoAnalysis | null | undefined
  contentEvaluation: Record<string, unknown> | null | undefined
  structuredContent: Record<string, unknown> | null | undefined
  contentSource: Record<string, unknown> | null | undefined
  property?: Property
  normalizedContent: string
  memoMapImageUrl?: string | null
  memoMapCoords?: { lat: number; lng: number } | null
  memoFloorPlanImageUrls?: string[]
  isOffplan: boolean
  offplanProject?: Record<string, unknown> | null
  offplanUnit?: Record<string, unknown> | null
  offplanAnalysis?: Record<string, unknown> | null
  offplanPaymentPlan?: Record<string, unknown> | null
  /** If provided, links are prefixed (e.g. "/realtor") */
  routePrefix?: string
  /** Slot rendered above the chapter tabs (e.g. download actions for investor) */
  headerActions?: React.ReactNode
  /** Slot rendered in the sidebar (e.g. workflow card for realtor, decision panel for investor) */
  sidebarTop?: React.ReactNode
  /** Slot rendered below the sidebar cards */
  sidebarBottom?: React.ReactNode
  /** Hide the workflow/related sidebar cards used by the realtor view */
  showWorkflowSidebar?: boolean
  memoState?: string
}

const statusColors: Record<Memo["status"], string> = {
  draft: "bg-gray-100 text-gray-600 border-gray-200",
  review: "bg-amber-50 text-amber-600 border-amber-200",
  approved: "bg-green-50 text-green-600 border-green-200",
  sent: "bg-blue-50 text-blue-600 border-blue-200",
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export function MemoDetailView({
  memo,
  analysis,
  contentEvaluation,
  structuredContent,
  contentSource,
  property,
  normalizedContent,
  memoMapImageUrl,
  memoMapCoords,
  memoFloorPlanImageUrls,
  isOffplan,
  offplanProject,
  offplanUnit,
  offplanAnalysis,
  offplanPaymentPlan,
  routePrefix = "",
  headerActions,
  sidebarTop,
  sidebarBottom,
  showWorkflowSidebar = true,
  memoState,
}: MemoDetailViewProps) {
  const prefix = routePrefix

  return (
    <div className="space-y-6">
      {/* Memo Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{memo.title}</h1>
            <Badge variant="outline" className={statusColors[memo.status]}>
              {memo.status}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            {memo.investorId && (
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <Link href={`${prefix}/investors/${memo.investorId}`} className="hover:text-gray-900">
                  {memo.investorName}
                </Link>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Building2 className="h-4 w-4" />
              <span>{memo.propertyTitle}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Updated {formatDate(memo.updatedAt)}</span>
            </div>
          </div>
        </div>
        {headerActions}
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3 space-y-6">
          <MemoChapterTabs
            analysis={analysis ?? null}
            contentEvaluation={contentEvaluation ?? null}
            structuredContent={structuredContent ?? null}
            propertyImages={
              property?.images?.length
                ? (property.images as { url: string; description?: string; category?: string }[]).filter(
                    (img) => Boolean(img?.url)
                  )
                : property?.imageUrl
                  ? [{ url: property.imageUrl }]
                  : []
            }
            mapImageUrl={memoMapImageUrl}
            mapCoords={memoMapCoords}
            floorPlanImageUrls={memoFloorPlanImageUrls}
            isOffplan={isOffplan}
            offplanProject={offplanProject ?? null}
            offplanUnit={offplanUnit ?? null}
            offplanAnalysis={offplanAnalysis ?? null}
            offplanPaymentPlan={offplanPaymentPlan ?? null}
            fallbackContent={normalizedContent}
          />
        </div>

        <div className="space-y-6">
          {sidebarTop}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Current Status</span>
                <Badge variant="outline" className={statusColors[memo.status]}>
                  {memo.status}
                </Badge>
              </div>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Created</span>
                  <span>{formatDate(memo.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Updated</span>
                  <span>{formatDate(memo.updatedAt)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Score overview from evaluation */}
          {contentEvaluation ? (
            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-green-400" />
                  AI Investment Analysis
                </CardTitle>
                <CardDescription className="text-gray-300">Analysis complete</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {contentEvaluation.factors && typeof contentEvaluation.factors === "object" ? (() => {
                  const factors = contentEvaluation.factors as Record<string, number>
                  const isOffplanFactors = factors.developerCredibility != null || factors.locationPremium != null
                  return (
                    <div className="space-y-2 text-sm">
                      {isOffplanFactors ? (
                        <>
                          {factors.developerCredibility != null ? <div className="flex justify-between"><span className="text-gray-300">Developer Credibility</span><span className="font-semibold">{factors.developerCredibility}/25</span></div> : null}
                          {factors.locationPremium != null ? <div className="flex justify-between"><span className="text-gray-300">Location Premium</span><span className="font-semibold">{factors.locationPremium}/25</span></div> : null}
                          {factors.paymentPlanAttractiveness != null ? <div className="flex justify-between"><span className="text-gray-300">Payment Plan</span><span className="font-semibold">{factors.paymentPlanAttractiveness}/25</span></div> : null}
                          {factors.appreciationPotential != null ? <div className="flex justify-between"><span className="text-gray-300">Appreciation Potential</span><span className="font-semibold">{factors.appreciationPotential}/25</span></div> : null}
                        </>
                      ) : (
                        <>
                          {factors.mandateFit != null ? <div className="flex justify-between"><span className="text-gray-300">Mandate Fit</span><span className="font-semibold">{factors.mandateFit}/25</span></div> : null}
                          {factors.marketTiming != null ? <div className="flex justify-between"><span className="text-gray-300">Market Timing</span><span className="font-semibold">{factors.marketTiming}/25</span></div> : null}
                          {factors.portfolioFit != null ? <div className="flex justify-between"><span className="text-gray-300">Portfolio Fit</span><span className="font-semibold">{factors.portfolioFit}/25</span></div> : null}
                          {factors.riskAlignment != null ? <div className="flex justify-between"><span className="text-gray-300">Risk Alignment</span><span className="font-semibold">{factors.riskAlignment}/25</span></div> : null}
                        </>
                      )}
                    </div>
                  )
                })() : null}
                {contentEvaluation.score != null ? (
                  <div className="pt-2 border-t border-gray-700 text-center">
                    <p className="text-xs uppercase tracking-wide text-gray-400">Overall Score</p>
                    <p className="text-3xl font-bold text-white">{String(contentEvaluation.score)}<span className="text-lg text-gray-400">/100</span></p>
                  </div>
                ) : null}
                {contentEvaluation.recommendation ? (
                  <div className="rounded-lg bg-green-900/40 p-2 text-center">
                    <p className="text-xs uppercase text-gray-400">AI Recommendation</p>
                    <p className="font-semibold text-green-400 capitalize">{String(contentEvaluation.recommendation).replace(/_/g, " ")}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {/* Source info from property-intake */}
          {contentSource ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Source</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {contentSource.portal ? <div className="flex justify-between"><span className="text-gray-500">Portal</span><span className="font-medium capitalize">{String(contentSource.portal)}</span></div> : null}
                {contentSource.listingId ? <div className="flex justify-between"><span className="text-gray-500">Listing ID</span><span className="font-medium">{String(contentSource.listingId)}</span></div> : null}
                {contentSource.referenceNumber ? <div className="flex justify-between"><span className="text-gray-500">Reference</span><span className="font-medium">{String(contentSource.referenceNumber)}</span></div> : null}
                {contentSource.permitNumber ? <div className="flex justify-between"><span className="text-gray-500">Permit No.</span><span className="font-medium text-xs">{String(contentSource.permitNumber)}</span></div> : null}
                {contentSource.verified ? <div className="flex justify-between"><span className="text-gray-500">Verified</span><span className="font-medium text-green-600">Yes</span></div> : null}
                {contentSource.developer ? <><Separator /><div className="flex justify-between"><span className="text-gray-500">Developer</span><span className="font-medium">{String(contentSource.developer)}</span></div></> : null}
                {contentSource.completionStatus && contentSource.completionStatus !== "unknown" ? (
                  <div className="flex justify-between"><span className="text-gray-500">Status</span><span className="font-medium capitalize">{String(contentSource.completionStatus).replace(/_/g, " ")}</span></div>
                ) : null}
                {contentSource.handoverDate ? <div className="flex justify-between"><span className="text-gray-500">Handover</span><span className="font-medium">{String(contentSource.handoverDate)}</span></div> : null}
                {contentSource.listingUrl ? (
                  <>
                    <Separator />
                    <a href={String(contentSource.listingUrl)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-green-600 hover:underline">
                      View Original<ExternalLink className="h-3 w-3" />
                    </a>
                  </>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {sidebarBottom}
        </div>
      </div>
    </div>
  )
}
