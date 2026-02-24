"use client"

import type React from "react"
import { useCallback, useState } from "react"

import { InvestorTopbar } from "@/components/investor/investor-topbar"
import { InvestorTopNav } from "@/components/investor/investor-top-nav"
import { InvestorMobileSidebar } from "@/components/investor/investor-mobile-sidebar"
import { MobileActionBar } from "@/components/investor/mobile-action-bar"
import { InvestorAIPanel } from "@/components/investor/investor-ai-panel"
import { AppProvider, useApp } from "@/components/providers/app-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { DemoBannerWrapper } from "@/components/demo/demo-banner"
import { AIWidgetProvider } from "@/components/ai/ai-widget-provider"
import { InsightProvider, InsightAnnotator, InsightToggle } from "@/components/insights"
import { isDemoMode } from "@/lib/demo-mode"

function InvestorLayoutContent({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [aiPanelOpen, setAIPanelOpen] = useState(false)
  const { user, scopedInvestorId, platformRole, availableInvestors, setScopedInvestorId, demoModeActive } = useApp()

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

  // Determine if this is a super_admin previewing the investor portal (not in demo mode)
  const isSuperAdmin = platformRole === "super_admin" && !demoModeActive

  // For super_admins (not in demo), find the selected investor from the available list
  const selectedInvestor = isSuperAdmin && scopedInvestorId
    ? availableInvestors.find((inv) => inv.id === scopedInvestorId)
    : undefined

  // Get investor display info:
  // - Demo mode: persona controls everything (user.name comes from persona)
  // - Super admin preview: show selected investor's name
  // - Real investor: show auth user's name
  const investorName = demoModeActive
    ? user?.name ?? "Investor"
    : selectedInvestor?.name ?? user?.name ?? "Investor"
  const companyName = demoModeActive
    ? "Investment Portfolio"
    : selectedInvestor?.company ?? "Investment Portfolio"
  const investorAvatar = user?.avatar

  return (
    <AIWidgetProvider 
      investorId={scopedInvestorId ?? undefined}
      showFloatingHub={true}
      showLiveAlerts={true}
      alertDelaySeconds={45}
    >
      <InsightProvider>
        <div className="flex h-screen overflow-hidden bg-white">
          {/* Mobile Sidebar (hamburger menu) */}
          <InvestorMobileSidebar open={mobileMenuOpen} onClose={handleMobileMenuClose} />

          {/* Main Content */}
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <InvestorTopbar
              onMenuClick={() => setMobileMenuOpen(true)}
              investorName={investorName}
              companyName={companyName}
              investorAvatar={investorAvatar}
              isSuperAdmin={isSuperAdmin}
              availableInvestors={availableInvestors}
              selectedInvestorId={scopedInvestorId}
              onInvestorChange={setScopedInvestorId}
            />

            {/* Top navigation: Overview | Portfolio | Opportunities | ... */}
            <InvestorTopNav />

            <main className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50">
              {/* Full width with padding so content uses horizontal space without empty sides */}
              <div className="w-full px-4 sm:px-6 lg:px-8 pt-4 lg:pt-6 pb-20 lg:pb-6">
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

          {/* Insight Annotations System */}
          <InsightAnnotator />
          <InsightToggle />
        </div>
      </InsightProvider>
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
