-- ============================================
-- FIX SECURITY WARNINGS FROM PREVIOUS MIGRATION
-- ============================================

-- 1. ADD SEARCH_PATH TO ALL SECURITY DEFINER FUNCTIONS
-- ============================================

-- Fix refresh_mutual_friends_cache
CREATE OR REPLACE FUNCTION refresh_mutual_friends_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mutual_friends_cache;
END;
$$;

-- Fix trigger_refresh_mutual_friends
CREATE OR REPLACE FUNCTION trigger_refresh_mutual_friends()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    PERFORM refresh_mutual_friends_cache();
  END IF;
  RETURN NEW;
END;
$$;

-- Fix get_online_friends_optimized
DROP FUNCTION IF EXISTS get_online_friends_optimized(UUID);

CREATE FUNCTION get_online_friends_optimized(user_id_param UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  username TEXT,
  avatar_url TEXT,
  online BOOLEAN,
  last_seen TIMESTAMPTZ,
  unread_count INTEGER,
  conversation_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- First, clean up any stale presence records to ensure accuracy
  PERFORM cleanup_stale_presence();

  RETURN QUERY
  WITH user_friends AS (
    SELECT DISTINCT
      CASE
        WHEN fr.sender_id = user_id_param THEN fr.receiver_id
        ELSE fr.sender_id
      END as friend_id
    FROM friend_requests fr
    WHERE (fr.sender_id = user_id_param OR fr.receiver_id = user_id_param)
      AND fr.status = 'accepted'
  ),
  friend_conversations AS (
    SELECT
      cp1.user_id as friend_id,
      cp1.conversation_id,
      cp1.unread_count
    FROM conversation_participants cp1
    INNER JOIN conversation_participants cp2
      ON cp1.conversation_id = cp2.conversation_id
    WHERE cp2.user_id = user_id_param
      AND cp1.user_id != user_id_param
  )
  SELECT
    p.id,
    p.name,
    p.username,
    p.avatar_url,
    COALESCE(up.is_online, false) as online,  -- Use is_online column explicitly
    up.last_seen,
    COALESCE(fc.unread_count, 0)::INTEGER as unread_count,
    fc.conversation_id
  FROM user_friends uf
  INNER JOIN profiles p ON p.id = uf.friend_id
  LEFT JOIN user_presence up ON up.user_id = p.id
  LEFT JOIN friend_conversations fc ON fc.friend_id = p.id
  LEFT JOIN user_roles ur ON ur.user_id = p.id
  WHERE ur.role IS NULL OR ur.role NOT IN ('admin', 'moderator')
  ORDER BY
    COALESCE(up.is_online, false) DESC,
    up.last_seen DESC NULLS LAST;
END;
$$;

-- Fix get_batch_friend_suggestions
CREATE OR REPLACE FUNCTION get_batch_friend_suggestions(
  user_id_param UUID,
  limit_param INTEGER DEFAULT 20,
  offset_param INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  username TEXT,
  name TEXT,
  avatar_url TEXT,
  bio TEXT,
  city TEXT,
  region TEXT,
  country TEXT,
  mutual_friends_count INTEGER,
  same_location BOOLEAN,
  is_new_user BOOLEAN,
  interaction_score NUMERIC,
  suggestion_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_city TEXT;
  user_region TEXT;
  user_country TEXT;
BEGIN
  -- Get user's location once
  SELECT p.city, p.region, p.country
  INTO user_city, user_region, user_country
  FROM profiles p
  WHERE p.id = user_id_param;

  RETURN QUERY
  WITH user_friends AS (
    SELECT DISTINCT
      CASE 
        WHEN fr.sender_id = user_id_param THEN fr.receiver_id
        ELSE fr.sender_id
      END as friend_id
    FROM friend_requests fr
    WHERE (fr.sender_id = user_id_param OR fr.receiver_id = user_id_param)
      AND fr.status = 'accepted'
  ),
  hidden_users AS (
    SELECT hidden_user_id
    FROM hidden_friend_suggestions
    WHERE user_id = user_id_param
  ),
  mutual_friends_data AS (
    SELECT 
      CASE 
        WHEN mfc.user1_id = user_id_param THEN mfc.user2_id
        WHEN mfc.user2_id = user_id_param THEN mfc.user1_id
        ELSE NULL
      END as candidate_id,
      mfc.mutual_count::INTEGER
    FROM mutual_friends_cache mfc
    WHERE user_id_param IN (mfc.user1_id, mfc.user2_id)
  ),
  interaction_scores AS (
    SELECT 
      ui.target_user_id as candidate_id,
      SUM(
        CASE ui.interaction_type
          WHEN 'like' THEN 1
          WHEN 'comment' THEN 2
          WHEN 'share' THEN 3
          WHEN 'profile_view' THEN 0.5
          ELSE 0
        END
      ) as score
    FROM user_interactions ui
    WHERE ui.user_id = user_id_param
      AND ui.created_at > NOW() - INTERVAL '30 days'
    GROUP BY ui.target_user_id
  )
  SELECT 
    p.id,
    p.username,
    p.name,
    p.avatar_url,
    p.bio,
    p.city,
    p.region,
    p.country,
    COALESCE(mfd.mutual_count, 0) as mutual_friends_count,
    (p.city = user_city OR p.region = user_region OR p.country = user_country) as same_location,
    (p.created_at > NOW() - INTERVAL '7 days') as is_new_user,
    COALESCE(isc.score, 0) as interaction_score,
    (
      COALESCE(mfd.mutual_count, 0) * 3.0 +
      COALESCE(isc.score, 0) * 2.0 +
      CASE WHEN p.city = user_city THEN 5.0
           WHEN p.region = user_region THEN 3.0
           WHEN p.country = user_country THEN 1.0
           ELSE 0
      END +
      CASE WHEN p.created_at > NOW() - INTERVAL '7 days' THEN 2.0 ELSE 0 END
    ) as suggestion_score
  FROM profiles p
  LEFT JOIN mutual_friends_data mfd ON mfd.candidate_id = p.id
  LEFT JOIN interaction_scores isc ON isc.candidate_id = p.id
  WHERE p.id != user_id_param
    AND p.id NOT IN (SELECT friend_id FROM user_friends)
    AND p.id NOT IN (SELECT hidden_user_id FROM hidden_users)
    AND NOT EXISTS (
      SELECT 1 FROM friend_requests fr
      WHERE ((fr.sender_id = user_id_param AND fr.receiver_id = p.id)
         OR (fr.sender_id = p.id AND fr.receiver_id = user_id_param))
        AND fr.status IN ('pending', 'accepted')
    )
  ORDER BY suggestion_score DESC, p.created_at DESC
  LIMIT limit_param
  OFFSET offset_param;
END;
$$;

-- Fix get_mutual_friends_count_cached
CREATE OR REPLACE FUNCTION get_mutual_friends_count_cached(
  user1_id UUID,
  user2_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  mutual_count INTEGER;
BEGIN
  -- Try to get from cache first
  SELECT mfc.mutual_count::INTEGER INTO mutual_count
  FROM mutual_friends_cache mfc
  WHERE (mfc.user1_id = LEAST(user1_id, user2_id) AND mfc.user2_id = GREATEST(user1_id, user2_id));
  
  -- If not in cache, calculate directly
  IF mutual_count IS NULL THEN
    SELECT COUNT(DISTINCT fr1.receiver_id)::INTEGER INTO mutual_count
    FROM friend_requests fr1
    INNER JOIN friend_requests fr2 
      ON fr1.receiver_id = fr2.receiver_id
    WHERE fr1.sender_id = user1_id 
      AND fr2.sender_id = user2_id
      AND fr1.status = 'accepted' 
      AND fr2.status = 'accepted';
  END IF;
  
  RETURN COALESCE(mutual_count, 0);
END;
$$;


-- 2. SECURE MATERIALIZED VIEW ACCESS VIA RLS
-- ============================================

-- Enable RLS on materialized view (this won't expose it via API anymore)
ALTER MATERIALIZED VIEW mutual_friends_cache OWNER TO postgres;

-- Revoke public access
REVOKE ALL ON mutual_friends_cache FROM PUBLIC;
REVOKE ALL ON mutual_friends_cache FROM anon;
REVOKE ALL ON mutual_friends_cache FROM authenticated;

-- Grant only to functions that need it
GRANT SELECT ON mutual_friends_cache TO postgres;
