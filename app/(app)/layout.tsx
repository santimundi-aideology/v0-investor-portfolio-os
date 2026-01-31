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
import { DemoBannerWrapper } from "@/components/demo/demo-banner"
import { AIWidgetProvider } from "@/components/ai/ai-widget-provider"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleMobileMenuClose = useCallback(() => {
    setMobileMenuOpen(false)
  }, [])

  return (
    <AppProvider>
      <AIWidgetProvider showFloatingHub={true} showLiveAlerts={false}>
        <div className="flex h-screen overflow-hidden bg-white">
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

            <div className="border-b border-gray-100 bg-white px-4 py-3 lg:px-6">
              <div className="mx-auto w-full max-w-7xl">
                <AppBreadcrumbs />
              </div>
            </div>

            <main className="flex-1 overflow-y-auto bg-gray-50">
              <div className="mx-auto w-full max-w-7xl p-4 lg:p-6">{children}</div>
              {pathname.startsWith("/settings") ? (
                <>
                  <div className="mx-auto w-full max-w-7xl px-4 lg:px-6">
                    <Separator className="my-6" />
                  </div>
                  <footer className="mx-auto w-full max-w-7xl px-4 pb-10 text-xs text-gray-500 lg:px-6">
                    Vantage for Realtors • Settings
                  </footer>
                </>
              ) : null}
            </main>
          </div>

          {/* Demo Mode Banner */}
          <DemoBannerWrapper />
        </div>
      </AIWidgetProvider>
    </AppProvider>
  )
}
