-- ============================================================================
-- MIGRATION: Hybrid Feed Algorithm (Facebook-inspired)
-- Description: Timeline items with precomputed ranking scores
-- ============================================================================

-- Create timeline_items table for precomputed feed
CREATE TABLE IF NOT EXISTS timeline_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  
  -- Ranking components
  recency_decay NUMERIC DEFAULT 0,
  engagement_score NUMERIC DEFAULT 0,
  affinity_score NUMERIC DEFAULT 0,
  content_type_weight NUMERIC DEFAULT 1.0,
  ranking_score NUMERIC DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  impression_count INTEGER DEFAULT 0,
  last_seen_at TIMESTAMPTZ,
  
  -- A/B testing
  variant TEXT DEFAULT 'personalized', -- 'personalized' or 'chronological'
  
  UNIQUE(user_id, post_id)
);

-- Enable RLS
ALTER TABLE timeline_items ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own timeline"
  ON timeline_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert timeline items"
  ON timeline_items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update timeline items"
  ON timeline_items FOR UPDATE
  USING (true);

-- Performance indexes
CREATE INDEX idx_timeline_user_ranking ON timeline_items(user_id, ranking_score DESC, created_at DESC);
CREATE INDEX idx_timeline_user_updated ON timeline_items(user_id, updated_at DESC);
CREATE INDEX idx_timeline_post ON timeline_items(post_id);
CREATE INDEX idx_timeline_variant ON timeline_items(user_id, variant, ranking_score DESC);

-- Function to calculate recency decay (exponential decay)
CREATE OR REPLACE FUNCTION calculate_recency_decay(post_created_at TIMESTAMPTZ)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  hours_old NUMERIC;
  half_life_hours NUMERIC := 24; -- Posts lose half relevance after 24h
BEGIN
  hours_old := EXTRACT(EPOCH FROM (NOW() - post_created_at)) / 3600;
  -- Exponential decay: score = e^(-ln(2) * hours / half_life)
  RETURN EXP(-0.693147 * hours_old / half_life_hours);
END;
$$;

-- Function to calculate engagement score from signals
CREATE OR REPLACE FUNCTION calculate_engagement_score(p_post_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  total_score NUMERIC := 0;
BEGIN
  SELECT COALESCE(SUM(
    CASE signal_type
      WHEN 'view' THEN 0.1 * signal_value
      WHEN 'click' THEN 0.5 * signal_value
      WHEN 'like' THEN 2.0 * signal_value
      WHEN 'comment' THEN 5.0 * signal_value
      WHEN 'share' THEN 10.0 * signal_value
      WHEN 'time_spent' THEN 0.1 * signal_value -- signal_value is seconds
      ELSE 0
    END
  ), 0) INTO total_score
  FROM engagement_signals
  WHERE post_id = p_post_id
    AND created_at > NOW() - INTERVAL '7 days'; -- Recent engagement only
  
  -- Normalize to 0-1 range using sigmoid
  RETURN 1 / (1 + EXP(-total_score / 10));
END;
$$;

-- Function to calculate affinity score between users
CREATE OR REPLACE FUNCTION calculate_affinity_score(p_user_id UUID, p_author_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  affinity NUMERIC := 0;
  is_friend BOOLEAN := false;
BEGIN
  -- Check if they're friends (highest affinity)
  SELECT EXISTS (
    SELECT 1 FROM friend_requests
    WHERE status = 'accepted'
      AND ((sender_id = p_user_id AND receiver_id = p_author_id)
        OR (sender_id = p_author_id AND receiver_id = p_user_id))
  ) INTO is_friend;
  
  IF is_friend THEN
    affinity := 1.0;
  ELSE
    -- Check user_affinity table
    SELECT COALESCE(affinity_score, 0) / 100.0 INTO affinity
    FROM user_affinity
    WHERE user_id = p_user_id AND target_user_id = p_author_id;
  END IF;
  
  RETURN COALESCE(affinity, 0);
END;
$$;

-- Function to get content type weight
CREATE OR REPLACE FUNCTION get_content_type_weight(p_media_type TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE
    WHEN p_media_type = 'video' THEN 1.5
    WHEN p_media_type = 'image' THEN 1.2
    ELSE 1.0
  END;
END;
$$;

-- Main function to calculate ranking score
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

-- Function to populate timeline items for a user
CREATE OR REPLACE FUNCTION populate_timeline_for_user(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 100,
  w1 NUMERIC DEFAULT 0.25,
  w2 NUMERIC DEFAULT 0.35,
  w3 NUMERIC DEFAULT 0.30,
  w4 NUMERIC DEFAULT 0.10
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count INTEGER := 0;
  post_record RECORD;
BEGIN
  -- Get user's A/B test variant (random 50/50 split)
  DECLARE
    user_variant TEXT;
  BEGIN
    SELECT CASE WHEN (EXTRACT(EPOCH FROM NOW())::BIGINT + p_user_id::TEXT::BIGINT) % 2 = 0
      THEN 'personalized'
      ELSE 'chronological'
    END INTO user_variant;
  END;
  
  -- Get relevant posts
  FOR post_record IN (
    SELECT 
      p.id as post_id,
      p.created_at,
      p.user_id as author_id,
      p.media_type,
      calculate_recency_decay(p.created_at) as recency,
      calculate_engagement_score(p.id) as engagement,
      calculate_affinity_score(p_user_id, p.user_id) as affinity,
      get_content_type_weight(p.media_type) as content_weight
    FROM posts p
    WHERE 
      -- Public posts or friend posts
      (p.privacy = 'public' OR 
       (p.privacy = 'friends' AND EXISTS(
         SELECT 1 FROM friend_requests fr
         WHERE fr.status = 'accepted'
           AND ((fr.sender_id = p_user_id AND fr.receiver_id = p.user_id)
             OR (fr.sender_id = p.user_id AND fr.receiver_id = p_user_id))
       )))
      -- Recent posts only (last 7 days)
      AND p.created_at > NOW() - INTERVAL '7 days'
      -- Not already in timeline
      AND NOT EXISTS (
        SELECT 1 FROM timeline_items ti
        WHERE ti.user_id = p_user_id AND ti.post_id = p.id
      )
    ORDER BY p.created_at DESC
    LIMIT p_limit
  )
  LOOP
    -- Calculate final ranking score
    DECLARE
      final_score NUMERIC;
    BEGIN
      final_score := calculate_ranking_score(
        post_record.recency,
        post_record.engagement,
        post_record.affinity,
        post_record.content_weight,
        w1, w2, w3, w4
      );
      
      -- Insert into timeline
      INSERT INTO timeline_items (
        user_id,
        post_id,
        recency_decay,
        engagement_score,
        affinity_score,
        content_type_weight,
        ranking_score,
        variant
      ) VALUES (
        p_user_id,
        post_record.post_id,
        post_record.recency,
        post_record.engagement,
        post_record.affinity,
        post_record.content_weight,
        final_score,
        user_variant
      )
      ON CONFLICT (user_id, post_id) DO UPDATE SET
        recency_decay = EXCLUDED.recency_decay,
        engagement_score = EXCLUDED.engagement_score,
        affinity_score = EXCLUDED.affinity_score,
        content_type_weight = EXCLUDED.content_type_weight,
        ranking_score = EXCLUDED.ranking_score,
        updated_at = NOW();
      
      inserted_count := inserted_count + 1;
    END;
  END LOOP;
  
  RETURN inserted_count;
END;
$$;

-- Function to get personalized feed from timeline
CREATE OR REPLACE FUNCTION get_personalized_timeline(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  content TEXT,
  media_url TEXT,
  media_type TEXT,
  privacy TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  user_id UUID,
  username TEXT,
  name TEXT,
  avatar_url TEXT,
  likes_count BIGINT,
  comments_count BIGINT,
  shares_count BIGINT,
  views_count BIGINT,
  user_liked BOOLEAN,
  ranking_score NUMERIC,
  variant TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.content,
    p.media_url,
    p.media_type::TEXT,
    p.privacy::TEXT,
    p.created_at,
    p.updated_at,
    p.user_id,
    prof.username,
    prof.name,
    prof.avatar_url,
    COALESCE(COUNT(DISTINCT l.id), 0) as likes_count,
    COALESCE(COUNT(DISTINCT c.id), 0) as comments_count,
    COALESCE(COUNT(DISTINCT ps.id), 0) as shares_count,
    COALESCE(COUNT(DISTINCT pv.id), 0) as views_count,
    EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND likes.user_id = p_user_id) as user_liked,
    ti.ranking_score,
    ti.variant
  FROM timeline_items ti
  INNER JOIN posts p ON p.id = ti.post_id
  INNER JOIN profiles prof ON prof.id = p.user_id
  LEFT JOIN likes l ON p.id = l.post_id
  LEFT JOIN comments c ON p.id = c.post_id
  LEFT JOIN post_shares ps ON p.id = ps.post_id
  LEFT JOIN post_views pv ON p.id = pv.post_id
  WHERE ti.user_id = p_user_id
  GROUP BY p.id, prof.username, prof.name, prof.avatar_url, ti.ranking_score, ti.variant, ti.created_at
  ORDER BY 
    CASE 
      WHEN ti.variant = 'personalized' THEN ti.ranking_score
      ELSE 0
    END DESC,
    CASE
      WHEN ti.variant = 'chronological' THEN ti.created_at
      ELSE NULL
    END DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_timeline_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER timeline_items_updated_at
  BEFORE UPDATE ON timeline_items
  FOR EACH ROW
  EXECUTE FUNCTION update_timeline_updated_at();

-- Create stats table for A/B testing
CREATE TABLE IF NOT EXISTS feed_variant_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  variant TEXT NOT NULL,
  session_date DATE DEFAULT CURRENT_DATE,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  time_spent_seconds INTEGER DEFAULT 0,
  engagement_actions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, variant, session_date)
);

CREATE INDEX idx_feed_stats_user_date ON feed_variant_stats(user_id, session_date DESC);
CREATE INDEX idx_feed_stats_variant ON feed_variant_stats(variant, session_date DESC);