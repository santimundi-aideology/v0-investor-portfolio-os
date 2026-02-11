"use client"

import * as React from "react"
import Link from "next/link"
import { CreditCard } from "lucide-react"

import { PortfolioPaymentOverview } from "@/components/investor/payment-milestones"
import { useApp } from "@/components/providers/app-provider"
import { Loader2 } from "lucide-react"

export default function InvestorPaymentsPage() {
  const { scopedInvestorId } = useApp()

  if (!scopedInvestorId) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex gap-1 border-b border-gray-200">
          <Link href="/investor/portfolio" className="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700">Holdings</Link>
          <Link href="/investor/analytics" className="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700">Analytics</Link>
          <Link href="/investor/payments" className="px-4 py-2 text-sm font-medium border-b-2 border-primary text-primary">Payments</Link>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="mx-auto size-8 animate-spin text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">Loading payments...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Section Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        <Link
          href="/investor/portfolio"
          className="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700"
        >
          Holdings
        </Link>
        <Link
          href="/investor/analytics"
          className="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700"
        >
          Analytics
        </Link>
        <Link
          href="/investor/payments"
          className="px-4 py-2 text-sm font-medium border-b-2 border-primary text-primary"
        >
          Payments
        </Link>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-primary" />
          Payment Schedule
        </h1>
        <p className="text-sm sm:text-base text-gray-500">
          Track payment milestones and upcoming installments across your portfolio
        </p>
      </div>

      {/* Payment overview */}
      <PortfolioPaymentOverview />
    </div>
  )
}
