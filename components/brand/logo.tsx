import type React from "react"
import { cn } from "@/lib/utils"

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number
  showText?: boolean
  textClassName?: string
}

export function VantageLogo({ size = 32, showText = false, className, textClassName, ...props }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
      >
        {/* Background rounded square - optional, can be removed for just the mark */}
        <rect width="40" height="40" rx="10" fill="currentColor" className="text-primary" />
        
        {/* The "V" Shape */}
        <path
          d="M10 10L20 30L30 10H24L20 20L16 10H10Z"
          fill="white"
        />
        
        {/* The "Vantage Point" - Gold Spark */}
        <path
          d="M20 20L17 25H23L20 20Z"
          fill="#D4AF37"
        />
        
        {/* Vertical Detail */}
        <rect x="19.5" y="10" width="1" height="6" rx="0.5" fill="#D4AF37" />
      </svg>
      
      {showText && (
        <span className={cn("text-xl font-bold tracking-tight text-foreground", textClassName)}>
          Vantage
        </span>
      )}
    </div>
  )
}

export function VantageIcon({ size = 32, className, ...props }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <rect width="40" height="40" rx="10" fill="currentColor" className="text-primary" />
      <path
        d="M10 10L20 30L30 10H24L20 20L16 10H10Z"
        fill="white"
      />
      <path
        d="M20 20L17 25H23L20 20Z"
        fill="#D4AF37"
      />
      <rect x="19.5" y="10" width="1" height="6" rx="0.5" fill="#D4AF37" />
    </svg>
  )
}
