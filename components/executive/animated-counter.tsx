"use client"

import * as React from "react"
import { motion, useMotionValue, useTransform, animate } from "framer-motion"

interface AnimatedCounterProps {
  value: number
  duration?: number
  delay?: number
  prefix?: string
  suffix?: string
  formatter?: (value: number) => string
  className?: string
}

function defaultFormatter(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return Math.round(value).toLocaleString()
}

export function AnimatedCounter({
  value,
  duration = 2,
  delay = 0,
  prefix = "",
  suffix = "",
  formatter = defaultFormatter,
  className,
}: AnimatedCounterProps) {
  const motionValue = useMotionValue(0)
  const display = useTransform(motionValue, (latest) => `${prefix}${formatter(latest)}${suffix}`)
  const [displayText, setDisplayText] = React.useState(`${prefix}${formatter(0)}${suffix}`)

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      const controls = animate(motionValue, value, {
        duration,
        ease: "easeOut",
      })
      return () => controls.stop()
    }, delay * 1000)
    return () => clearTimeout(timeout)
  }, [motionValue, value, duration, delay])

  React.useEffect(() => {
    const unsubscribe = display.on("change", setDisplayText)
    return unsubscribe
  }, [display])

  return (
    <motion.span
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      {displayText}
    </motion.span>
  )
}
