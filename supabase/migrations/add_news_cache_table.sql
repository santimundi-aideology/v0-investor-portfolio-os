-- Migration: Add area_news_cache table for caching AI-fetched news
-- This table stores compressed news context for each area to reduce API calls

-- Create the area_news_cache table
CREATE TABLE IF NOT EXISTS area_news_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    area TEXT NOT NULL,
    
    -- News data
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    market_sentiment TEXT CHECK (market_sentiment IN ('bullish', 'neutral', 'bearish')),
    key_developments JSONB DEFAULT '[]'::jsonb,
    risks JSONB DEFAULT '[]'::jsonb,
    opportunities JSONB DEFAULT '[]'::jsonb,
    news_items JSONB DEFAULT '[]'::jsonb,
    summary_text TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Unique constraint per org + area
    CONSTRAINT unique_org_area UNIQUE (org_id, area)
);

-- Create index for lookups
CREATE INDEX IF NOT EXISTS idx_news_cache_org_area 
ON area_news_cache(org_id, area);

-- Create index for expiry cleanup
CREATE INDEX IF NOT EXISTS idx_news_cache_expires 
ON area_news_cache(expires_at);

-- Create index for area lookups when org_id is null
CREATE UNIQUE INDEX IF NOT EXISTS idx_news_cache_area_global 
ON area_news_cache(area) WHERE org_id IS NULL;

-- Add RLS policies
ALTER TABLE area_news_cache ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users (can read all, can write own org's data)
CREATE POLICY "Allow read access to news cache"
    ON area_news_cache
    FOR SELECT
    USING (true);

CREATE POLICY "Allow insert/update for own org"
    ON area_news_cache
    FOR ALL
    USING (org_id = auth.jwt() ->> 'org_id' OR org_id IS NULL)
    WITH CHECK (org_id = auth.jwt() ->> 'org_id' OR org_id IS NULL);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_news_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_news_cache_updated_at
    BEFORE UPDATE ON area_news_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_news_cache_updated_at();

-- Comment on table
COMMENT ON TABLE area_news_cache IS 'Cache for AI-fetched area news to reduce API costs. Entries expire after 24 hours.';
