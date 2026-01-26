"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface TypingTextProps {
  text: string
  speed?: number // ms per character
  className?: string
  onComplete?: () => void
  children?: (displayedText: string, isComplete: boolean) => React.ReactNode
}

export function TypingText({
  text,
  speed = 15,
  className,
  onComplete,
  children,
}: TypingTextProps) {
  const [displayedText, setDisplayedText] = React.useState("")
  const [isComplete, setIsComplete] = React.useState(false)

  React.useEffect(() => {
    setDisplayedText("")
    setIsComplete(false)
    
    let currentIndex = 0
    const interval = setInterval(() => {
      if (currentIndex < text.length) {
        // Add characters in chunks for faster rendering
        const chunkSize = Math.min(3, text.length - currentIndex)
        setDisplayedText(text.slice(0, currentIndex + chunkSize))
        currentIndex += chunkSize
      } else {
        clearInterval(interval)
        setIsComplete(true)
        onComplete?.()
      }
    }, speed)

    return () => clearInterval(interval)
  }, [text, speed, onComplete])

  if (children) {
    return <>{children(displayedText, isComplete)}</>
  }

  return (
    <span className={cn(className)}>
      {displayedText}
      {!isComplete && (
        <span className="inline-block w-0.5 h-4 bg-current animate-pulse ml-0.5" />
      )}
    </span>
  )
}

/**
 * Hook for typing animation
 */
export function useTypingEffect(text: string, speed: number = 15) {
  const [displayedText, setDisplayedText] = React.useState("")
  const [isComplete, setIsComplete] = React.useState(false)

  React.useEffect(() => {
    setDisplayedText("")
    setIsComplete(false)
    
    let currentIndex = 0
    const interval = setInterval(() => {
      if (currentIndex < text.length) {
        const chunkSize = Math.min(3, text.length - currentIndex)
        setDisplayedText(text.slice(0, currentIndex + chunkSize))
        currentIndex += chunkSize
      } else {
        clearInterval(interval)
        setIsComplete(true)
      }
    }, speed)

    return () => clearInterval(interval)
  }, [text, speed])

  return { displayedText, isComplete }
}

export default TypingText
