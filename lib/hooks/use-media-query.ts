"use client"

import { useState, useEffect } from "react"

/**
 * Hook to check if a media query matches
 * @param query - CSS media query string (e.g., "(min-width: 768px)")
 * @returns boolean indicating if the query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    
    // Set initial value
    setMatches(media.matches)

    // Create listener
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // Add listener
    media.addEventListener("change", listener)

    // Cleanup
    return () => media.removeEventListener("change", listener)
  }, [query])

  return matches
}

/**
 * Convenience hook for checking mobile breakpoint
 * @returns true if screen width is less than 640px (Tailwind sm breakpoint)
 */
export function useIsMobile(): boolean {
  return !useMediaQuery("(min-width: 640px)")
}

/**
 * Convenience hook for checking tablet breakpoint
 * @returns true if screen width is less than 1024px (Tailwind lg breakpoint)
 */
export function useIsTablet(): boolean {
  return !useMediaQuery("(min-width: 1024px)")
}
