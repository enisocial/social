-- ============================================================================
-- MIGRATION: Multi-Signal Friend Suggestions System (Fixed)
-- Description: Advanced friend suggestions with comprehensive scoring
-- ============================================================================

-- Drop existing conflicting function
DROP FUNCTION IF EXISTS get_mutual_friends_count(UUID, UUID);

-- Create table for user interests (for similarity matching)
CREATE TABLE IF NOT EXISTS user_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  interest TEXT NOT NULL,
  weight NUMERIC DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, interest)
);

CREATE INDEX IF NOT EXISTS idx_user_interests_user ON user_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interests_interest ON user_interests(interest);

ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all interests" ON user_interests;
CREATE POLICY "Users can view all interests"
  ON user_interests FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can manage their own interests" ON user_interests;
CREATE POLICY "Users can manage their own interests"
  ON user_interests FOR ALL
  USING (auth.uid() = user_id);

-- Create table for interaction tracking
CREATE TABLE IF NOT EXISTS user_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (user_id != target_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_interactions_user ON user_interactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_interactions_target ON user_interactions(target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_interactions_type ON user_interactions(user_id, interaction_type, created_at DESC);

ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own interactions" ON user_interactions;
CREATE POLICY "Users can view their own interactions"
  ON user_interactions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create interactions" ON user_interactions;
CREATE POLICY "Users can create interactions"
  ON user_interactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Optimize hidden_friend_suggestions table
CREATE INDEX IF NOT EXISTS idx_hidden_suggestions_user_hidden 
  ON hidden_friend_suggestions(user_id, hidden_user_id);

-- Function to calculate mutual friends count
CREATE OR REPLACE FUNCTION get_mutual_friends_count(p_user_id UUID, p_candidate_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  mutual_count INTEGER;
BEGIN
  WITH user_friends AS (
    SELECT CASE 
      WHEN sender_id = p_user_id THEN receiver_id
      ELSE sender_id
    END as friend_id
    FROM friend_requests
    WHERE status = 'accepted'
      AND (sender_id = p_user_id OR receiver_id = p_user_id)
  ),
  candidate_friends AS (
    SELECT CASE 
      WHEN sender_id = p_candidate_id THEN receiver_id
      ELSE sender_id
    END as friend_id
    FROM friend_requests
    WHERE status = 'accepted'
      AND (sender_id = p_candidate_id OR receiver_id = p_candidate_id)
  )
  SELECT COUNT(*)::INTEGER INTO mutual_count
  FROM user_friends uf
  INNER JOIN candidate_friends cf ON uf.friend_id = cf.friend_id;
  
  RETURN mutual_count;
END;
$$;

-- Function to calculate interaction score
CREATE OR REPLACE FUNCTION get_interaction_score(p_user_id UUID, p_candidate_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  interaction_score NUMERIC := 0;
BEGIN
  SELECT COALESCE(SUM(
    CASE interaction_type
      WHEN 'profile_view' THEN 1.0
      WHEN 'post_view' THEN 0.5
      WHEN 'post_like' THEN 2.0
      WHEN 'post_comment' THEN 3.0
      WHEN 'message' THEN 5.0
      ELSE 0.5
    END * EXP(-EXTRACT(EPOCH FROM (NOW() - created_at)) / (7 * 86400))
  ), 0) INTO interaction_score
  FROM user_interactions
  WHERE user_id = p_user_id
    AND target_user_id = p_candidate_id
    AND created_at > NOW() - INTERVAL '30 days';
  
  RETURN 1 / (1 + EXP(-interaction_score / 5));
END;
$$;

-- Function to calculate location proximity score
CREATE OR REPLACE FUNCTION get_location_score(p_user_id UUID, p_candidate_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  user_city TEXT;
  user_region TEXT;
  user_country TEXT;
  candidate_city TEXT;
  candidate_region TEXT;
  candidate_country TEXT;
  score NUMERIC := 0;
BEGIN
  SELECT city, region, country INTO user_city, user_region, user_country
  FROM profiles WHERE id = p_user_id;
  
  SELECT city, region, country INTO candidate_city, candidate_region, candidate_country
  FROM profiles WHERE id = p_candidate_id;
  
  IF user_city IS NOT NULL AND candidate_city IS NOT NULL AND user_city = candidate_city THEN
    score := 1.0;
  ELSIF user_region IS NOT NULL AND candidate_region IS NOT NULL AND user_region = candidate_region THEN
    score := 0.6;
  ELSIF user_country IS NOT NULL AND candidate_country IS NOT NULL AND user_country = candidate_country THEN
    score := 0.3;
  END IF;
  
  RETURN score;
END;
$$;

-- Function to calculate common groups count
CREATE OR REPLACE FUNCTION get_common_groups_count(p_user_id UUID, p_candidate_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  common_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO common_count
  FROM group_members gm1
  INNER JOIN group_members gm2 ON gm1.group_id = gm2.group_id
  WHERE gm1.user_id = p_user_id
    AND gm2.user_id = p_candidate_id;
  
  RETURN common_count;
END;
$$;

-- Function to calculate interest similarity score
CREATE OR REPLACE FUNCTION get_interest_similarity(p_user_id UUID, p_candidate_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  common_interests INTEGER;
  total_interests INTEGER;
  similarity NUMERIC := 0;
BEGIN
  SELECT COUNT(*)::INTEGER INTO common_interests
  FROM user_interests ui1
  INNER JOIN user_interests ui2 ON ui1.interest = ui2.interest
  WHERE ui1.user_id = p_user_id
    AND ui2.user_id = p_candidate_id;
  
  SELECT COUNT(DISTINCT interest)::INTEGER INTO total_interests
  FROM user_interests
  WHERE user_id IN (p_user_id, p_candidate_id);
  
  IF total_interests > 0 THEN
    similarity := common_interests::NUMERIC / total_interests::NUMERIC;
  END IF;
  
  RETURN similarity;
END;
$$;

-- Main function to get advanced friend suggestions
CREATE OR REPLACE FUNCTION get_advanced_friend_suggestions(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  w_mutual_friends NUMERIC DEFAULT 0.30,
  w_interactions NUMERIC DEFAULT 0.20,
  w_location NUMERIC DEFAULT 0.15,
  w_common_groups NUMERIC DEFAULT 0.15,
  w_interests NUMERIC DEFAULT 0.20
)
RETURNS TABLE(
  user_id UUID,
  username TEXT,
  name TEXT,
  avatar_url TEXT,
  bio TEXT,
  city TEXT,
  region TEXT,
  country TEXT,
  mutual_friends_count INTEGER,
  interaction_score NUMERIC,
  location_score NUMERIC,
  common_groups_count INTEGER,
  interest_similarity NUMERIC,
  final_score NUMERIC,
  suggestion_reasons JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH existing_friends AS (
    SELECT CASE 
      WHEN sender_id = p_user_id THEN receiver_id
      ELSE sender_id
    END as friend_id
    FROM friend_requests
    WHERE (sender_id = p_user_id OR receiver_id = p_user_id)
      AND status IN ('accepted', 'pending')
  ),
  hidden_users AS (
    SELECT hidden_user_id
    FROM hidden_friend_suggestions
    WHERE user_id = p_user_id
  ),
  admin_users AS (
    SELECT user_id
    FROM user_roles
    WHERE role IN ('admin', 'moderator')
  ),
  candidates AS (
    SELECT 
      p.id,
      p.username,
      p.name,
      p.avatar_url,
      p.bio,
      p.city,
      p.region,
      p.country,
      get_mutual_friends_count(p_user_id, p.id) as mutual_friends,
      get_interaction_score(p_user_id, p.id) as interactions,
      get_location_score(p_user_id, p.id) as location,
      get_common_groups_count(p_user_id, p.id) as common_groups,
      get_interest_similarity(p_user_id, p.id) as interests
    FROM profiles p
    WHERE p.id != p_user_id
      AND p.id NOT IN (SELECT friend_id FROM existing_friends)
      AND p.id NOT IN (SELECT hidden_user_id FROM hidden_users)
      AND p.id NOT IN (SELECT user_id FROM admin_users)
    LIMIT 500
  ),
  scored_candidates AS (
    SELECT 
      c.*,
      (
        w_mutual_friends * LEAST(c.mutual_friends::NUMERIC / 10.0, 1.0) +
        w_interactions * c.interactions +
        w_location * c.location +
        w_common_groups * LEAST(c.common_groups::NUMERIC / 5.0, 1.0) +
        w_interests * c.interests
      ) as score
    FROM candidates c
    WHERE (
      c.mutual_friends > 0 OR
      c.interactions > 0.1 OR
      c.location > 0 OR
      c.common_groups > 0 OR
      c.interests > 0
    )
  )
  SELECT 
    sc.id,
    sc.username,
    sc.name,
    sc.avatar_url,
    sc.bio,
    sc.city,
    sc.region,
    sc.country,
    sc.mutual_friends,
    sc.interactions,
    sc.location,
    sc.common_groups,
    sc.interests,
    sc.score,
    jsonb_build_object(
      'mutual_friends', sc.mutual_friends > 0,
      'recent_interactions', sc.interactions > 0.1,
      'same_location', sc.location > 0,
      'common_groups', sc.common_groups > 0,
      'shared_interests', sc.interests > 0.1
    ) as reasons
  FROM scored_candidates sc
  WHERE sc.score > 0.05
  ORDER BY sc.score DESC, sc.mutual_friends DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;