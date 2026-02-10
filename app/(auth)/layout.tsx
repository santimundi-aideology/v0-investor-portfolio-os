import type React from "react"
import Link from "next/link"
import { VantageIcon } from "@/components/brand/logo"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[55%] xl:w-[60%] bg-slate-900 text-white relative overflow-hidden">
        {/* Background image + overlays */}
        <img
          src="https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1800&q=80"
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-blue-950/80" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(14,165,233,0.22),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(16,185,129,0.18),transparent_38%)]" />
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        
        {/* Content */}
        <div className="relative z-10 flex h-full w-full flex-col px-12 py-12">
          <Link href="/" className="inline-flex items-center gap-3">
            <VantageIcon size={44} />
            <div>
              <div className="text-xl font-bold">Vantage</div>
              <div className="text-[10px] font-medium text-white/50 uppercase tracking-widest">Portfolio Management</div>
            </div>
          </Link>

          <div className="flex-1 flex items-center">
            <div className="w-full max-w-[640px] space-y-8">
              <div className="space-y-4">
                <h1 className="text-white text-4xl xl:text-5xl font-bold tracking-tight leading-[1.1] text-balance">
                  Manage your real estate investments with confidence
                </h1>
                <p className="text-base xl:text-lg text-white/70 leading-relaxed max-w-[560px]">
                  The complete platform for UAE real estate professionals and investors.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FeatureItem title="Portfolio Analytics" description="Track performance across all your holdings" />
                <FeatureItem title="IC Memos" description="Generate professional investment memos in minutes" />
                <FeatureItem title="Deal Rooms" description="Secure collaboration with investors and partners" />
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-10">
            <div className="flex items-center gap-4 text-xs text-white/40">
              <span className="flex items-center gap-1.5">
                <LockIcon />
                Secure & Encrypted
              </span>
              <span>RERA Licensed</span>
              <span>UAE Based</span>
            </div>
            <div className="text-xs text-white/30">
              © {new Date().getFullYear()} Vantage. All rights reserved.
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col min-h-screen bg-background">
        {/* Mobile header */}
        <header className="lg:hidden p-6 border-b">
          <Link href="/" className="inline-flex items-center gap-3">
            <VantageIcon size={40} />
            <span className="text-lg font-bold">Vantage</span>
          </Link>
        </header>

        {/* Form container */}
        <main className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-[400px]">
            {children}
          </div>
        </main>

        {/* Mobile footer */}
        <footer className="lg:hidden p-6 border-t text-center">
          <div className="flex items-center justify-center gap-3 text-xs text-gray-500 mb-2">
            <span>Secure</span>
            <span className="text-gray-400">•</span>
            <span>RERA Licensed</span>
            <span className="text-gray-400">•</span>
            <span>UAE Based</span>
          </div>
          <div className="text-xs text-gray-500">
            © {new Date().getFullYear()} Vantage
          </div>
        </footer>
      </div>
    </div>
  )
}

function FeatureItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-white/5 border border-white/10">
      <div className="h-2 w-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
      <div>
        <div className="font-medium text-white text-sm">{title}</div>
        <div className="text-xs text-white/50">{description}</div>
      </div>
    </div>
  )
}

function LockIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  )
}
