"use client"

import * as React from "react"
import { ThemeProvider } from "next-themes"
import { AuthProvider } from "./auth-provider"

/**
 * Root providers wrapper for the application.
 * Includes:
 * - ThemeProvider for dark/light mode
 * - AuthProvider for authentication state
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  )
}
