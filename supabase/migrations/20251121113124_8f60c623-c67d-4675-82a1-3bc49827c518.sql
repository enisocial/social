-- ============================================================================
-- MIGRATION: Fix Security Issues for Hybrid Feed
-- Description: Add search_path and enable RLS on feed_variant_stats
-- ============================================================================

-- Fix search_path for all new functions
CREATE OR REPLACE FUNCTION calculate_recency_decay(post_created_at TIMESTAMPTZ)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  hours_old NUMERIC;
  half_life_hours NUMERIC := 24;
BEGIN
  hours_old := EXTRACT(EPOCH FROM (NOW() - post_created_at)) / 3600;
  RETURN EXP(-0.693147 * hours_old / half_life_hours);
END;
$$;

CREATE OR REPLACE FUNCTION get_content_type_weight(p_media_type TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  RETURN CASE
    WHEN p_media_type = 'video' THEN 1.5
    WHEN p_media_type = 'image' THEN 1.2
    ELSE 1.0
  END;
END;
$$;

CREATE OR REPLACE FUNCTION calculate_ranking_score(
  p_recency_decay NUMERIC,
  p_engagement_score NUMERIC,
  p_affinity_score NUMERIC,
  p_content_type_weight NUMERIC,
  w1 NUMERIC DEFAULT 0.25,
  w2 NUMERIC DEFAULT 0.35,
  w3 NUMERIC DEFAULT 0.30,
  w4 NUMERIC DEFAULT 0.10
)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  RETURN (
    w1 * p_recency_decay +
    w2 * p_engagement_score +
    w3 * p_affinity_score +
    w4 * p_content_type_weight
  );
END;
$$;

CREATE OR REPLACE FUNCTION update_timeline_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Enable RLS on feed_variant_stats
ALTER TABLE feed_variant_stats ENABLE ROW LEVEL SECURITY;

-- RLS policies for feed_variant_stats
CREATE POLICY "Users can view their own stats"
  ON feed_variant_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert stats"
  ON feed_variant_stats FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update stats"
  ON feed_variant_stats FOR UPDATE
  USING (true);