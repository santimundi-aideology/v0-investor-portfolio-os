"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"

interface KeyboardShortcutsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const shortcuts = [
  {
    category: "Navigation",
    items: [
      { keys: ["⌘", "K"], description: "Open command palette" },
      { keys: ["⌘", "B"], description: "Toggle sidebar" },
      { keys: ["⌘", "/"], description: "Focus search" },
    ],
  },
  {
    category: "Actions",
    items: [
      { keys: ["⌘", "N"], description: "Create new item" },
      { keys: ["⌘", "S"], description: "Save changes" },
      { keys: ["⌘", "Enter"], description: "Submit form" },
    ],
  },
  {
    category: "Quick Access",
    items: [
      { keys: ["G", "D"], description: "Go to Dashboard" },
      { keys: ["G", "I"], description: "Go to Investors" },
      { keys: ["G", "P"], description: "Go to Properties" },
      { keys: ["G", "T"], description: "Go to Tasks" },
      { keys: ["G", "M"], description: "Go to Memos" },
    ],
  },
  {
    category: "General",
    items: [
      { keys: ["Esc"], description: "Close modal / Cancel" },
      { keys: ["?"], description: "Show keyboard shortcuts" },
    ],
  },
]

export function KeyboardShortcutsModal({ open, onOpenChange }: KeyboardShortcutsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate and work faster in Vantage.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 pt-4">
          {shortcuts.map((section, index) => (
            <div key={section.category}>
              {index > 0 && <Separator className="mb-4" />}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  {section.category}
                </h3>
                <div className="grid gap-2">
                  {section.items.map((shortcut) => (
                    <div
                      key={shortcut.description}
                      className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted/50"
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, i) => (
                          <React.Fragment key={i}>
                            <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded border bg-muted px-1.5 text-xs font-medium">
                              {key}
                            </kbd>
                            {i < shortcut.keys.length - 1 && (
                              <span className="text-xs text-gray-500">+</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-gray-500 text-center">
            Press <kbd className="px-1 py-0.5 rounded border bg-muted text-xs">?</kbd> anywhere to show this dialog
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
