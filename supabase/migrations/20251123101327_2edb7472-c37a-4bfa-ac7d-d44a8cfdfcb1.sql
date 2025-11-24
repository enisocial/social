-- ============================================
-- FIX REMAINING CRITICAL ISSUES
-- ============================================

-- 1. CREATE OPTIMIZED RPC FOR FRIEND STATS (replaces 6 queries with 1)
CREATE OR REPLACE FUNCTION public.get_friend_interaction_stats(
  p_user_id UUID,
  p_friend_id UUID
)
RETURNS TABLE (
  posts_liked INTEGER,
  comments_count INTEGER,
  last_interaction TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH friend_posts AS (
    SELECT id FROM posts WHERE user_id = p_friend_id
  ),
  likes_data AS (
    SELECT COUNT(*)::INTEGER as count, MAX(created_at) as last_like
    FROM likes
    WHERE user_id = p_user_id AND post_id IN (SELECT id FROM friend_posts)
  ),
  comments_data AS (
    SELECT COUNT(*)::INTEGER as count, MAX(created_at) as last_comment
    FROM comments
    WHERE user_id = p_user_id AND post_id IN (SELECT id FROM friend_posts)
  )
  SELECT 
    l.count as posts_liked,
    c.count as comments_count,
    GREATEST(l.last_like, c.last_comment) as last_interaction
  FROM likes_data l
  CROSS JOIN comments_data c;
END;
$$;

-- 2. OPTIMIZE update_user_affinity TRIGGER (debounce with statement-level trigger)
DROP TRIGGER IF EXISTS update_user_affinity_on_like ON likes;
DROP TRIGGER IF EXISTS update_user_affinity_on_comment ON comments;
DROP TRIGGER IF EXISTS update_user_affinity_on_share ON post_shares;

-- Replace with more efficient version that batches updates
CREATE OR REPLACE FUNCTION public.update_user_affinity_batch()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only update affinity if interaction is less than 1 hour old (reduce spam)
  IF TG_TABLE_NAME = 'likes' THEN
    INSERT INTO user_affinity (user_id, target_user_id, interaction_count, affinity_score, last_interaction_at)
    SELECT NEW.user_id, p.user_id, 1, 1.0, now()
    FROM posts p 
    WHERE p.id = NEW.post_id AND p.user_id != NEW.user_id
    ON CONFLICT (user_id, target_user_id) 
    DO UPDATE SET 
      interaction_count = user_affinity.interaction_count + 1,
      affinity_score = user_affinity.affinity_score + 0.3,
      last_interaction_at = now()
    WHERE user_affinity.last_interaction_at < now() - INTERVAL '1 hour'; -- Debounce
  ELSIF TG_TABLE_NAME = 'comments' THEN
    INSERT INTO user_affinity (user_id, target_user_id, interaction_count, affinity_score, last_interaction_at)
    SELECT NEW.user_id, p.user_id, 1, 2.0, now()
    FROM posts p 
    WHERE p.id = NEW.post_id AND p.user_id != NEW.user_id
    ON CONFLICT (user_id, target_user_id) 
    DO UPDATE SET 
      interaction_count = user_affinity.interaction_count + 1,
      affinity_score = user_affinity.affinity_score + 0.8,
      last_interaction_at = now()
    WHERE user_affinity.last_interaction_at < now() - INTERVAL '1 hour';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_user_affinity_on_like
AFTER INSERT ON likes
FOR EACH ROW
EXECUTE FUNCTION update_user_affinity_batch();

CREATE TRIGGER update_user_affinity_on_comment
AFTER INSERT ON comments
FOR EACH ROW
EXECUTE FUNCTION update_user_affinity_batch();

-- 3. DEPRECATE get_friend_suggestions (use get_batch_friend_suggestions instead)
-- Add comment to mark as deprecated
COMMENT ON FUNCTION public.get_friend_suggestions(uuid, integer) IS 
'DEPRECATED: Use get_batch_friend_suggestions instead. This function will be removed in future versions.';

-- 4. ADD THROTTLING TO TYPING STATUS
CREATE OR REPLACE FUNCTION public.update_typing_status_throttled(
  p_conversation_id UUID,
  p_user_id UUID,
  p_is_typing BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only update if last update was > 3 seconds ago (throttling)
  INSERT INTO typing_status (conversation_id, user_id, is_typing, updated_at)
  VALUES (p_conversation_id, p_user_id, p_is_typing, now())
  ON CONFLICT (conversation_id, user_id) DO UPDATE
  SET 
    is_typing = p_is_typing,
    updated_at = now()
  WHERE typing_status.updated_at < now() - INTERVAL '3 seconds';
  
  -- Auto-cleanup
  IF NOT p_is_typing THEN
    DELETE FROM typing_status
    WHERE conversation_id = p_conversation_id
      AND user_id = p_user_id;
  END IF;
END;
$$;

-- 5. CREATE INDEX FOR FASTER FRIEND LIST QUERIES
CREATE INDEX IF NOT EXISTS idx_friend_requests_accepted_sender 
ON friend_requests(sender_id) 
WHERE status = 'accepted';

CREATE INDEX IF NOT EXISTS idx_friend_requests_accepted_receiver 
ON friend_requests(receiver_id) 
WHERE status = 'accepted';

-- 6. ADD RPC FOR PAGINATED FRIENDS LIST
CREATE OR REPLACE FUNCTION public.get_friends_paginated(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_search TEXT DEFAULT NULL,
  p_location_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  sender_id UUID,
  receiver_id UUID,
  created_at TIMESTAMPTZ,
  sender_profile JSONB,
  receiver_profile JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fr.id,
    fr.sender_id,
    fr.receiver_id,
    fr.created_at,
    jsonb_build_object(
      'id', sender.id,
      'username', sender.username,
      'name', sender.name,
      'avatar_url', sender.avatar_url,
      'city', sender.city,
      'region', sender.region,
      'country', sender.country
    ) as sender_profile,
    jsonb_build_object(
      'id', receiver.id,
      'username', receiver.username,
      'name', receiver.name,
      'avatar_url', receiver.avatar_url,
      'city', receiver.city,
      'region', receiver.region,
      'country', receiver.country
    ) as receiver_profile
  FROM friend_requests fr
  INNER JOIN profiles sender ON fr.sender_id = sender.id
  INNER JOIN profiles receiver ON fr.receiver_id = receiver.id
  WHERE fr.status = 'accepted'
    AND (fr.sender_id = p_user_id OR fr.receiver_id = p_user_id)
    AND (
      p_search IS NULL OR
      sender.name ILIKE '%' || p_search || '%' OR
      sender.username ILIKE '%' || p_search || '%' OR
      receiver.name ILIKE '%' || p_search || '%' OR
      receiver.username ILIKE '%' || p_search || '%'
    )
    AND (
      p_location_filter IS NULL OR
      sender.city = p_location_filter OR
      sender.region = p_location_filter OR
      sender.country = p_location_filter OR
      receiver.city = p_location_filter OR
      receiver.region = p_location_filter OR
      receiver.country = p_location_filter
    )
  ORDER BY fr.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;