"use client"

import type React from "react"
import { useCallback, useState } from "react"

import { InvestorSidebar } from "@/components/investor/investor-sidebar"
import { InvestorTopbar } from "@/components/investor/investor-topbar"
import { InvestorMobileSidebar } from "@/components/investor/investor-mobile-sidebar"
import { MobileActionBar } from "@/components/investor/mobile-action-bar"
import { InvestorAIPanel } from "@/components/investor/investor-ai-panel"
import { AppProvider, useApp } from "@/components/providers/app-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { DemoBannerWrapper } from "@/components/demo/demo-banner"
import { AIWidgetProvider } from "@/components/ai/ai-widget-provider"
import { isDemoMode } from "@/lib/demo-mode"

function InvestorLayoutContent({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [aiPanelOpen, setAIPanelOpen] = useState(false)
  const { user, scopedInvestorId } = useApp()

  const handleMobileMenuClose = useCallback(() => {
    setMobileMenuOpen(false)
  }, [])

  const handleAIClick = useCallback(() => {
    setAIPanelOpen(true)
  }, [])

  const handleAIPanelClose = useCallback(() => {
    setAIPanelOpen(false)
  }, [])

  // Count unread notifications for the badge
  const unreadCount = ([] as { unread?: boolean }[]).filter((n) => n.unread).length

  // Get investor display info - for demo purposes using user info
  const investorName = user?.name ?? "Investor"
  const companyName = "Investment Portfolio"
  const investorAvatar = user?.avatar

  return (
    <AIWidgetProvider 
      investorId={scopedInvestorId ?? undefined}
      showFloatingHub={true}
      showLiveAlerts={true}
      alertDelaySeconds={45}
    >
      <div className="flex h-screen overflow-hidden bg-white">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex">
          <InvestorSidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </div>

        {/* Mobile Sidebar */}
        <InvestorMobileSidebar open={mobileMenuOpen} onClose={handleMobileMenuClose} />

        {/* Main Content */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <InvestorTopbar
            onMenuClick={() => setMobileMenuOpen(true)}
            investorName={investorName}
            companyName={companyName}
            investorAvatar={investorAvatar}
          />

          <main className="flex-1 overflow-y-auto bg-gray-50">
            {/* Add bottom padding on mobile for action bar */}
            <div className="mx-auto w-full max-w-7xl p-4 lg:p-6 pb-20 lg:pb-6">
              {children}
            </div>
          </main>
        </div>

        {/* Mobile Action Bar - Fixed bottom navigation */}
        <MobileActionBar
          notificationCount={unreadCount}
          onAIClick={handleAIClick}
          isAIPanelOpen={aiPanelOpen}
        />

        {/* Mobile AI Panel - controlled from action bar */}
        {aiPanelOpen && (
          <div className="lg:hidden">
            <InvestorAIPanel
              investorId={scopedInvestorId ?? undefined}
              defaultExpanded={true}
              className="!fixed !bottom-0 !right-0 !left-0 !w-full !rounded-b-none !rounded-t-2xl max-h-[85vh]"
              onClose={handleAIPanelClose}
            />
          </div>
        )}

        {/* Demo Mode Banner */}
        <DemoBannerWrapper />
      </div>
    </AIWidgetProvider>
  )
}

export default function InvestorLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <AppProvider>
        <InvestorLayoutContent>{children}</InvestorLayoutContent>
      </AppProvider>
    </ThemeProvider>
  )
}
