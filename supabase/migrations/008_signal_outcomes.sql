-- Migration: Signal Outcome Tracking
-- Adds fields to track the outcomes of market signals for feedback loop analysis

-- Add outcome tracking columns to market_signal
ALTER TABLE IF EXISTS public.market_signal
  ADD COLUMN IF NOT EXISTS outcome text, -- 'invested', 'passed', 'expired', 'converted', NULL = pending
  ADD COLUMN IF NOT EXISTS outcome_at timestamptz,
  ADD COLUMN IF NOT EXISTS outcome_by uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS outcome_notes text,
  ADD COLUMN IF NOT EXISTS outcome_deal_id uuid, -- reference to deal if converted
  ADD COLUMN IF NOT EXISTS outcome_property_id uuid, -- reference to property if added
  ADD COLUMN IF NOT EXISTS outcome_value numeric, -- actual price paid if invested
  ADD COLUMN IF NOT EXISTS outcome_roi_pct numeric; -- actual ROI if known later

-- Index for outcome analysis
CREATE INDEX IF NOT EXISTS market_signal_outcome_idx ON public.market_signal(outcome) WHERE outcome IS NOT NULL;
CREATE INDEX IF NOT EXISTS market_signal_outcome_at_idx ON public.market_signal(outcome_at) WHERE outcome_at IS NOT NULL;

COMMENT ON COLUMN public.market_signal.outcome IS 'Signal outcome: invested (acted on), passed (declined), expired (no action taken), converted (became a deal)';
COMMENT ON COLUMN public.market_signal.outcome_at IS 'When the outcome was recorded';
COMMENT ON COLUMN public.market_signal.outcome_notes IS 'Optional notes about the outcome';
COMMENT ON COLUMN public.market_signal.outcome_value IS 'Actual price paid if the signal was acted upon';
COMMENT ON COLUMN public.market_signal.outcome_roi_pct IS 'Actual ROI percentage if investment was made and known';

-- Create a view for signal outcome analysis
CREATE OR REPLACE VIEW public.signal_outcome_analysis AS
SELECT
  type,
  source,
  source_type,
  geo_name,
  segment,
  outcome,
  COUNT(*) as signal_count,
  COUNT(*) FILTER (WHERE outcome = 'invested') as invested_count,
  COUNT(*) FILTER (WHERE outcome = 'passed') as passed_count,
  COUNT(*) FILTER (WHERE outcome = 'expired') as expired_count,
  COUNT(*) FILTER (WHERE outcome = 'converted') as converted_count,
  ROUND(AVG(confidence_score)::numeric, 3) as avg_confidence,
  ROUND(AVG(CASE WHEN outcome = 'invested' THEN confidence_score END)::numeric, 3) as avg_confidence_invested,
  ROUND(AVG(CASE WHEN outcome = 'passed' THEN confidence_score END)::numeric, 3) as avg_confidence_passed,
  ROUND(AVG(outcome_roi_pct)::numeric, 2) as avg_roi_pct
FROM public.market_signal
GROUP BY type, source, source_type, geo_name, segment, outcome;

COMMENT ON VIEW public.signal_outcome_analysis IS 'Aggregated analysis of signal outcomes for evaluating detection accuracy';

-- Create a function to calculate signal accuracy metrics
CREATE OR REPLACE FUNCTION public.get_signal_accuracy_metrics(
  p_org_id uuid DEFAULT NULL,
  p_signal_type text DEFAULT NULL,
  p_days_back integer DEFAULT 90
)
RETURNS TABLE (
  signal_type text,
  total_signals bigint,
  with_outcome bigint,
  invested_count bigint,
  passed_count bigint,
  conversion_rate numeric,
  avg_composite_score numeric,
  avg_score_invested numeric,
  avg_score_passed numeric,
  avg_actual_roi numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ms.type as signal_type,
    COUNT(*)::bigint as total_signals,
    COUNT(ms.outcome)::bigint as with_outcome,
    COUNT(*) FILTER (WHERE ms.outcome = 'invested')::bigint as invested_count,
    COUNT(*) FILTER (WHERE ms.outcome = 'passed')::bigint as passed_count,
    CASE 
      WHEN COUNT(ms.outcome) > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE ms.outcome IN ('invested', 'converted'))::numeric / COUNT(ms.outcome)::numeric) * 100, 2)
      ELSE 0
    END as conversion_rate,
    ROUND(AVG((ms.evidence->>'composite_score')::numeric), 1) as avg_composite_score,
    ROUND(AVG(CASE WHEN ms.outcome = 'invested' THEN (ms.evidence->>'composite_score')::numeric END), 1) as avg_score_invested,
    ROUND(AVG(CASE WHEN ms.outcome = 'passed' THEN (ms.evidence->>'composite_score')::numeric END), 1) as avg_score_passed,
    ROUND(AVG(ms.outcome_roi_pct), 2) as avg_actual_roi
  FROM public.market_signal ms
  WHERE 
    (p_org_id IS NULL OR ms.org_id = p_org_id)
    AND (p_signal_type IS NULL OR ms.type = p_signal_type)
    AND ms.created_at >= CURRENT_DATE - (p_days_back || ' days')::interval
  GROUP BY ms.type
  ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.get_signal_accuracy_metrics IS 'Calculate accuracy metrics for signal types to improve detection thresholds';
