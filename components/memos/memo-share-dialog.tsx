"use client"

import * as React from "react"
import { Share2, MessageCircle, Mail, Link2, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"

type MemoShareDialogProps = {
  memoId: string
  investorEmail?: string
  investorPhone?: string
  investorWhatsApp?: string
  onShare?: () => void
}

export function MemoShareDialog({
  memoId,
  investorEmail,
  investorPhone,
  investorWhatsApp,
  onShare,
}: MemoShareDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [method, setMethod] = React.useState<"whatsapp" | "email" | "link">("link")
  const [recipientContact, setRecipientContact] = React.useState("")
  const [message, setMessage] = React.useState("")
  const [shareUrl, setShareUrl] = React.useState<string | null>(null)
  const [shareLink, setShareLink] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    // Pre-fill contact based on method
    if (method === "email" && investorEmail) {
      setRecipientContact(investorEmail)
    } else if (method === "whatsapp" && (investorWhatsApp || investorPhone)) {
      setRecipientContact(investorWhatsApp || investorPhone || "")
    } else {
      setRecipientContact("")
    }
  }, [method, investorEmail, investorPhone, investorWhatsApp])

  const handleShare = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/memos/${memoId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method,
          recipientContact: recipientContact || undefined,
          message: message || undefined,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to share memo")
      }

      const data = await res.json()
      setShareUrl(data.shareToken.shareUrl)
      setShareLink(data.shareToken.shareLink)

      toast.success("Memo shared successfully", {
        description: `Share link created for ${method}`,
      })

      onShare?.()

      // Auto-open WhatsApp/Email if link is available
      if (data.shareToken.shareLink && (method === "whatsapp" || method === "email")) {
        window.open(data.shareToken.shareLink, "_blank")
      }
    } catch (err) {
      toast.error("Failed to share memo", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success("Copied!", {
        description: "Share link copied to clipboard",
      })
    }
  }

  const defaultMessage = `Check out this investment opportunity. Click the link to view details.`

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Share Investment Memo</DialogTitle>
          <DialogDescription>
            Share this memo with the investor via WhatsApp, Email, or direct link.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={method} onValueChange={(v) => setMethod(v as typeof method)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="whatsapp">
              <MessageCircle className="mr-2 h-4 w-4" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="email">
              <Mail className="mr-2 h-4 w-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="link">
              <Link2 className="mr-2 h-4 w-4" />
              Link
            </TabsTrigger>
          </TabsList>

          <TabsContent value="whatsapp" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="whatsapp-contact">WhatsApp Number</Label>
              <Input
                id="whatsapp-contact"
                placeholder="+971 50 123 4567"
                value={recipientContact}
                onChange={(e) => setRecipientContact(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp-message">Message (optional)</Label>
              <Textarea
                id="whatsapp-message"
                placeholder={defaultMessage}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-contact">Email Address</Label>
              <Input
                id="email-contact"
                type="email"
                placeholder="investor@example.com"
                value={recipientContact}
                onChange={(e) => setRecipientContact(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-message">Message (optional)</Label>
              <Textarea
                id="email-message"
                placeholder={defaultMessage}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>
          </TabsContent>

          <TabsContent value="link" className="space-y-4">
            <div className="space-y-2">
              <Label>Share Link</Label>
              {shareUrl ? (
                <div className="flex gap-2">
                  <Input value={shareUrl} readOnly className="font-mono text-sm" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyLink}
                    disabled={copied}
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Click "Create Share Link" to generate a shareable URL
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleShare} disabled={loading}>
            {loading ? "Sharing..." : shareUrl ? "Share Again" : "Create Share Link"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
