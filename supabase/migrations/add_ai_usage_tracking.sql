-- Migration: Add AI usage tracking tables
-- Tracks token usage and costs for monitoring and budget enforcement

-- Create the ai_usage_log table for detailed usage tracking
CREATE TABLE IF NOT EXISTS ai_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID,
    
    -- Usage details
    usage_type TEXT NOT NULL CHECK (usage_type IN ('scoring', 'news', 'chat', 'tools', 'memo', 'other')),
    model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
    cost_usd DECIMAL(10, 6) NOT NULL DEFAULT 0,
    
    -- Context
    agent_id TEXT,
    tool_name TEXT,
    endpoint TEXT,
    
    -- Request metadata
    request_id TEXT,
    duration_ms INTEGER,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_ai_usage_org_date 
ON ai_usage_log(org_id, created_at);

CREATE INDEX IF NOT EXISTS idx_ai_usage_type_date 
ON ai_usage_log(usage_type, created_at);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date 
ON ai_usage_log(user_id, created_at);

-- Create daily summary table for aggregated stats
CREATE TABLE IF NOT EXISTS ai_usage_daily_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Token usage by type
    scoring_tokens INTEGER DEFAULT 0,
    news_tokens INTEGER DEFAULT 0,
    chat_tokens INTEGER DEFAULT 0,
    tools_tokens INTEGER DEFAULT 0,
    other_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    
    -- Request counts
    scoring_requests INTEGER DEFAULT 0,
    news_requests INTEGER DEFAULT 0,
    chat_requests INTEGER DEFAULT 0,
    tools_requests INTEGER DEFAULT 0,
    total_requests INTEGER DEFAULT 0,
    
    -- Costs
    total_cost_usd DECIMAL(10, 4) DEFAULT 0,
    
    -- Error tracking
    failed_requests INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Unique per org per day
    CONSTRAINT unique_org_date UNIQUE (org_id, date)
);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_ai_usage_summary_date 
ON ai_usage_daily_summary(date);

CREATE INDEX IF NOT EXISTS idx_ai_usage_summary_org_date 
ON ai_usage_daily_summary(org_id, date);

-- Add RLS policies
ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_daily_summary ENABLE ROW LEVEL SECURITY;

-- Read access for own org's data
CREATE POLICY "Allow read access to own org usage log"
    ON ai_usage_log
    FOR SELECT
    USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

CREATE POLICY "Allow read access to own org usage summary"
    ON ai_usage_daily_summary
    FOR SELECT
    USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

-- Allow service role to insert usage
CREATE POLICY "Allow service role to insert usage log"
    ON ai_usage_log
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow service role to update usage summary"
    ON ai_usage_daily_summary
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Function to aggregate daily usage (can be called by a cron job)
CREATE OR REPLACE FUNCTION aggregate_daily_ai_usage()
RETURNS void AS $$
BEGIN
    INSERT INTO ai_usage_daily_summary (
        org_id,
        date,
        scoring_tokens,
        news_tokens,
        chat_tokens,
        tools_tokens,
        other_tokens,
        total_tokens,
        scoring_requests,
        news_requests,
        chat_requests,
        tools_requests,
        total_requests,
        total_cost_usd,
        failed_requests
    )
    SELECT 
        org_id,
        DATE(created_at) as date,
        COALESCE(SUM(CASE WHEN usage_type = 'scoring' THEN total_tokens ELSE 0 END), 0) as scoring_tokens,
        COALESCE(SUM(CASE WHEN usage_type = 'news' THEN total_tokens ELSE 0 END), 0) as news_tokens,
        COALESCE(SUM(CASE WHEN usage_type = 'chat' THEN total_tokens ELSE 0 END), 0) as chat_tokens,
        COALESCE(SUM(CASE WHEN usage_type = 'tools' THEN total_tokens ELSE 0 END), 0) as tools_tokens,
        COALESCE(SUM(CASE WHEN usage_type NOT IN ('scoring', 'news', 'chat', 'tools') THEN total_tokens ELSE 0 END), 0) as other_tokens,
        COALESCE(SUM(total_tokens), 0) as total_tokens,
        COUNT(*) FILTER (WHERE usage_type = 'scoring') as scoring_requests,
        COUNT(*) FILTER (WHERE usage_type = 'news') as news_requests,
        COUNT(*) FILTER (WHERE usage_type = 'chat') as chat_requests,
        COUNT(*) FILTER (WHERE usage_type = 'tools') as tools_requests,
        COUNT(*) as total_requests,
        COALESCE(SUM(cost_usd), 0) as total_cost_usd,
        COUNT(*) FILTER (WHERE success = false) as failed_requests
    FROM ai_usage_log
    WHERE DATE(created_at) = CURRENT_DATE - INTERVAL '1 day'
    GROUP BY org_id, DATE(created_at)
    ON CONFLICT (org_id, date) DO UPDATE SET
        scoring_tokens = EXCLUDED.scoring_tokens,
        news_tokens = EXCLUDED.news_tokens,
        chat_tokens = EXCLUDED.chat_tokens,
        tools_tokens = EXCLUDED.tools_tokens,
        other_tokens = EXCLUDED.other_tokens,
        total_tokens = EXCLUDED.total_tokens,
        scoring_requests = EXCLUDED.scoring_requests,
        news_requests = EXCLUDED.news_requests,
        chat_requests = EXCLUDED.chat_requests,
        tools_requests = EXCLUDED.tools_requests,
        total_requests = EXCLUDED.total_requests,
        total_cost_usd = EXCLUDED.total_cost_usd,
        failed_requests = EXCLUDED.failed_requests,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE ai_usage_log IS 'Detailed log of all AI API usage for cost tracking and monitoring';
COMMENT ON TABLE ai_usage_daily_summary IS 'Daily aggregated AI usage statistics per organization';
COMMENT ON FUNCTION aggregate_daily_ai_usage IS 'Aggregates daily AI usage from log into summary table';
