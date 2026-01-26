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
// Tool Registry
// ============================================

export const AGENT_TOOLS: Record<string, ChatCompletionTool[]> = {
  opportunity_finder: opportunityToolDefinitions,
  portfolio_advisor: portfolioToolDefinitions,
  market_intelligence: marketIntelToolDefinitions,
}
