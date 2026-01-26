"use client"

import * as React from "react"
import { Sparkles } from "lucide-react"

import type { AIAgentId } from "@/lib/ai/agents"
import { Button } from "@/components/ui/button"
import { AIBankerChatInterface } from "@/components/ai/ai-banker-chat-interface"

/**
 * Memo context payload for the memo_assistant agent.
 * Contains the key data from an investment memo needed for AI analysis.
 */
export type MemoContextPayload = {
  execSummary?: string
  assumptions?: string[]
  scenarios?: Record<string, unknown>
  comps?: unknown[]
  trustStatus?: "verified" | "unknown" | "flagged"
  trustReason?: string
  version?: number
}

export function AskAIBankerWidget({
  agentId,
  title,
  description,
  suggestedQuestions,
  pagePath,
  scopedInvestorId,
  propertyId,
  memoContext,
  variant = "inline",
}: {
  agentId: AIAgentId
  title: string
  description?: string
  suggestedQuestions: string[]
  pagePath?: string
  scopedInvestorId?: string
  propertyId?: string
  memoContext?: MemoContextPayload
  variant?: "inline" | "floating"
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      {variant === "floating" ? (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={() => setOpen(true)}
            className="h-12 rounded-full px-4 shadow-lg"
            style={{ backgroundColor: "#10b981" }}
          >
            <Sparkles className="mr-2 size-4" />
            Ask AI
          </Button>
        </div>
      ) : (
        <Button onClick={() => setOpen(true)} variant="outline" className="gap-2">
          <Sparkles className="size-4" />
          Ask AI
        </Button>
      )}

      <AIBankerChatInterface
        open={open}
        onOpenChange={setOpen}
        agentId={agentId}
        title={title}
        description={description}
        suggestedQuestions={suggestedQuestions}
        pagePath={pagePath}
        scopedInvestorId={scopedInvestorId}
        propertyId={propertyId}
        memoContext={memoContext}
      />
    </>
  )
}


