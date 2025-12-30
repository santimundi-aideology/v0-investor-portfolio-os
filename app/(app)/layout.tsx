"use client"

import type React from "react"
import { useCallback, useState } from "react"
import { usePathname } from "next/navigation"

import { Sidebar } from "@/components/app-shell/sidebar"
import { Topbar } from "@/components/app-shell/topbar"
import { MobileSidebar } from "@/components/app-shell/mobile-sidebar"
import { AppProvider } from "@/components/providers/app-provider"
import { CommandPalette } from "@/components/command/command-palette"
import { AppBreadcrumbs } from "@/components/layout/breadcrumbs"
import { Separator } from "@/components/ui/separator"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleMobileMenuClose = useCallback(() => {
    setMobileMenuOpen(false)
  }, [])

  return (
    <AppProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex">
          <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        </div>

        {/* Mobile Sidebar */}
        <MobileSidebar open={mobileMenuOpen} onClose={handleMobileMenuClose} />

        {/* Command palette */}
        <CommandPalette />

        {/* Main Content */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar onMenuClick={() => setMobileMenuOpen(true)} />

          <div className="border-b border-border bg-background px-4 py-3 lg:px-6">
            <div className="mx-auto w-full max-w-7xl">
              <AppBreadcrumbs />
            </div>
          </div>

          <main className="flex-1 overflow-y-auto bg-surface-warm">
            <div className="mx-auto w-full max-w-7xl p-4 lg:p-6">{children}</div>
            {pathname.startsWith("/settings") ? (
              <>
                <div className="mx-auto w-full max-w-7xl px-4 lg:px-6">
                  <Separator className="my-6" />
                </div>
                <footer className="mx-auto w-full max-w-7xl px-4 pb-10 text-xs text-muted-foreground lg:px-6">
                  Investor Portfolio OS for Realtors • Settings
                </footer>
              </>
            ) : null}
          </main>
        </div>
      </div>
    </AppProvider>
  )
}
