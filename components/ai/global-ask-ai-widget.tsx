"use client"

import { usePathname } from "next/navigation"

import { AskAIBankerWidget } from "@/components/ai/ask-ai-banker-widget"

const suggestedQuestions = [
  "Which investors still need qualified inventory?",
  "Summarize deals that could close this month.",
  "Draft an update for Fatima about the JVC villa diligence.",
  "What properties should I verify next?",
  "List tasks due this week and who they impact.",
]

export function GlobalAskAIWidget() {
  const pathname = usePathname()

  return (
    <AskAIBankerWidget
      variant="floating"
      agentId="real_estate_advisor"
      title="AI Deal Copilot"
      description="Insights and recommendations tailored to your real estate portfolio."
      suggestedQuestions={suggestedQuestions}
      pagePath={pathname}
    />
  )
}


