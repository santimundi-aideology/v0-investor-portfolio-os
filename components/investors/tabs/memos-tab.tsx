"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, Plus, ExternalLink } from "lucide-react"
import type { Memo } from "@/lib/types"

interface MemosTabProps {
  memos: Memo[]
  investorId: string
}

export function MemosTab({ memos, investorId }: MemosTabProps) {
  const [localMemos, setLocalMemos] = useState(memos)

  const handleGenerateMemo = () => {
    const newMemo: Memo = {
      id: `memo-${Date.now()}`,
      title: "Investment Committee Memo - New Property",
      investorId,
      investorName: "Investor",
      propertyId: "prop-new",
      propertyTitle: "New Property",
      status: "draft",
      content: "# Draft Investment Committee Memo\n\nThis memo is being prepared...",
      createdAt: new Date().toISOString().split("T")[0],
      updatedAt: new Date().toISOString().split("T")[0],
    }
    setLocalMemos([newMemo, ...localMemos])
  }

  const statusColors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    review: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    approved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    sent: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  }

  if (localMemos.length === 0) {
    return (
      <Card>
        <CardContent className="flex h-40 flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground">No IC memos created yet</p>
          <Button onClick={handleGenerateMemo}>
            <Plus className="mr-2 h-4 w-4" />
            Generate Memo
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleGenerateMemo}>
          <Plus className="mr-2 h-4 w-4" />
          Generate Memo
        </Button>
      </div>
      <div className="grid gap-4">
        {localMemos.map((memo) => (
          <Card key={memo.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{memo.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{memo.propertyTitle}</p>
                  </div>
                </div>
                <Badge variant="outline" className={statusColors[memo.status]}>
                  {memo.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Created: {memo.createdAt}</span>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/memos/${memo.id}`}>
                    View Memo <ExternalLink className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
