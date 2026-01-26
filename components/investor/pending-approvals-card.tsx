"use client"

import * as React from "react"
import Link from "next/link"
import {
  FileText,
  Check,
  X,
  Clock,
  AlertCircle,
  ChevronRight,
  Building2,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { formatAED } from "@/lib/real-estate"
import type { Memo } from "@/lib/types"

interface PendingMemo extends Pick<Memo, "id" | "title" | "propertyTitle" | "createdAt" | "status"> {
  propertyPrice?: number
  propertyArea?: string
  expiresIn?: string
}

interface PendingApprovalsCardProps {
  memos: PendingMemo[]
  onApprove?: (memoId: string) => void
  onReject?: (memoId: string) => void
}

const statusConfig = {
  draft: {
    label: "Draft",
    className: "bg-gray-100 text-gray-600",
  },
  review: {
    label: "Pending Review",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  approved: {
    label: "Approved",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  sent: {
    label: "Sent",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
}

function MemoCard({
  memo,
  onApprove,
  onReject,
}: {
  memo: PendingMemo
  onApprove?: () => void
  onReject?: () => void
}) {
  const [isApproving, setIsApproving] = React.useState(false)
  const [isRejecting, setIsRejecting] = React.useState(false)

  const handleApprove = async () => {
    setIsApproving(true)
    try {
      onApprove?.()
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    setIsRejecting(true)
    try {
      onReject?.()
    } finally {
      setIsRejecting(false)
    }
  }

  const isPending = memo.status === "review"

  return (
    <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <FileText className="size-4 shrink-0 text-gray-500" />
            <Link
              href={`/investor/memos/${memo.id}`}
              className="truncate font-medium text-gray-900 hover:text-green-600 hover:underline"
            >
              {memo.title}
            </Link>
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
            <Building2 className="size-3" />
            <span className="truncate">{memo.propertyTitle}</span>
            {memo.propertyArea && (
              <>
                <span>•</span>
                <span>{memo.propertyArea}</span>
              </>
            )}
          </div>
          {memo.propertyPrice && (
            <div className="mt-1 text-sm font-semibold text-green-600">
              {formatAED(memo.propertyPrice)}
            </div>
          )}
        </div>
        <Badge
          variant="outline"
          className={cn("shrink-0", statusConfig[memo.status]?.className)}
        >
          {statusConfig[memo.status]?.label ?? memo.status}
        </Badge>
      </div>

      {isPending && (
        <>
          <Separator className="my-3" />
          <div className="flex items-center justify-between gap-2">
            {memo.expiresIn && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="size-3" />
                <span>Expires in {memo.expiresIn}</span>
              </div>
            )}
            <div className="flex gap-2 ml-auto">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    disabled={isRejecting}
                  >
                    <X className="size-3" />
                    Reject
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reject Memo?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to reject this investment memo for{" "}
                      <span className="font-medium">{memo.propertyTitle}</span>?
                      This action will notify your advisor.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleReject}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Reject Memo
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    className="gap-1"
                    disabled={isApproving}
                  >
                    <Check className="size-3" />
                    Approve
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Approve Investment?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You are approving the investment memo for{" "}
                      <span className="font-medium">{memo.propertyTitle}</span>.
                      This will move the deal to the next stage.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleApprove}>
                      Approve Investment
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </>
      )}

      {!isPending && (
        <div className="mt-3">
          <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
            <Link href={`/investor/memos/${memo.id}`}>
              View Details
              <ChevronRight className="ml-1 size-3" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}

export function PendingApprovalsCard({
  memos,
  onApprove,
  onReject,
}: PendingApprovalsCardProps) {
  const pendingCount = memos.filter((m) => m.status === "review").length

  if (memos.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-green-600" />
            <CardTitle className="text-base text-gray-900">Memos for Review</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-gray-100">
              <FileText className="size-6 text-gray-500" />
            </div>
            <p className="mt-3 text-sm font-medium text-gray-900">No memos pending</p>
            <p className="mt-1 text-xs text-gray-500">
              Investment memos will appear here when your advisor shares them
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-green-600" />
            <CardTitle className="text-base text-gray-900">Memos for Review</CardTitle>
            {pendingCount > 0 && (
              <Badge className="bg-amber-500 text-white">{pendingCount}</Badge>
            )}
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/investor/memos">View All</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-2 text-sm">
            <AlertCircle className="size-4 text-amber-600" />
            <span className="text-amber-700">
              {pendingCount} memo{pendingCount > 1 ? "s" : ""} awaiting your review
            </span>
          </div>
        )}
        {memos.slice(0, 3).map((memo) => (
          <MemoCard
            key={memo.id}
            memo={memo}
            onApprove={() => onApprove?.(memo.id)}
            onReject={() => onReject?.(memo.id)}
          />
        ))}
        {memos.length > 3 && (
          <Button asChild variant="ghost" className="w-full">
            <Link href="/investor/memos">
              View {memos.length - 3} more memos
              <ChevronRight className="ml-1 size-4" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
