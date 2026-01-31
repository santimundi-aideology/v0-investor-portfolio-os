/**
 * Opportunity Finder Tool Definitions
 * OpenAI function calling definitions for the Opportunity Finder agent
 */

import type { ChatCompletionTool } from "openai/resources/chat/completions"

/**
 * Tool definitions for OpenAI function calling
 */
export const opportunityToolDefinitions: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_opportunities",
      description: "Search for investment opportunities matching criteria. Returns properties with AI scores, market data comparisons, and relevance explanations.",
      parameters: {
        type: "object",
        properties: {
          areas: {
            type: "array",
            items: { type: "string" },
            description: "Filter by area names, e.g. ['Dubai Marina', 'Downtown Dubai']",
          },
          propertyTypes: {
            type: "array",
            items: { 
              type: "string", 
              enum: ["residential", "commercial", "mixed-use", "land"],
            },
            description: "Filter by property types",
          },
          minPrice: { 
            type: "number", 
            description: "Minimum price in AED",
          },
          maxPrice: { 
            type: "number", 
            description: "Maximum price in AED",
          },
          minYield: { 
            type: "number", 
            description: "Minimum yield percentage, e.g. 7 for 7%",
          },
          bedrooms: { 
            type: "number", 
            description: "Number of bedrooms (for residential)",
          },
          limit: { 
            type: "number", 
            description: "Max results to return (default 5, max 10)",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_area_market_data",
      description: "Get DLD truth prices, Ejari rents, and market metrics for an area. Use this to understand market conditions.",
      parameters: {
        type: "object",
        properties: {
          area: { 
            type: "string", 
            description: "Area name, e.g. 'Dubai Marina'",
          },
          segment: { 
            type: "string", 
            description: "Property segment, e.g. '2BR', 'Office'",
          },
        },
        required: ["area"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_area_news",
      description: "Fetch latest news, developments, and market intelligence for an area. Includes sentiment and key developments.",
      parameters: {
        type: "object",
        properties: {
          area: { 
            type: "string", 
            description: "Area name to get news for",
          },
        },
        required: ["area"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compare_properties",
      description: "Compare multiple properties side-by-side with market data and scoring.",
      parameters: {
        type: "object",
        properties: {
          propertyIds: {
            type: "array",
            items: { type: "string" },
            description: "Property IDs to compare (2-5 properties)",
          },
        },
        required: ["propertyIds"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_property_details",
      description: "Get detailed information about a specific property including external market data.",
      parameters: {
        type: "object",
        properties: {
          propertyId: { 
            type: "string", 
            description: "Property ID to get details for",
          },
          includeMarketData: { 
            type: "boolean", 
            description: "Include DLD/Ejari comparison (default true)",
          },
        },
        required: ["propertyId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_investor_mandate",
      description: "Get the current investor's mandate and preferences. Use this to understand what they're looking for.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
]

/**
 * Tool input types
 */
export type SearchOpportunitiesInput = {
  areas?: string[]
  propertyTypes?: ("residential" | "commercial" | "mixed-use" | "land")[]
  minPrice?: number
  maxPrice?: number
  minYield?: number
  bedrooms?: number
  limit?: number
}

export type GetAreaMarketDataInput = {
  area: string
  segment?: string
}

export type GetAreaNewsInput = {
  area: string
}

export type ComparePropertiesInput = {
  propertyIds: string[]
}

export type GetPropertyDetailsInput = {
  propertyId: string
  includeMarketData?: boolean
}

export type GetInvestorMandateInput = Record<string, never>

/**
 * Union type for all tool inputs
 */
export type ToolInput =
  // Existing tools
  | { name: "search_opportunities"; arguments: SearchOpportunitiesInput }
  | { name: "get_area_market_data"; arguments: GetAreaMarketDataInput }
  | { name: "get_area_news"; arguments: GetAreaNewsInput }
  | { name: "compare_properties"; arguments: ComparePropertiesInput }
  | { name: "get_property_details"; arguments: GetPropertyDetailsInput }
  | { name: "get_investor_mandate"; arguments: GetInvestorMandateInput }
  | { name: "get_portfolio_summary"; arguments: GetPortfolioSummaryInput }
  | { name: "analyze_holding"; arguments: AnalyzeHoldingInput }
  | { name: "get_market_signals"; arguments: GetMarketSignalsInput }
  | { name: "compare_areas"; arguments: CompareAreasInput }
  // Valuation Sense-Check tools
  | { name: "check_valuation"; arguments: CheckValuationInput }
  | { name: "get_price_comps"; arguments: GetPriceCompsInput }
  | { name: "detect_pricing_anomalies"; arguments: DetectPricingAnomaliesInput }
  | { name: "suggest_offer_range"; arguments: SuggestOfferRangeInput }
  // Investor Matching tools
  | { name: "match_property_to_investors"; arguments: MatchPropertyToInvestorsInput }
  | { name: "score_mandate_fit"; arguments: ScoreMandateFitInput }
  | { name: "get_investor_mandates"; arguments: GetInvestorMandatesInput }
  | { name: "find_mandate_gaps"; arguments: FindMandateGapsInput }
  | { name: "route_signal_to_investors"; arguments: RouteSignalToInvestorsInput }
  // Risk Assessment tools
  | { name: "assess_property_risk"; arguments: AssessPropertyRiskInput }
  | { name: "assess_portfolio_concentration"; arguments: AssessPortfolioConcentrationInput }
  | { name: "get_area_risk_factors"; arguments: GetAreaRiskFactorsInput }
  | { name: "stress_test_deal"; arguments: StressTestDealInput }
  | { name: "generate_risk_mitigations"; arguments: GenerateRiskMitigationsInput }
  // Due Diligence tools
  | { name: "generate_dd_checklist"; arguments: GenerateDDChecklistInput }
  | { name: "verify_property_data"; arguments: VerifyPropertyDataInput }
  | { name: "get_dd_status"; arguments: GetDDStatusInput }
  | { name: "flag_dd_issues"; arguments: FlagDDIssuesInput }
  | { name: "generate_seller_questions"; arguments: GenerateSellerQuestionsInput }
  // CMA Analyst tools
  | { name: "generate_cma"; arguments: GenerateCMAInput }
  | { name: "get_comparable_sales"; arguments: GetComparableSalesInput }
  | { name: "calculate_adjustments"; arguments: CalculateAdjustmentsInput }
  | { name: "get_valuation_range"; arguments: GetValuationRangeInput }
  // Rental Optimizer tools
  | { name: "analyze_rental_performance"; arguments: AnalyzeRentalPerformanceInput }
  | { name: "get_ejari_benchmarks"; arguments: GetEjariBenchmarksInput }
  | { name: "suggest_optimal_rent"; arguments: SuggestOptimalRentInput }
  | { name: "analyze_furnishing_roi"; arguments: AnalyzeFurnishingROIInput }
  | { name: "predict_vacancy"; arguments: PredictVacancyInput }
  | { name: "assess_churn_risk"; arguments: AssessChurnRiskInput }
  // Market Forecaster tools
  | { name: "forecast_prices"; arguments: ForecastPricesInput }
  | { name: "get_leading_indicators"; arguments: GetLeadingIndicatorsInput }
  | { name: "identify_emerging_hotspots"; arguments: IdentifyEmergingHotspotsInput }
  | { name: "analyze_supply_pipeline"; arguments: AnalyzeSupplyPipelineInput }
  | { name: "run_scenario_analysis"; arguments: RunScenarioAnalysisInput }
  | { name: "get_external_factors"; arguments: GetExternalFactorsInput }

// ============================================
// Portfolio Advisor Tool Definitions
// ============================================

export const portfolioToolDefinitions: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_portfolio_summary",
      description: "Get a summary of the investor's portfolio including holdings, total value, yields, and performance metrics.",
      parameters: {
        type: "object",
        properties: {
          includePerformance: {
            type: "boolean",
            description: "Include performance metrics like appreciation, yield trends (default true)",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analyze_holding",
      description: "Deep dive analysis on a specific holding in the portfolio. Includes market comparison, yield analysis, and recommendations.",
      parameters: {
        type: "object",
        properties: {
          holdingId: {
            type: "string",
            description: "The holding ID to analyze",
          },
          includeMarketComparison: {
            type: "boolean",
            description: "Compare with current market data (default true)",
          },
        },
        required: ["holdingId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_investor_mandate",
      description: "Get the investor's mandate and investment preferences.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
]

// ============================================
// Market Intelligence Tool Definitions
// ============================================

export const marketIntelToolDefinitions: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_market_signals",
      description: "Get recent market signals for an area or segment. Includes price changes, yield opportunities, and supply indicators.",
      parameters: {
        type: "object",
        properties: {
          area: {
            type: "string",
            description: "Area name to get signals for (optional, gets all if not specified)",
          },
          signalType: {
            type: "string",
            enum: ["price_change", "yield_opportunity", "supply_spike", "rent_change"],
            description: "Filter by signal type",
          },
          severity: {
            type: "string",
            enum: ["urgent", "watch", "info"],
            description: "Filter by severity level",
          },
          limit: {
            type: "number",
            description: "Max signals to return (default 10)",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compare_areas",
      description: "Compare market metrics between multiple areas side-by-side.",
      parameters: {
        type: "object",
        properties: {
          areas: {
            type: "array",
            items: { type: "string" },
            description: "Area names to compare (2-5 areas)",
          },
          segment: {
            type: "string",
            description: "Property segment for comparison, e.g. '2BR', 'Office'",
          },
        },
        required: ["areas"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_area_market_data",
      description: "Get detailed market data for an area including DLD prices, Ejari rents, and portal metrics.",
      parameters: {
        type: "object",
        properties: {
          area: {
            type: "string",
            description: "Area name",
          },
          segment: {
            type: "string",
            description: "Property segment",
          },
        },
        required: ["area"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_area_news",
      description: "Get latest news and developments for an area.",
      parameters: {
        type: "object",
        properties: {
          area: {
            type: "string",
            description: "Area name",
          },
        },
        required: ["area"],
      },
    },
  },
]

// ============================================
// Additional Input Types
// ============================================

export type GetPortfolioSummaryInput = {
  includePerformance?: boolean
}

export type AnalyzeHoldingInput = {
  holdingId: string
  includeMarketComparison?: boolean
}

export type GetMarketSignalsInput = {
  area?: string
  signalType?: "price_change" | "yield_opportunity" | "supply_spike" | "rent_change"
  severity?: "urgent" | "watch" | "info"
  limit?: number
}

export type CompareAreasInput = {
  areas: string[]
  segment?: string
}

// ============================================
// Valuation Sense-Check Tool Definitions
// ============================================

export const valuationToolDefinitions: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "check_valuation",
      description: "Quick valuation check against DLD market data. Returns price comparison, variance, and assessment.",
      parameters: {
        type: "object",
        properties: {
          propertyId: {
            type: "string",
            description: "Property ID to check valuation for",
          },
          askingPrice: {
            type: "number",
            description: "Asking price in AED (optional if property has price)",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_price_comps",
      description: "Get recent comparable sales for pricing analysis.",
      parameters: {
        type: "object",
        properties: {
          area: {
            type: "string",
            description: "Area name",
          },
          segment: {
            type: "string",
            description: "Property segment (e.g., '2BR', 'Studio')",
          },
          limit: {
            type: "number",
            description: "Max comps to return (default 10)",
          },
        },
        required: ["area"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "detect_pricing_anomalies",
      description: "Detect potential pricing errors or manipulation in a listing.",
      parameters: {
        type: "object",
        properties: {
          propertyId: {
            type: "string",
            description: "Property ID to analyze",
          },
        },
        required: ["propertyId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "suggest_offer_range",
      description: "Suggest offer price range based on market data and negotiation room.",
      parameters: {
        type: "object",
        properties: {
          propertyId: {
            type: "string",
            description: "Property ID",
          },
          investorRiskTolerance: {
            type: "string",
            enum: ["low", "medium", "high"],
            description: "Investor's risk tolerance for offer aggressiveness",
          },
        },
        required: ["propertyId"],
      },
    },
  },
]

// ============================================
// Investor Matching Tool Definitions
// ============================================

export const investorMatchingToolDefinitions: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "match_property_to_investors",
      description: "Find investors whose mandates match a specific property.",
      parameters: {
        type: "object",
        properties: {
          propertyId: {
            type: "string",
            description: "Property ID to match",
          },
          limit: {
            type: "number",
            description: "Max investors to return (default 5)",
          },
        },
        required: ["propertyId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "score_mandate_fit",
      description: "Score how well a property fits an investor's mandate.",
      parameters: {
        type: "object",
        properties: {
          investorId: {
            type: "string",
            description: "Investor ID",
          },
          propertyId: {
            type: "string",
            description: "Property ID",
          },
        },
        required: ["investorId", "propertyId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_investor_mandates",
      description: "Get all active investor mandates for matching.",
      parameters: {
        type: "object",
        properties: {
          segment: {
            type: "string",
            description: "Filter by investor segment (family_office, hnwi, institutional)",
          },
          minBudget: {
            type: "number",
            description: "Filter by minimum budget",
          },
          areas: {
            type: "array",
            items: { type: "string" },
            description: "Filter by preferred areas",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_mandate_gaps",
      description: "Identify what investors want but market doesn't have.",
      parameters: {
        type: "object",
        properties: {
          investorId: {
            type: "string",
            description: "Specific investor ID (optional, analyzes all if not specified)",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "route_signal_to_investors",
      description: "Determine which investors should receive a market signal.",
      parameters: {
        type: "object",
        properties: {
          signalId: {
            type: "string",
            description: "Market signal ID to route",
          },
        },
        required: ["signalId"],
      },
    },
  },
]

// ============================================
// Risk Assessment Tool Definitions
// ============================================

export const riskAssessmentToolDefinitions: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "assess_property_risk",
      description: "Generate comprehensive risk assessment for a property.",
      parameters: {
        type: "object",
        properties: {
          propertyId: {
            type: "string",
            description: "Property ID to assess",
          },
          investorId: {
            type: "string",
            description: "Investor ID for risk tolerance comparison",
          },
        },
        required: ["propertyId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "assess_portfolio_concentration",
      description: "Analyze concentration risk in an investor's portfolio.",
      parameters: {
        type: "object",
        properties: {
          investorId: {
            type: "string",
            description: "Investor ID",
          },
          includeNewProperty: {
            type: "string",
            description: "Property ID to simulate adding to portfolio",
          },
        },
        required: ["investorId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_area_risk_factors",
      description: "Get risk factors for a specific area or market.",
      parameters: {
        type: "object",
        properties: {
          area: {
            type: "string",
            description: "Area name",
          },
          segment: {
            type: "string",
            description: "Property segment",
          },
        },
        required: ["area"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "stress_test_deal",
      description: "Run stress test scenarios on a potential deal.",
      parameters: {
        type: "object",
        properties: {
          propertyId: {
            type: "string",
            description: "Property ID",
          },
          scenarios: {
            type: "array",
            items: {
              type: "string",
              enum: ["vacancy_spike", "rent_decline", "price_correction", "rate_increase"],
            },
            description: "Scenarios to test",
          },
        },
        required: ["propertyId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_risk_mitigations",
      description: "Generate risk mitigation strategies for identified risks.",
      parameters: {
        type: "object",
        properties: {
          propertyId: {
            type: "string",
            description: "Property ID",
          },
          riskFactors: {
            type: "array",
            items: { type: "string" },
            description: "Specific risk factors to address",
          },
        },
        required: ["propertyId"],
      },
    },
  },
]

// ============================================
// Due Diligence Tool Definitions
// ============================================

export const dueDiligenceToolDefinitions: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "generate_dd_checklist",
      description: "Generate a due diligence checklist for a property transaction.",
      parameters: {
        type: "object",
        properties: {
          propertyId: {
            type: "string",
            description: "Property ID",
          },
          dealType: {
            type: "string",
            enum: ["ready", "off_plan", "resale"],
            description: "Type of transaction",
          },
          complexity: {
            type: "string",
            enum: ["standard", "complex", "high_value"],
            description: "Deal complexity level",
          },
        },
        required: ["propertyId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "verify_property_data",
      description: "Cross-reference property data with DLD records.",
      parameters: {
        type: "object",
        properties: {
          propertyId: {
            type: "string",
            description: "Property ID to verify",
          },
        },
        required: ["propertyId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_dd_status",
      description: "Get current due diligence progress for a deal.",
      parameters: {
        type: "object",
        properties: {
          dealRoomId: {
            type: "string",
            description: "Deal room ID",
          },
        },
        required: ["dealRoomId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "flag_dd_issues",
      description: "Identify potential issues from due diligence findings.",
      parameters: {
        type: "object",
        properties: {
          dealRoomId: {
            type: "string",
            description: "Deal room ID",
          },
        },
        required: ["dealRoomId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_seller_questions",
      description: "Generate questions to ask seller/developer based on property and DD findings.",
      parameters: {
        type: "object",
        properties: {
          propertyId: {
            type: "string",
            description: "Property ID",
          },
          focusAreas: {
            type: "array",
            items: { type: "string" },
            description: "Specific areas to focus questions on",
          },
        },
        required: ["propertyId"],
      },
    },
  },
]

// ============================================
// CMA Analyst Tool Definitions
// ============================================

export const cmaToolDefinitions: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "generate_cma",
      description: "Generate a full comparative market analysis for a property.",
      parameters: {
        type: "object",
        properties: {
          propertyId: {
            type: "string",
            description: "Subject property ID",
          },
          compRadius: {
            type: "string",
            enum: ["building", "community", "area"],
            description: "How wide to search for comps (default: building first)",
          },
          monthsBack: {
            type: "number",
            description: "How far back to look for comps (default: 6 months)",
          },
        },
        required: ["propertyId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_comparable_sales",
      description: "Get comparable sales with optional filters.",
      parameters: {
        type: "object",
        properties: {
          area: {
            type: "string",
            description: "Area name",
          },
          segment: {
            type: "string",
            description: "Property segment",
          },
          minSize: {
            type: "number",
            description: "Minimum size in sqft",
          },
          maxSize: {
            type: "number",
            description: "Maximum size in sqft",
          },
          monthsBack: {
            type: "number",
            description: "Months to look back",
          },
          limit: {
            type: "number",
            description: "Max results",
          },
        },
        required: ["area"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate_adjustments",
      description: "Calculate price adjustments between subject and comp properties.",
      parameters: {
        type: "object",
        properties: {
          subjectId: {
            type: "string",
            description: "Subject property ID",
          },
          compIds: {
            type: "array",
            items: { type: "string" },
            description: "Comparable property IDs",
          },
        },
        required: ["subjectId", "compIds"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_valuation_range",
      description: "Calculate valuation range from adjusted comps.",
      parameters: {
        type: "object",
        properties: {
          propertyId: {
            type: "string",
            description: "Property ID",
          },
          methodology: {
            type: "string",
            enum: ["weighted_average", "median", "trimmed_mean"],
            description: "Valuation methodology",
          },
        },
        required: ["propertyId"],
      },
    },
  },
]

// ============================================
// Rental Optimizer Tool Definitions
// ============================================

export const rentalOptimizerToolDefinitions: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "analyze_rental_performance",
      description: "Analyze current rental performance vs market benchmarks.",
      parameters: {
        type: "object",
        properties: {
          holdingId: {
            type: "string",
            description: "Holding ID to analyze",
          },
        },
        required: ["holdingId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_ejari_benchmarks",
      description: "Get Ejari rental benchmarks for an area and segment.",
      parameters: {
        type: "object",
        properties: {
          area: {
            type: "string",
            description: "Area name",
          },
          segment: {
            type: "string",
            description: "Property segment",
          },
        },
        required: ["area"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "suggest_optimal_rent",
      description: "Suggest optimal rent price based on market data.",
      parameters: {
        type: "object",
        properties: {
          holdingId: {
            type: "string",
            description: "Holding ID",
          },
          targetVacancy: {
            type: "number",
            description: "Target vacancy rate (days), lower = faster leasing",
          },
        },
        required: ["holdingId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analyze_furnishing_roi",
      description: "Calculate ROI of furnishing an unfurnished property.",
      parameters: {
        type: "object",
        properties: {
          holdingId: {
            type: "string",
            description: "Holding ID",
          },
          furnishingBudget: {
            type: "number",
            description: "Estimated furnishing cost in AED",
          },
        },
        required: ["holdingId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "predict_vacancy",
      description: "Predict expected days to lease for a vacant property.",
      parameters: {
        type: "object",
        properties: {
          holdingId: {
            type: "string",
            description: "Holding ID",
          },
          askingRent: {
            type: "number",
            description: "Proposed asking rent",
          },
        },
        required: ["holdingId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "assess_churn_risk",
      description: "Assess risk of tenant not renewing lease.",
      parameters: {
        type: "object",
        properties: {
          holdingId: {
            type: "string",
            description: "Holding ID",
          },
        },
        required: ["holdingId"],
      },
    },
  },
]

// ============================================
// Market Forecaster Tool Definitions
// ============================================

export const marketForecasterToolDefinitions: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "forecast_prices",
      description: "Generate price forecasts for an area/segment.",
      parameters: {
        type: "object",
        properties: {
          area: {
            type: "string",
            description: "Area name",
          },
          segment: {
            type: "string",
            description: "Property segment",
          },
          timeframes: {
            type: "array",
            items: {
              type: "string",
              enum: ["3_months", "6_months", "12_months"],
            },
            description: "Forecast timeframes",
          },
        },
        required: ["area"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_leading_indicators",
      description: "Get leading market indicators for prediction.",
      parameters: {
        type: "object",
        properties: {
          area: {
            type: "string",
            description: "Area name (optional for city-wide)",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "identify_emerging_hotspots",
      description: "Identify areas showing early signs of price appreciation.",
      parameters: {
        type: "object",
        properties: {
          segment: {
            type: "string",
            description: "Property segment filter",
          },
          minConfidence: {
            type: "number",
            description: "Minimum confidence level (0-100)",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analyze_supply_pipeline",
      description: "Analyze upcoming supply from new projects.",
      parameters: {
        type: "object",
        properties: {
          area: {
            type: "string",
            description: "Area name",
          },
          yearsAhead: {
            type: "number",
            description: "Years to look ahead (default 2)",
          },
        },
        required: ["area"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_scenario_analysis",
      description: "Run bull/base/bear scenario analysis for an area.",
      parameters: {
        type: "object",
        properties: {
          area: {
            type: "string",
            description: "Area name",
          },
          segment: {
            type: "string",
            description: "Property segment",
          },
        },
        required: ["area"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_external_factors",
      description: "Get external factors affecting the market (visa, rates, etc.).",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
]

// ============================================
// Additional Input Types for New Agents
// ============================================

// Valuation Sense-Check
export type CheckValuationInput = {
  propertyId?: string
  askingPrice?: number
}

export type GetPriceCompsInput = {
  area: string
  segment?: string
  limit?: number
}

export type DetectPricingAnomaliesInput = {
  propertyId: string
}

export type SuggestOfferRangeInput = {
  propertyId: string
  investorRiskTolerance?: "low" | "medium" | "high"
}

// Investor Matching
export type MatchPropertyToInvestorsInput = {
  propertyId: string
  limit?: number
}

export type ScoreMandateFitInput = {
  investorId: string
  propertyId: string
}

export type GetInvestorMandatesInput = {
  segment?: string
  minBudget?: number
  areas?: string[]
}

export type FindMandateGapsInput = {
  investorId?: string
}

export type RouteSignalToInvestorsInput = {
  signalId: string
}

// Risk Assessment
export type AssessPropertyRiskInput = {
  propertyId: string
  investorId?: string
}

export type AssessPortfolioConcentrationInput = {
  investorId: string
  includeNewProperty?: string
}

export type GetAreaRiskFactorsInput = {
  area: string
  segment?: string
}

export type StressTestDealInput = {
  propertyId: string
  scenarios?: ("vacancy_spike" | "rent_decline" | "price_correction" | "rate_increase")[]
}

export type GenerateRiskMitigationsInput = {
  propertyId: string
  riskFactors?: string[]
}

// Due Diligence
export type GenerateDDChecklistInput = {
  propertyId: string
  dealType?: "ready" | "off_plan" | "resale"
  complexity?: "standard" | "complex" | "high_value"
}

export type VerifyPropertyDataInput = {
  propertyId: string
}

export type GetDDStatusInput = {
  dealRoomId: string
}

export type FlagDDIssuesInput = {
  dealRoomId: string
}

export type GenerateSellerQuestionsInput = {
  propertyId: string
  focusAreas?: string[]
}

// CMA Analyst
export type GenerateCMAInput = {
  propertyId: string
  compRadius?: "building" | "community" | "area"
  monthsBack?: number
}

export type GetComparableSalesInput = {
  area: string
  segment?: string
  minSize?: number
  maxSize?: number
  monthsBack?: number
  limit?: number
}

export type CalculateAdjustmentsInput = {
  subjectId: string
  compIds: string[]
}

export type GetValuationRangeInput = {
  propertyId: string
  methodology?: "weighted_average" | "median" | "trimmed_mean"
}

// Rental Optimizer
export type AnalyzeRentalPerformanceInput = {
  holdingId: string
}

export type GetEjariBenchmarksInput = {
  area: string
  segment?: string
}

export type SuggestOptimalRentInput = {
  holdingId: string
  targetVacancy?: number
}

export type AnalyzeFurnishingROIInput = {
  holdingId: string
  furnishingBudget?: number
}

export type PredictVacancyInput = {
  holdingId: string
  askingRent?: number
}

export type AssessChurnRiskInput = {
  holdingId: string
}

// Market Forecaster
export type ForecastPricesInput = {
  area: string
  segment?: string
  timeframes?: ("3_months" | "6_months" | "12_months")[]
}

export type GetLeadingIndicatorsInput = {
  area?: string
}

export type IdentifyEmergingHotspotsInput = {
  segment?: string
  minConfidence?: number
}

export type AnalyzeSupplyPipelineInput = {
  area: string
  yearsAhead?: number
}

export type RunScenarioAnalysisInput = {
  area: string
  segment?: string
}

export type GetExternalFactorsInput = Record<string, never>

// ============================================
// Tool Registry
// ============================================

export const AGENT_TOOLS: Record<string, ChatCompletionTool[]> = {
  // Existing agents
  opportunity_finder: opportunityToolDefinitions,
  portfolio_advisor: portfolioToolDefinitions,
  market_intelligence: marketIntelToolDefinitions,
  // New agents
  valuation_sense_check: valuationToolDefinitions,
  investor_matching: investorMatchingToolDefinitions,
  risk_assessment: riskAssessmentToolDefinitions,
  due_diligence: dueDiligenceToolDefinitions,
  cma_analyst: cmaToolDefinitions,
  rental_optimizer: rentalOptimizerToolDefinitions,
  market_forecaster: marketForecasterToolDefinitions,
}
