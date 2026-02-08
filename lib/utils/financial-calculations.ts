/**
 * Financial calculation utilities for property investments
 * Extracted for testability
 */

export interface SimulationParams {
  purchasePrice: number
  downPaymentPct: number
  mortgageRate: number
  mortgageTerm: number
  annualRentIncome: number
  rentalGrowthPct: number
  occupancyRate: number
  annualExpensesPct: number
  appreciationPct: number
  holdPeriod: number
  exitCostPct: number
  dldFee: number
}

export interface SimulationResult {
  year: number
  propertyValue: number
  cumulativeRent: number
  cumulativeExpenses: number
  netCashFlow: number
  totalReturn: number
  totalReturnPct: number
  equityMultiple: number
  annualizedIrr: number
}

export interface UnitMetricsParams {
  totalPrice: number
  constructionPercent: number
  postHandoverPercent: number
  bookingPercent: number
}

export interface UnitMetrics {
  estimatedRentalYield: number
  monthlyRent: number
  estimatedCompletionValue: number
  capitalGainPct: number
  bookingAmount: number
  constructionAmount: number
  handoverAmount: number
  totalCashOutlay: number
  roiOnCashDeployed: number
}

/**
 * Calculate ROI simulation for property investment
 */
export function calculateSimulation(params: SimulationParams): SimulationResult[] {
  const {
    purchasePrice,
    downPaymentPct,
    mortgageRate,
    mortgageTerm,
    annualRentIncome,
    rentalGrowthPct,
    occupancyRate,
    annualExpensesPct,
    appreciationPct,
    holdPeriod,
    exitCostPct,
    dldFee,
  } = params

  const downPayment = purchasePrice * (downPaymentPct / 100)
  const loanAmount = purchasePrice - downPayment
  const dldFeeAmount = purchasePrice * (dldFee / 100)
  const initialInvestment = downPayment + dldFeeAmount

  // Monthly mortgage payment
  const monthlyRate = mortgageRate / 100 / 12
  const totalPayments = mortgageTerm * 12
  const monthlyPayment = loanAmount > 0 && monthlyRate > 0
    ? loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) / (Math.pow(1 + monthlyRate, totalPayments) - 1)
    : 0
  const annualMortgage = monthlyPayment * 12

  const results: SimulationResult[] = []
  let cumulativeRent = 0
  let cumulativeExpenses = 0

  for (let year = 1; year <= holdPeriod; year++) {
    const propertyValue = purchasePrice * Math.pow(1 + appreciationPct / 100, year)
    const yearlyRent = annualRentIncome * Math.pow(1 + rentalGrowthPct / 100, year - 1) * (occupancyRate / 100)
    const yearlyExpenses = propertyValue * (annualExpensesPct / 100) + annualMortgage

    cumulativeRent += yearlyRent
    cumulativeExpenses += yearlyExpenses

    const netCashFlow = cumulativeRent - cumulativeExpenses
    const exitCosts = propertyValue * (exitCostPct / 100)

    // Outstanding mortgage balance
    const remainingPayments = Math.max(0, totalPayments - year * 12)
    const outstandingLoan = remainingPayments > 0
      ? loanAmount * (Math.pow(1 + monthlyRate, totalPayments) - Math.pow(1 + monthlyRate, year * 12)) / (Math.pow(1 + monthlyRate, totalPayments) - 1)
      : 0

    const netSaleProceeds = propertyValue - outstandingLoan - exitCosts
    const totalReturn = netSaleProceeds + netCashFlow - initialInvestment
    const totalReturnPct = initialInvestment > 0 ? (totalReturn / initialInvestment) * 100 : 0
    const equityMultiple = initialInvestment > 0 ? (netSaleProceeds + netCashFlow) / initialInvestment : 0

    // Simplified IRR approximation
    const annualizedIrr = year > 0 ? (Math.pow(equityMultiple, 1 / year) - 1) * 100 : 0

    results.push({
      year,
      propertyValue: Math.round(propertyValue),
      cumulativeRent: Math.round(cumulativeRent),
      cumulativeExpenses: Math.round(cumulativeExpenses),
      netCashFlow: Math.round(netCashFlow),
      totalReturn: Math.round(totalReturn),
      totalReturnPct: Math.round(totalReturnPct * 10) / 10,
      equityMultiple: Math.round(equityMultiple * 100) / 100,
      annualizedIrr: Math.round(annualizedIrr * 10) / 10,
    })
  }

  return results
}

/**
 * Calculate metrics for off-plan unit comparison
 */
export function calculateUnitMetrics(params: UnitMetricsParams): UnitMetrics {
  const { totalPrice, constructionPercent, postHandoverPercent, bookingPercent } = params

  const estimatedRentalYield = totalPrice > 0
    ? (totalPrice * 0.065) // Estimated 6.5% gross yield for off-plan
    : 0
  const monthlyRent = estimatedRentalYield / 12

  // Estimate capital gain based on typical off-plan premium
  const estimatedCompletionValue = totalPrice * 1.15 // 15% appreciation by completion
  const capitalGainPct = ((estimatedCompletionValue - totalPrice) / totalPrice) * 100

  const bookingAmount = totalPrice * (bookingPercent / 100)
  const constructionAmount = totalPrice * (constructionPercent / 100)
  const handoverAmount = totalPrice * (postHandoverPercent / 100)

  return {
    estimatedRentalYield: 6.5,
    monthlyRent: Math.round(monthlyRent),
    estimatedCompletionValue: Math.round(estimatedCompletionValue),
    capitalGainPct: Math.round(capitalGainPct * 10) / 10,
    bookingAmount: Math.round(bookingAmount),
    constructionAmount: Math.round(constructionAmount),
    handoverAmount: Math.round(handoverAmount),
    totalCashOutlay: Math.round(bookingAmount + constructionAmount),
    roiOnCashDeployed: constructionAmount > 0
      ? Math.round(((estimatedCompletionValue - totalPrice) / (bookingAmount + constructionAmount)) * 1000) / 10
      : 0,
  }
}
