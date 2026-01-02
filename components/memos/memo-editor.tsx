"use client"

import { useMemo, useState, type ReactElement } from "react"
import { Loader2, Sparkles, Wand2, List, AlignLeft } from "lucide-react"
import { toast } from "sonner"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Memo } from "@/lib/types"

type AiMode = "polish" | "concise" | "bullet" | "expand"

const modeLabels: Record<AiMode, string> = {
  polish: "Polish tone",
  concise: "Make concise",
  bullet: "Bulletize",
  expand: "Add depth",
}

interface MemoEditorProps {
  initialMemo?: Memo
  investorName?: string
  propertyTitle?: string
}

export function MemoEditor({ initialMemo, investorName, propertyTitle }: MemoEditorProps) {
  const [title, setTitle] = useState(initialMemo?.title ?? "Investment Committee Memo")
  const [content, setContent] = useState(initialMemo?.content ?? "# Draft IC memo\n\nAdd your notes here.")
  const [busyMode, setBusyMode] = useState<AiMode | null>(null)
  const [imageUrl, setImageUrl] = useState("")

  const contextHint = useMemo(() => {
    const parts = []
    if (investorName) parts.push(`Investor: ${investorName}`)
    if (propertyTitle) parts.push(`Property: ${propertyTitle}`)
    return parts.join(" • ")
  }, [investorName, propertyTitle])

  const runAi = async (mode: AiMode) => {
    if (!content.trim()) {
      toast.error("Add memo content first")
      return
    }
    setBusyMode(mode)
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: "real_estate_advisor",
          mode,
          context: { investorName, propertyTitle },
          messages: [
            {
              role: "user",
              content: `${content}\n\nRewrite mode: ${mode}. Improve clarity and investor-readiness.`,
            },
          ],
        }),
      })

      const json = await res.json().catch(() => null)
      const next = json?.message?.content as string | undefined
      if (!res.ok || !next) {
        throw new Error((json && (json.error || json.detail)) || `Request failed (${res.status})`)
      }
      setContent(next)
      toast.success("AI applied", { description: modeLabels[mode] })
    } catch (err) {
      toast.error("AI helper unavailable", { description: (err as Error)?.message ?? "Try again shortly." })
    } finally {
      setBusyMode(null)
    }
  }

  const saveDraft = () => {
    toast.success("Saved draft (mock)", { description: "Wire to your backend to persist." })
  }

  const addImage = () => {
    const trimmed = imageUrl.trim()
    if (!trimmed) {
      toast.error("Add an image URL first")
      return
    }
    setContent((prev) => `${prev.trim()}\n\n![Memo image](${trimmed})\n`)
    setImageUrl("")
    toast.success("Image added to memo")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Edit memo with AI</span>
          {contextHint ? <span className="text-xs font-normal text-muted-foreground">{contextHint}</span> : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="memo-title">Title</Label>
          <Input id="memo-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="memo-content">Content</Label>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["polish", <Wand2 key="i" className="h-4 w-4" />],
                  ["concise", <AlignLeft key="i" className="h-4 w-4" />],
                  ["bullet", <List key="i" className="h-4 w-4" />],
                  ["expand", <Sparkles key="i" className="h-4 w-4" />],
                ] as [AiMode, ReactElement][]
              ).map(([mode, icon]) => (
                <Button
                  key={mode}
                  variant="outline"
                  size="sm"
                  onClick={() => void runAi(mode)}
                  disabled={busyMode !== null}
                  className="gap-2"
                >
                  {busyMode === mode ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
                  {modeLabels[mode]}
                </Button>
              ))}
            </div>
          </div>
          <Textarea
            id="memo-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={16}
            className="font-mono"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="memo-image">Add photo (URL)</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="memo-image"
              placeholder="https://example.com/image.jpg"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
            <Button variant="outline" type="button" onClick={addImage} disabled={busyMode !== null}>
              Attach image
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Images are embedded via markdown. They will appear inline in the memo and in the PDF.
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setContent(initialMemo?.content ?? content)}>
            Reset
          </Button>
          <Button onClick={saveDraft} disabled={busyMode !== null}>
            {busyMode ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save (mock)
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

