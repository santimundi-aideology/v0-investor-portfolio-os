"use client"

import * as React from "react"
import {
  Send,
  CheckCircle2,
  User,
  ChevronDown,
  Loader2,
  Search,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type InvestorOption = {
  id: string
  name: string
  company?: string
  email?: string
}

interface MemoSendVantageProps {
  memoId: string
  memoState: string
  currentInvestorId: string
  currentInvestorName: string
}

export function MemoSendVantage({
  memoId,
  memoState,
  currentInvestorId,
  currentInvestorName,
}: MemoSendVantageProps) {
  const [investors, setInvestors] = React.useState<InvestorOption[]>([])
  const [investorsLoaded, setInvestorsLoaded] = React.useState(false)
  const [selectedId, setSelectedId] = React.useState(currentInvestorId)
  const [selectedName, setSelectedName] = React.useState(currentInvestorName)
  const [sending, setSending] = React.useState(false)
  const [sentResult, setSentResult] = React.useState<{
    investorName: string
    sentAt: string
  } | null>(null)
  const [pickerOpen, setPickerOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const alreadySent = memoState === "sent" || memoState === "opened" || memoState === "decided"

  const fetchInvestors = React.useCallback(async () => {
    if (investorsLoaded) return
    try {
      const res = await fetch("/api/investors")
      if (res.ok) {
        const data = await res.json()
        const mapped: InvestorOption[] = (data ?? []).map(
          (inv: Record<string, unknown>) => ({
            id: inv.id as string,
            name: (inv.name as string) || "Unnamed",
            company: inv.company as string | undefined,
            email: inv.email as string | undefined,
          })
        )
        setInvestors(mapped)
      }
    } catch {
      /* silent */
    } finally {
      setInvestorsLoaded(true)
    }
  }, [investorsLoaded])

  const handleSend = async () => {
    if (!selectedId) {
      toast.error("Please select an investor first")
      return
    }

    setSending(true)
    try {
      const res = await fetch(`/api/memos/${memoId}/send-vantage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ investorId: selectedId }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? "Failed to send")
      }

      const data = await res.json()
      setSentResult({
        investorName: data.investorName,
        sentAt: data.sentAt,
      })
      toast.success("Memo sent on Vantage", {
        description: `${data.investorName} can now see this memo in their dashboard.`,
      })
    } catch (err) {
      toast.error("Could not send memo", {
        description: (err as Error)?.message ?? "Please try again.",
      })
    } finally {
      setSending(false)
    }
  }

  const filteredInvestors = React.useMemo(() => {
    if (!search.trim()) return investors
    const q = search.toLowerCase()
    return investors.filter(
      (inv) =>
        inv.name.toLowerCase().includes(q) ||
        inv.company?.toLowerCase().includes(q) ||
        inv.email?.toLowerCase().includes(q)
    )
  }, [investors, search])

  if (sentResult || alreadySent) {
    const displayName = sentResult?.investorName || currentInvestorName || "Investor"
    const displayDate = sentResult?.sentAt
      ? new Date(sentResult.sentAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null

    return (
      <Card className="border-green-200 bg-gradient-to-br from-green-50/50 to-emerald-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="size-4 text-green-600" />
            Sent on Vantage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-green-100 text-green-700">
              <User className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {displayName}
              </p>
              {displayDate && (
                <p className="text-xs text-gray-500">Sent {displayDate}</p>
              )}
            </div>
            <Badge
              variant="secondary"
              className="bg-green-100 text-green-700 text-[10px] shrink-0"
            >
              Delivered
            </Badge>
          </div>
          <p className="mt-3 text-xs text-gray-500 leading-relaxed">
            The investor can view this memo and all its details in their Vantage
            dashboard.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Send on Vantage</CardTitle>
        <CardDescription>
          Send this IC memo to an investor on the platform
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Investor Picker */}
        <Popover
          open={pickerOpen}
          onOpenChange={(open) => {
            setPickerOpen(open)
            if (open) void fetchInvestors()
          }}
        >
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between font-normal"
              disabled={sending}
            >
              <span className="flex items-center gap-2 truncate">
                <User className="size-4 shrink-0 text-gray-400" />
                {selectedName || "Select investor…"}
              </span>
              <ChevronDown className="size-4 shrink-0 text-gray-400" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
                <Input
                  placeholder="Search investors…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </div>
            <div className="max-h-[200px] overflow-y-auto p-1">
              {!investorsLoaded ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="size-4 animate-spin text-gray-400" />
                </div>
              ) : filteredInvestors.length === 0 ? (
                <p className="py-4 text-center text-xs text-gray-400">
                  No investors found
                </p>
              ) : (
                filteredInvestors.map((inv) => (
                  <button
                    key={inv.id}
                    onClick={() => {
                      setSelectedId(inv.id)
                      setSelectedName(inv.name)
                      setPickerOpen(false)
                      setSearch("")
                    }}
                    className={cn(
                      "w-full flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-gray-100 transition-colors",
                      inv.id === selectedId && "bg-gray-100 font-medium"
                    )}
                  >
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                      <User className="size-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-gray-900">
                        {inv.name}
                      </p>
                      {inv.company && (
                        <p className="truncate text-xs text-gray-500">
                          {inv.company}
                        </p>
                      )}
                    </div>
                    {inv.id === selectedId && (
                      <CheckCircle2 className="size-4 shrink-0 text-green-600" />
                    )}
                  </button>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Send Button */}
        <Button
          className="w-full"
          onClick={handleSend}
          disabled={sending || !selectedId}
        >
          {sending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending…
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Send to Investor
            </>
          )}
        </Button>

        <p className="text-[11px] text-gray-400 leading-relaxed text-center">
          The memo will appear in the investor&apos;s Vantage dashboard
        </p>
      </CardContent>
    </Card>
  )
}
