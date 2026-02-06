import { describe, it, expect } from 'vitest'
import { calculateSimulation, calculateUnitMetrics } from '../financial-calculations'

describe('calculateSimulation', () => {
  it('should calculate ROI for a simple cash purchase', () => {
    const params = {
      purchasePrice: 1_000_000,
      downPaymentPct: 100,
      mortgageRate: 0,
      mortgageTerm: 0,
      annualRentIncome: 60_000,
      rentalGrowthPct: 2,
      occupancyRate: 95,
      annualExpensesPct: 2,
      appreciationPct: 5,
      holdPeriod: 5,
      exitCostPct: 2,
      dldFee: 4,
    }

    const results = calculateSimulation(params)
    
    expect(results).toHaveLength(5)
    expect(results[0].year).toBe(1)
    expect(results[4].year).toBe(5)
    
    // First year should have positive cash flow
    expect(results[0].cumulativeRent).toBeGreaterThan(0)
    expect(results[0].propertyValue).toBeGreaterThan(params.purchasePrice)
    
    // Final year should show total return
    const finalYear = results[4]
    expect(finalYear.totalReturn).toBeGreaterThan(0)
    expect(finalYear.equityMultiple).toBeGreaterThan(1)
  })

  it('should handle mortgage payments correctly', () => {
    const params = {
      purchasePrice: 1_000_000,
      downPaymentPct: 20,
      mortgageRate: 4.5,
      mortgageTerm: 25,
      annualRentIncome: 60_000,
      rentalGrowthPct: 2,
      occupancyRate: 95,
      annualExpensesPct: 2,
      appreciationPct: 5,
      holdPeriod: 3,
      exitCostPct: 2,
      dldFee: 4,
    }

    const results = calculateSimulation(params)
    
    // With mortgage, expenses should include mortgage payments
    expect(results[0].cumulativeExpenses).toBeGreaterThan(0)
    
    // Property value should appreciate
    expect(results[2].propertyValue).toBeGreaterThan(params.purchasePrice)
  })

  it('should handle zero hold period gracefully', () => {
    const params = {
      purchasePrice: 1_000_000,
      downPaymentPct: 100,
      mortgageRate: 0,
      mortgageTerm: 0,
      annualRentIncome: 60_000,
      rentalGrowthPct: 0,
      occupancyRate: 100,
      annualExpensesPct: 0,
      appreciationPct: 0,
      holdPeriod: 0,
      exitCostPct: 0,
      dldFee: 0,
    }

    const results = calculateSimulation(params)
    expect(results).toHaveLength(0)
  })

  it('should calculate DLD fee in initial investment', () => {
    const params = {
      purchasePrice: 1_000_000,
      downPaymentPct: 100,
      mortgageRate: 0,
      mortgageTerm: 0,
      annualRentIncome: 60_000,
      rentalGrowthPct: 0,
      occupancyRate: 100,
      annualExpensesPct: 0,
      appreciationPct: 0,
      holdPeriod: 1,
      exitCostPct: 0,
      dldFee: 4, // 4% DLD fee
    }

    const results = calculateSimulation(params)
    const dldFeeAmount = params.purchasePrice * 0.04
    const initialInvestment = params.purchasePrice + dldFeeAmount
    
    // Total return should account for DLD fee
    expect(results[0].totalReturn).toBeLessThan(0) // Negative in first year due to DLD fee
  })
})

describe('calculateUnitMetrics', () => {
  it('should calculate off-plan unit metrics correctly', () => {
    const params = {
      totalPrice: 1_000_000,
      constructionPercent: 50,
      postHandoverPercent: 40,
      bookingPercent: 10,
    }

    const metrics = calculateUnitMetrics(params)
    
    expect(metrics.estimatedRentalYield).toBe(6.5)
    expect(metrics.monthlyRent).toBeGreaterThan(0)
    expect(metrics.estimatedCompletionValue).toBe(1_150_000) // 15% appreciation
    expect(metrics.capitalGainPct).toBe(15)
    
    expect(metrics.bookingAmount).toBe(100_000) // 10% of 1M
    expect(metrics.constructionAmount).toBe(500_000) // 50% of 1M
    expect(metrics.handoverAmount).toBe(400_000) // 40% of 1M
    expect(metrics.totalCashOutlay).toBe(600_000) // booking + construction
  })

  it('should calculate ROI on cash deployed', () => {
    const params = {
      totalPrice: 1_000_000,
      constructionPercent: 50,
      postHandoverPercent: 40,
      bookingPercent: 10,
    }

    const metrics = calculateUnitMetrics(params)
    
    // ROI should be positive (15% appreciation on 60% cash deployed)
    expect(metrics.roiOnCashDeployed).toBeGreaterThan(0)
  })

  it('should handle zero price gracefully', () => {
    const params = {
      totalPrice: 0,
      constructionPercent: 50,
      postHandoverPercent: 40,
      bookingPercent: 10,
    }

    const metrics = calculateUnitMetrics(params)
    
    expect(metrics.monthlyRent).toBe(0)
    expect(metrics.estimatedCompletionValue).toBe(0)
    expect(metrics.bookingAmount).toBe(0)
  })
})
