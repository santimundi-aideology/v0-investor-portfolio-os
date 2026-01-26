"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ScoreBadgeProps {
  score: number
  size?: "sm" | "md" | "lg"
  showLabel?: boolean
  className?: string
  animate?: boolean
}

export function ScoreBadge({
  score,
  size = "md",
  showLabel = false,
  className,
  animate = true,
}: ScoreBadgeProps) {
  const isHighMatch = score >= 85
  const isMediumMatch = score >= 70 && score < 85
  
  const sizeClasses = {
    sm: "h-6 min-w-6 text-xs",
    md: "h-8 min-w-8 text-sm",
    lg: "h-10 min-w-10 text-base",
  }
  
  const colorClasses = isHighMatch
    ? "bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-green-500/30"
    : isMediumMatch
    ? "bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-amber-500/30"
    : "bg-gradient-to-br from-gray-400 to-gray-500 text-white shadow-gray-500/20"

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center rounded-full font-semibold shadow-lg",
        sizeClasses[size],
        colorClasses,
        animate && isHighMatch && "animate-pulse-glow",
        className
      )}
    >
      {/* Pulse ring for high scores */}
      {animate && isHighMatch && (
        <>
          <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-30" />
          <span className="absolute inset-0 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 animate-pulse opacity-50" />
        </>
      )}
      
      {/* Score number */}
      <span className="relative z-10 px-2">{score}</span>
      
      {/* Label */}
      {showLabel && (
        <span className="ml-1 text-[10px] uppercase tracking-wide opacity-80">
          {isHighMatch ? "Hot" : isMediumMatch ? "Good" : "Fair"}
        </span>
      )}
    </div>
  )
}

/**
 * Animated score reveal
 */
export function AnimatedScoreBadge({
  score,
  delay = 0,
  ...props
}: ScoreBadgeProps & { delay?: number }) {
  const [displayScore, setDisplayScore] = React.useState(0)
  const [isAnimating, setIsAnimating] = React.useState(true)

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      let current = 0
      const increment = Math.ceil(score / 20)
      const interval = setInterval(() => {
        current = Math.min(current + increment, score)
        setDisplayScore(current)
        if (current >= score) {
          clearInterval(interval)
          setIsAnimating(false)
        }
      }, 50)
      
      return () => clearInterval(interval)
    }, delay)
    
    return () => clearTimeout(timeout)
  }, [score, delay])

  return (
    <ScoreBadge
      {...props}
      score={displayScore}
      animate={!isAnimating && props.animate}
      className={cn(
        props.className,
        isAnimating && "scale-110 transition-transform"
      )}
    />
  )
}

export default ScoreBadge
