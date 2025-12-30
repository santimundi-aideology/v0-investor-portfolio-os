"use client"

import * as React from "react"
import { toast } from "sonner"
import { Camera, Link as LinkIcon, Trash2, Upload } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { fileToDataUrl, useAvatarOverride } from "@/lib/avatar-overrides"

export function EditableAvatar({
  storageKey,
  name,
  src,
  size = 40,
  editable = true,
  className,
  onPersist,
}: {
  storageKey: string
  name: string
  src?: string
  size?: number
  editable?: boolean
  className?: string
  onPersist?: (next: string | null) => Promise<void> | void
}) {
  const [isHydrated, setIsHydrated] = React.useState(false)
  React.useEffect(() => setIsHydrated(true), [])

  const { src: resolved, isOverridden, set, clear } = useAvatarOverride(storageKey, src)
  const [open, setOpen] = React.useState(false)
  const [url, setUrl] = React.useState("")
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const initials = React.useMemo(() => {
    return name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
  }, [name])

  const applyUrl = async () => {
    const next = url.trim()
    if (!next) {
      toast.error("Paste a valid image URL")
      return
    }

    set(next)
    await Promise.resolve(onPersist?.(next))
    toast.success("Photo updated")
    setOpen(false)
    setUrl("")
  }

  const remove = async () => {
    clear()
    await Promise.resolve(onPersist?.(null))
    toast.success("Photo removed")
    setOpen(false)
    setUrl("")
  }

  const onPickFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file")
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Please upload an image under 3MB")
      return
    }

    try {
      const dataUrl = await fileToDataUrl(file)
      set(dataUrl)
      await Promise.resolve(onPersist?.(dataUrl))
      toast.success("Photo updated")
      setOpen(false)
      setUrl("")
    } catch {
      toast.error("Failed to read image")
    }
  }

  return (
    <div className={cn("relative inline-flex", className)}>
      <Avatar className="select-none" style={{ width: size, height: size }}>
        <AvatarImage src={resolved || "/placeholder.svg"} alt={name} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>

      {editable && !isHydrated ? (
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className={cn("absolute -right-2 -bottom-2 h-7 w-7 rounded-full shadow-sm", "border border-border/60")}
          aria-label="Change photo"
          title="Change photo"
          disabled
          suppressHydrationWarning
        >
          <Camera className="h-3.5 w-3.5" />
        </Button>
      ) : editable ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className={cn(
                "absolute -right-2 -bottom-2 h-7 w-7 rounded-full shadow-sm",
                "border border-border/60",
              )}
              aria-label="Change photo"
              title="Change photo"
            >
              <Camera className="h-3.5 w-3.5" />
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update photo</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={resolved || "/placeholder.svg"} alt={name} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="truncate font-medium">{name}</div>
                  <div className="text-sm text-muted-foreground">
                    {isOverridden ? "Custom photo set on this device" : "Using default photo"}
                  </div>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void onPickFile(f)
                  // allow selecting the same file again
                  e.currentTarget.value = ""
                }}
              />

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload image
                </Button>
                {isOverridden ? (
                  <Button type="button" variant="destructive" onClick={() => void remove()}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove
                  </Button>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${storageKey}-url`}>Or paste image URL</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id={`${storageKey}-url`}
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://…"
                      className="pl-9"
                    />
                  </div>
                  <Button type="button" onClick={() => void applyUrl()}>
                    Save
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  )
}


