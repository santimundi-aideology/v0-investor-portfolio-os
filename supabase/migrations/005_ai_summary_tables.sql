-- Migration: AI Summary Tables for Cost-Controlled Context Loading
-- These tables provide pre-aggregated data for AI context, preventing
-- expensive queries on raw data tables.

-- -----------------------------
-- AI MARKET SUMMARY
-- -----------------------------
-- Pre-computed market metrics per geo/segment for AI context
-- Updated daily after signal pipeline runs

CREATE TABLE IF NOT EXISTS public.ai_market_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  geo_id text NOT NULL,
  geo_name text NOT NULL,
  segment text NOT NULL,
  as_of_date date NOT NULL,
  
  -- Pre-computed metrics from snapshots
  median_asking_price numeric,           -- From portal listings
  median_dld_price numeric,              -- From DLD transactions (truth)
  median_price_per_sqft numeric,         -- DLD price per sqft
  price_vs_truth_pct numeric,            -- (asking - dld) / dld
  
  -- Inventory metrics
  active_listings_count integer DEFAULT 0,
  avg_days_on_market numeric,
  price_cut_rate_pct numeric,            -- % of listings with price cuts
  stale_listings_count integer DEFAULT 0,
  
  -- Rental metrics
  median_rent_annual numeric,
  gross_yield_pct numeric,               -- rent / price
  
  -- Trend indicators (derived from comparing periods)
  price_trend text CHECK (price_trend IN ('rising', 'stable', 'falling')),
  supply_trend text CHECK (supply_trend IN ('increasing', 'stable', 'decreasing')),
  rent_trend text CHECK (rent_trend IN ('rising', 'stable', 'falling')),
  
  -- For AI natural language generation
  summary_text text,                     -- Pre-generated summary paragraph
  
  -- Metadata
  sample_size_sales integer,             -- Number of DLD transactions
  sample_size_rentals integer,           -- Number of Ejari contracts
  sample_size_listings integer,          -- Number of portal listings
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE (org_id, geo_id, segment, as_of_date)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS ai_market_summary_org_idx 
  ON public.ai_market_summary(org_id);
CREATE INDEX IF NOT EXISTS ai_market_summary_date_idx 
  ON public.ai_market_summary(as_of_date DESC);
CREATE INDEX IF NOT EXISTS ai_market_summary_geo_idx 
  ON public.ai_market_summary(geo_id);
CREATE INDEX IF NOT EXISTS ai_market_summary_org_date_idx 
  ON public.ai_market_summary(org_id, as_of_date DESC);

-- -----------------------------
-- AI INVESTOR SUMMARY
-- -----------------------------
-- Pre-computed investor context for AI
-- Updated on mandate changes and daily refresh

CREATE TABLE IF NOT EXISTS public.ai_investor_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  investor_id uuid NOT NULL REFERENCES public.investors(id) ON DELETE CASCADE,
  
  -- Basic info
  name text,
  email text,
  
  -- Mandate summary (pre-formatted for AI)
  mandate_summary text,                  -- "Looking for 2BR in Marina/JVC, 6%+ yield, AED 1-2M"
  preferred_geos text[],                 -- ['dubai-marina', 'jvc', 'business-bay']
  preferred_segments text[],             -- ['2BR', '3BR']
  yield_target numeric,                  -- 0.06 = 6%
  budget_min numeric,
  budget_max numeric,
  budget_range text,                     -- "AED 1M - 2M" (formatted)
  risk_tolerance text,                   -- 'low' | 'medium' | 'high'
  
  -- Portfolio summary (pre-formatted for AI)
  portfolio_summary text,                -- "Owns 3 properties worth AED 5.2M, avg yield 5.8%"
  holdings_count integer DEFAULT 0,
  portfolio_value numeric DEFAULT 0,
  avg_yield numeric,
  avg_occupancy numeric,
  
  -- Activity metrics
  active_signals_count integer DEFAULT 0,
  recommended_properties_count integer DEFAULT 0,
  pending_approvals_count integer DEFAULT 0,
  
  -- Top holdings (for AI context, limited to 5)
  top_holdings_json jsonb,               -- [{id, name, value, yield}]
  
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE (org_id, investor_id)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS ai_investor_summary_org_idx 
  ON public.ai_investor_summary(org_id);
CREATE INDEX IF NOT EXISTS ai_investor_summary_investor_idx 
  ON public.ai_investor_summary(investor_id);

-- -----------------------------
-- GEO REFERENCE TABLE
-- -----------------------------
-- Canonical geographic reference for normalizing area names
-- from different sources (DLD, Ejari, Bayut, PropertyFinder)

CREATE TABLE IF NOT EXISTS public.geo_reference (
  id text PRIMARY KEY,                   -- Canonical ID: 'dubai-marina'
  geo_type text NOT NULL CHECK (geo_type IN ('city', 'district', 'community', 'sub-community')),
  canonical_name text NOT NULL,          -- 'Dubai Marina'
  parent_id text REFERENCES public.geo_reference(id),
  
  -- Aliases from different sources
  aliases text[] NOT NULL DEFAULT '{}',  -- ['Marina', 'DXB Marina', 'DUBAI MARINA']
  
  -- DLD-specific mapping
  dld_area_code text,
  dld_area_name text,
  
  -- Portal-specific mappings
  bayut_location_id text,
  propertyfinder_location_id text,
  
  -- Geographic data
  latitude numeric,
  longitude numeric,
  
  -- Metadata
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for alias lookups (using GIN for array containment)
CREATE INDEX IF NOT EXISTS geo_reference_aliases_idx 
  ON public.geo_reference USING GIN (aliases);
CREATE INDEX IF NOT EXISTS geo_reference_parent_idx 
  ON public.geo_reference(parent_id);
CREATE INDEX IF NOT EXISTS geo_reference_type_idx 
  ON public.geo_reference(geo_type);

-- -----------------------------
-- HELPER FUNCTIONS
-- -----------------------------

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_ai_market_summary_updated_at ON public.ai_market_summary;
CREATE TRIGGER update_ai_market_summary_updated_at
  BEFORE UPDATE ON public.ai_market_summary
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ai_investor_summary_updated_at ON public.ai_investor_summary;
CREATE TRIGGER update_ai_investor_summary_updated_at
  BEFORE UPDATE ON public.ai_investor_summary
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_geo_reference_updated_at ON public.geo_reference;
CREATE TRIGGER update_geo_reference_updated_at
  BEFORE UPDATE ON public.geo_reference
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------
-- SEED DATA: Dubai Communities
-- -----------------------------
-- Initial set of Dubai communities for geo normalization

INSERT INTO public.geo_reference (id, geo_type, canonical_name, parent_id, aliases, dld_area_name)
VALUES
  -- City level
  ('dubai', 'city', 'Dubai', NULL, ARRAY['Dubai', 'DXB', 'دبي'], 'DUBAI'),
  
  -- Major districts/areas
  ('dubai-marina', 'community', 'Dubai Marina', 'dubai', 
   ARRAY['Dubai Marina', 'Marina', 'DUBAI MARINA', 'D Marina'], 'DUBAI MARINA'),
  ('downtown-dubai', 'community', 'Downtown Dubai', 'dubai',
   ARRAY['Downtown Dubai', 'Downtown', 'DOWNTOWN DUBAI', 'DT Dubai'], 'DOWNTOWN DUBAI'),
  ('business-bay', 'community', 'Business Bay', 'dubai',
   ARRAY['Business Bay', 'BB', 'BUSINESS BAY', 'Biz Bay'], 'BUSINESS BAY'),
  ('jvc', 'community', 'Jumeirah Village Circle', 'dubai',
   ARRAY['Jumeirah Village Circle', 'JVC', 'JUMEIRAH VILLAGE CIRCLE'], 'JUMEIRAH VILLAGE CIRCLE'),
  ('jvt', 'community', 'Jumeirah Village Triangle', 'dubai',
   ARRAY['Jumeirah Village Triangle', 'JVT', 'JUMEIRAH VILLAGE TRIANGLE'], 'JUMEIRAH VILLAGE TRIANGLE'),
  ('jlt', 'community', 'Jumeirah Lakes Towers', 'dubai',
   ARRAY['Jumeirah Lakes Towers', 'JLT', 'JUMEIRAH LAKES TOWERS'], 'JUMEIRAH LAKES TOWERS'),
  ('palm-jumeirah', 'community', 'Palm Jumeirah', 'dubai',
   ARRAY['Palm Jumeirah', 'The Palm', 'PALM JUMEIRAH', 'Palm'], 'PALM JUMEIRAH'),
  ('dubai-hills', 'community', 'Dubai Hills Estate', 'dubai',
   ARRAY['Dubai Hills Estate', 'Dubai Hills', 'DHE', 'DUBAI HILLS ESTATE'], 'DUBAI HILLS ESTATE'),
  ('emirates-hills', 'community', 'Emirates Hills', 'dubai',
   ARRAY['Emirates Hills', 'EH', 'EMIRATES HILLS'], 'EMIRATES HILLS'),
  ('arabian-ranches', 'community', 'Arabian Ranches', 'dubai',
   ARRAY['Arabian Ranches', 'AR', 'ARABIAN RANCHES', 'Ranches'], 'ARABIAN RANCHES'),
  ('arabian-ranches-2', 'community', 'Arabian Ranches 2', 'dubai',
   ARRAY['Arabian Ranches 2', 'AR2', 'ARABIAN RANCHES 2', 'Ranches 2'], 'ARABIAN RANCHES 2'),
  ('damac-hills', 'community', 'DAMAC Hills', 'dubai',
   ARRAY['DAMAC Hills', 'Damac Hills', 'DAMAC HILLS', 'Akoya'], 'DAMAC HILLS'),
  ('damac-hills-2', 'community', 'DAMAC Hills 2', 'dubai',
   ARRAY['DAMAC Hills 2', 'Damac Hills 2', 'DAMAC HILLS 2', 'Akoya Oxygen'], 'DAMAC HILLS 2'),
  ('dubai-south', 'community', 'Dubai South', 'dubai',
   ARRAY['Dubai South', 'DUBAI SOUTH', 'Dubai World Central', 'DWC'], 'DUBAI SOUTH'),
  ('sports-city', 'community', 'Dubai Sports City', 'dubai',
   ARRAY['Dubai Sports City', 'Sports City', 'DSC', 'DUBAI SPORTS CITY'], 'DUBAI SPORTS CITY'),
  ('motor-city', 'community', 'Motor City', 'dubai',
   ARRAY['Motor City', 'MOTOR CITY', 'Dubai Motor City'], 'MOTOR CITY'),
  ('silicon-oasis', 'community', 'Dubai Silicon Oasis', 'dubai',
   ARRAY['Dubai Silicon Oasis', 'DSO', 'Silicon Oasis', 'DUBAI SILICON OASIS'], 'DUBAI SILICON OASIS'),
  ('international-city', 'community', 'International City', 'dubai',
   ARRAY['International City', 'IC', 'INTERNATIONAL CITY'], 'INTERNATIONAL CITY'),
  ('discovery-gardens', 'community', 'Discovery Gardens', 'dubai',
   ARRAY['Discovery Gardens', 'DG', 'DISCOVERY GARDENS'], 'DISCOVERY GARDENS'),
  ('al-barsha', 'community', 'Al Barsha', 'dubai',
   ARRAY['Al Barsha', 'Barsha', 'AL BARSHA'], 'AL BARSHA'),
  ('tecom', 'community', 'TECOM', 'dubai',
   ARRAY['TECOM', 'Tecom', 'Dubai Internet City', 'DIC', 'Dubai Media City', 'DMC'], 'TECOM'),
  ('difc', 'community', 'DIFC', 'dubai',
   ARRAY['DIFC', 'Dubai International Financial Centre', 'Financial Centre'], 'DIFC'),
  ('city-walk', 'community', 'City Walk', 'dubai',
   ARRAY['City Walk', 'CITY WALK', 'Citywalk'], 'CITY WALK'),
  ('jumeirah', 'community', 'Jumeirah', 'dubai',
   ARRAY['Jumeirah', 'JUMEIRAH', 'Jumeira'], 'JUMEIRAH'),
  ('umm-suqeim', 'community', 'Umm Suqeim', 'dubai',
   ARRAY['Umm Suqeim', 'UMM SUQEIM', 'Umm Sequim'], 'UMM SUQEIM'),
  ('al-quoz', 'community', 'Al Quoz', 'dubai',
   ARRAY['Al Quoz', 'AL QUOZ', 'Quoz'], 'AL QUOZ'),
  ('meydan', 'community', 'Meydan', 'dubai',
   ARRAY['Meydan', 'MEYDAN', 'Meydan City'], 'MEYDAN'),
  ('creek-harbour', 'community', 'Dubai Creek Harbour', 'dubai',
   ARRAY['Dubai Creek Harbour', 'Creek Harbour', 'DCH', 'DUBAI CREEK HARBOUR'], 'DUBAI CREEK HARBOUR'),
  ('sobha-hartland', 'community', 'Sobha Hartland', 'dubai',
   ARRAY['Sobha Hartland', 'SOBHA HARTLAND', 'Hartland'], 'SOBHA HARTLAND'),
  ('town-square', 'community', 'Town Square', 'dubai',
   ARRAY['Town Square', 'TOWN SQUARE', 'Nshama Town Square'], 'TOWN SQUARE'),
  ('mudon', 'community', 'Mudon', 'dubai',
   ARRAY['Mudon', 'MUDON', 'Mudon Villas'], 'MUDON'),
  ('remraam', 'community', 'Remraam', 'dubai',
   ARRAY['Remraam', 'REMRAAM', 'Al Ramth'], 'REMRAAM'),
  ('the-greens', 'community', 'The Greens', 'dubai',
   ARRAY['The Greens', 'Greens', 'THE GREENS'], 'THE GREENS'),
  ('the-views', 'community', 'The Views', 'dubai',
   ARRAY['The Views', 'Views', 'THE VIEWS'], 'THE VIEWS'),
  ('dubai-production-city', 'community', 'Dubai Production City', 'dubai',
   ARRAY['Dubai Production City', 'IMPZ', 'DPC', 'DUBAI PRODUCTION CITY'], 'DUBAI PRODUCTION CITY'),
  ('al-furjan', 'community', 'Al Furjan', 'dubai',
   ARRAY['Al Furjan', 'Furjan', 'AL FURJAN'], 'AL FURJAN'),
  ('jumeirah-golf-estates', 'community', 'Jumeirah Golf Estates', 'dubai',
   ARRAY['Jumeirah Golf Estates', 'JGE', 'JUMEIRAH GOLF ESTATES'], 'JUMEIRAH GOLF ESTATES'),
  ('tilal-al-ghaf', 'community', 'Tilal Al Ghaf', 'dubai',
   ARRAY['Tilal Al Ghaf', 'TAG', 'TILAL AL GHAF'], 'TILAL AL GHAF'),
  ('bluewaters', 'community', 'Bluewaters Island', 'dubai',
   ARRAY['Bluewaters Island', 'Bluewaters', 'BLUEWATERS ISLAND', 'Blue Waters'], 'BLUEWATERS ISLAND'),
  ('la-mer', 'community', 'La Mer', 'dubai',
   ARRAY['La Mer', 'LA MER', 'Lamer'], 'LA MER'),
  ('port-de-la-mer', 'community', 'Port De La Mer', 'dubai',
   ARRAY['Port De La Mer', 'PORT DE LA MER', 'Port de La Mer'], 'PORT DE LA MER'),
  ('madinat-jumeirah-living', 'community', 'Madinat Jumeirah Living', 'dubai',
   ARRAY['Madinat Jumeirah Living', 'MJL', 'MADINAT JUMEIRAH LIVING'], 'MADINAT JUMEIRAH LIVING')
ON CONFLICT (id) DO UPDATE SET
  aliases = EXCLUDED.aliases,
  updated_at = now();

