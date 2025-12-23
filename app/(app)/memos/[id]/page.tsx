import { notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Download, Send, Edit, Calendar, User, Building2 } from "lucide-react"
import Link from "next/link"
import { getMemoById } from "@/lib/mock-data"
import type { Memo } from "@/lib/types"

interface MemoPageProps {
  params: Promise<{ id: string }>
}

const statusColors: Record<Memo["status"], string> = {
  draft: "bg-muted text-muted-foreground",
  review: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  approved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  sent: "bg-blue-500/10 text-blue-600 border-blue-500/20",
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function renderMemoContent(content: string) {
  // Simple markdown-like rendering
  const lines = content.split("\n")
  return lines.map((line, index) => {
    // Headers
    if (line.startsWith("# ")) {
      return (
        <h1 key={index} className="text-2xl font-bold mt-6 mb-4">
          {line.slice(2)}
        </h1>
      )
    }
    if (line.startsWith("## ")) {
      return (
        <h2 key={index} className="text-xl font-semibold mt-5 mb-3">
          {line.slice(3)}
        </h2>
      )
    }
    if (line.startsWith("### ")) {
      return (
        <h3 key={index} className="text-lg font-medium mt-4 mb-2">
          {line.slice(4)}
        </h3>
      )
    }
    // Bold text with **
    if (line.includes("**")) {
      const parts = line.split(/\*\*(.*?)\*\*/g)
      return (
        <p key={index} className="mb-2">
          {parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part))}
        </p>
      )
    }
    // List items
    if (line.startsWith("- ")) {
      return (
        <li key={index} className="ml-4 mb-1 list-disc">
          {line.slice(2)}
        </li>
      )
    }
    if (line.match(/^\d+\. /)) {
      return (
        <li key={index} className="ml-4 mb-1 list-decimal">
          {line.replace(/^\d+\. /, "")}
        </li>
      )
    }
    // Empty lines
    if (line.trim() === "") {
      return <br key={index} />
    }
    // Regular paragraphs
    return (
      <p key={index} className="mb-2 text-muted-foreground">
        {line}
      </p>
    )
  })
}

export default async function MemoPage({ params }: MemoPageProps) {
  const { id } = await params
  const memo = getMemoById(id)

  if (!memo) {
    notFound()
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/investors/${memo.investorId}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Investor
        </Link>
      </Button>

      {/* Memo Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{memo.title}</h1>
            <Badge variant="outline" className={statusColors[memo.status]}>
              {memo.status}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <Link href={`/investors/${memo.investorId}`} className="hover:text-foreground">
                {memo.investorName}
              </Link>
            </div>
            <div className="flex items-center gap-1">
              <Building2 className="h-4 w-4" />
              <Link href={`/properties/${memo.propertyId}`} className="hover:text-foreground">
                {memo.propertyTitle}
              </Link>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Updated {formatDate(memo.updatedAt)}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
          <Button>
            <Send className="mr-2 h-4 w-4" />
            Send to Investor
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Main Content */}
        <Card className="lg:col-span-3">
          <CardContent className="pt-6">
            <div className="prose prose-sm max-w-none dark:prose-invert">{renderMemoContent(memo.content)}</div>
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current Status</span>
                <Badge variant="outline" className={statusColors[memo.status]}>
                  {memo.status}
                </Badge>
              </div>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>{formatDate(memo.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Updated</span>
                  <span>{formatDate(memo.updatedAt)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Workflow Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Workflow</CardTitle>
              <CardDescription>Move memo through approval process</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {memo.status === "draft" && (
                <Button className="w-full bg-transparent" variant="outline">
                  Submit for Review
                </Button>
              )}
              {memo.status === "review" && (
                <>
                  <Button className="w-full">Approve</Button>
                  <Button className="w-full bg-transparent" variant="outline">
                    Request Changes
                  </Button>
                </>
              )}
              {memo.status === "approved" && (
                <Button className="w-full">
                  <Send className="mr-2 h-4 w-4" />
                  Send to Investor
                </Button>
              )}
              {memo.status === "sent" && (
                <p className="text-sm text-muted-foreground text-center py-2">Memo has been sent to investor</p>
              )}
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Related</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="ghost" className="w-full justify-start" asChild>
                <Link href={`/investors/${memo.investorId}`}>
                  <User className="mr-2 h-4 w-4" />
                  View Investor
                </Link>
              </Button>
              <Button variant="ghost" className="w-full justify-start" asChild>
                <Link href={`/properties/${memo.propertyId}`}>
                  <Building2 className="mr-2 h-4 w-4" />
                  View Property
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
