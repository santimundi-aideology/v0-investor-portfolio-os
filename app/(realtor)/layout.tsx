"use client"

import type React from "react"
import { useCallback, useState } from "react"

import { RealtorTopbar } from "@/components/realtor/realtor-topbar"
import { RealtorTopNav } from "@/components/realtor/realtor-top-nav"
import { RealtorMobileSidebar } from "@/components/realtor/realtor-mobile-sidebar"
import { RealtorMobileActionBar } from "@/components/realtor/realtor-mobile-action-bar"
import { AppProvider } from "@/components/providers/app-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { DemoBannerWrapper } from "@/components/demo/demo-banner"
import { AIWidgetProvider } from "@/components/ai/ai-widget-provider"
import { InsightProvider, InsightAnnotator, InsightToggle } from "@/components/insights"

function RealtorLayoutContent({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [aiPanelOpen, setAIPanelOpen] = useState(false)
  const handleMobileMenuClose = useCallback(() => {
    setMobileMenuOpen(false)
  }, [])

  const handleAIClick = useCallback(() => {
    setAIPanelOpen(true)
  }, [])

  const handleAIPanelClose = useCallback(() => {
    setAIPanelOpen(false)
  }, [])

  const unreadCount = 0

  return (
    <AIWidgetProvider showFloatingHub={true} showLiveAlerts={false}>
      <InsightProvider>
        <div className="flex h-dvh overflow-hidden bg-white">
          <RealtorMobileSidebar open={mobileMenuOpen} onClose={handleMobileMenuClose} />

          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <RealtorTopbar onMenuClick={() => setMobileMenuOpen(true)} />
            <RealtorTopNav />

            <main className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50">
              <div className="w-full px-4 sm:px-6 lg:px-8 pt-4 lg:pt-6 pb-20 lg:pb-6">
                {children}
              </div>
            </main>
          </div>

          <RealtorMobileActionBar
            notificationCount={unreadCount}
            onAIClick={handleAIClick}
            isAIPanelOpen={aiPanelOpen}
          />

          {aiPanelOpen && (
            <div className="lg:hidden">
              <div
                className="fixed inset-0 z-50 flex items-end bg-black/50 backdrop-blur-sm"
                onClick={handleAIPanelClose}
              >
                <div
                  className="w-full rounded-t-2xl bg-background p-6 shadow-xl border max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                      </div>
                      <div>
                        <h3 className="font-semibold">AI Deal Copilot</h3>
                        <p className="text-sm text-gray-500">Ask about investors, pipeline, or property analysis</p>
                      </div>
                    </div>
                    <button
                      onClick={handleAIPanelClose}
                      className="rounded-lg p-2 hover:bg-gray-100 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                  </div>
                  <div className="space-y-3">
                    <button className="w-full text-left rounded-lg border p-3 text-sm hover:bg-gray-50 transition-colors">
                      Which investor should I follow up with today?
                    </button>
                    <button className="w-full text-left rounded-lg border p-3 text-sm hover:bg-gray-50 transition-colors">
                      Summarize blockers in my live deals
                    </button>
                    <button className="w-full text-left rounded-lg border p-3 text-sm hover:bg-gray-50 transition-colors">
                      What properties match open mandates?
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DemoBannerWrapper />
          <InsightAnnotator />
          <InsightToggle />
        </div>
      </InsightProvider>
    </AIWidgetProvider>
  )
}

export default function RealtorLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <AppProvider>
        <RealtorLayoutContent>{children}</RealtorLayoutContent>
      </AppProvider>
    </ThemeProvider>
  )
}
