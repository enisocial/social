-- ============================================
-- FIX REMAINING ISSUES
-- ============================================

-- 1. DROP get_smart_friend_suggestions WITH CORRECT SIGNATURE
-- ============================================
DROP FUNCTION IF EXISTS public.get_smart_friend_suggestions(user_id_param uuid, limit_param integer);

-- 2. FIX search_path ON SECURITY DEFINER FUNCTIONS
-- ============================================

-- Fix get_smart_feed_optimized
CREATE OR REPLACE FUNCTION public.get_smart_feed_optimized(
  user_id_param uuid, 
  filter_type text DEFAULT 'recommended'::text, 
  limit_param integer DEFAULT 15, 
  offset_param integer DEFAULT 0
)
RETURNS TABLE(
  id uuid, content text, media_url text, media_type text, privacy text, 
  created_at timestamp with time zone, updated_at timestamp with time zone, 
  user_id uuid, username text, name text, avatar_url text, 
  likes_count bigint, comments_count bigint, shares_count bigint, views_count bigint, 
  user_liked boolean, relevance_score numeric, engagement_prediction numeric, 
  final_score numeric, media jsonb, tags jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_weights RECORD;
BEGIN
  SELECT * INTO v_weights FROM feed_weights WHERE active = true LIMIT 1;
  IF NOT FOUND THEN
    v_weights.w_friend_score := 0.3;
    v_weights.w_popularity_score := 0.25;
    v_weights.w_recency_score := 0.25;
    v_weights.w_engagement_prediction := 0.2;
  END IF;

  RETURN QUERY
  WITH user_friends AS (
    SELECT CASE WHEN fr.sender_id = user_id_param THEN fr.receiver_id ELSE fr.sender_id END AS friend_id
    FROM friend_requests fr
    WHERE fr.status = 'accepted' AND (fr.sender_id = user_id_param OR fr.receiver_id = user_id_param)
  ),
  post_stats AS (
    SELECT p.id, p.content, p.media_url, p.media_type, p.privacy, p.created_at, p.updated_at, p.user_id,
      prof.username, prof.name, prof.avatar_url,
      COALESCE(COUNT(DISTINCT l.id), 0)::BIGINT AS likes_count,
      COALESCE(COUNT(DISTINCT c.id), 0)::BIGINT AS comments_count,
      COALESCE(COUNT(DISTINCT ps.id), 0)::BIGINT AS shares_count,
      COALESCE(COUNT(DISTINCT pv.id), 0)::BIGINT AS views_count,
      EXISTS(SELECT 1 FROM likes l2 WHERE l2.post_id = p.id AND l2.user_id = user_id_param) AS user_liked,
      CASE WHEN uf.friend_id IS NOT NULL THEN 1.0 ELSE 0.0 END AS friend_score,
      (COALESCE(COUNT(DISTINCT l.id), 0) * 2 + COALESCE(COUNT(DISTINCT c.id), 0) * 3 + COALESCE(COUNT(DISTINCT ps.id), 0) * 4)::NUMERIC / 
       NULLIF((EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600 + 1), 0) AS popularity_score,
      1.0 / (EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600 + 1) AS recency_score,
      COALESCE((SELECT AVG(es.signal_value) FROM engagement_signals es WHERE es.user_id = user_id_param AND es.post_id = p.id), 0.5) AS engagement_prediction,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('id', pm.id, 'media_url', pm.media_url, 'media_type', pm.media_type, 'order_index', pm.order_index) ORDER BY pm.order_index) FROM post_media pm WHERE pm.post_id = p.id), '[]'::jsonb) AS media,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('user_id', pt.tagged_user_id, 'tagged_by', pt.tagged_by)) FROM post_tags pt WHERE pt.post_id = p.id), '[]'::jsonb) AS tags
    FROM posts p
    INNER JOIN profiles prof ON p.user_id = prof.id
    LEFT JOIN likes l ON p.id = l.post_id
    LEFT JOIN comments c ON p.id = c.post_id
    LEFT JOIN post_shares ps ON p.id = ps.post_id
    LEFT JOIN post_views pv ON p.id = pv.post_id
    LEFT JOIN user_friends uf ON p.user_id = uf.friend_id
    WHERE (p.privacy = 'public' OR (p.privacy = 'friends' AND uf.friend_id IS NOT NULL))
    GROUP BY p.id, prof.id, prof.username, prof.name, prof.avatar_url, uf.friend_id
  )
  SELECT ps.id, ps.content, ps.media_url, ps.media_type, ps.privacy, ps.created_at, ps.updated_at, ps.user_id,
    ps.username, ps.name, ps.avatar_url, ps.likes_count, ps.comments_count, ps.shares_count, ps.views_count,
    ps.user_liked, ps.friend_score AS relevance_score, ps.engagement_prediction,
    (ps.friend_score * v_weights.w_friend_score + ps.popularity_score * v_weights.w_popularity_score + 
     ps.recency_score * v_weights.w_recency_score + ps.engagement_prediction * v_weights.w_engagement_prediction) AS final_score,
    ps.media, ps.tags
  FROM post_stats ps
  ORDER BY
    CASE WHEN filter_type = 'recent' THEN ps.created_at ELSE NULL END DESC,
    CASE WHEN filter_type = 'recommended' THEN (ps.friend_score * v_weights.w_friend_score + ps.popularity_score * v_weights.w_popularity_score + ps.recency_score * v_weights.w_recency_score + ps.engagement_prediction * v_weights.w_engagement_prediction) ELSE NULL END DESC NULLS LAST,
    ps.created_at DESC
  LIMIT limit_param OFFSET offset_param;
END;
$$;

-- Fix get_shared_posts_optimized
CREATE OR REPLACE FUNCTION public.get_shared_posts_optimized(
  user_id_param uuid, 
  limit_param integer DEFAULT 50
)
RETURNS TABLE(
  id uuid, post_id uuid, share_message text, created_at timestamp with time zone, 
  shared_by uuid, share_type text, shared_by_profile jsonb, original_post jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH user_friends AS (
    SELECT DISTINCT CASE WHEN sender_id = user_id_param THEN receiver_id ELSE sender_id END as friend_id
    FROM friend_requests WHERE (sender_id = user_id_param OR receiver_id = user_id_param) AND status = 'accepted'
  )
  SELECT ps.id, ps.post_id, ps.share_message, ps.created_at, ps.shared_by, ps.share_type,
    jsonb_build_object('id', prof.id, 'name', prof.name, 'username', prof.username, 'avatar_url', prof.avatar_url) as shared_by_profile,
    jsonb_build_object('id', p.id, 'content', p.content, 'media_url', p.media_url, 'media_type', p.media_type, 'created_at', p.created_at,
      'user', jsonb_build_object('id', p_prof.id, 'name', p_prof.name, 'username', p_prof.username, 'avatar_url', p_prof.avatar_url)) as original_post
  FROM post_shares ps
  INNER JOIN profiles prof ON ps.shared_by = prof.id
  INNER JOIN posts p ON ps.post_id = p.id
  INNER JOIN profiles p_prof ON p.user_id = p_prof.id
  WHERE ps.shared_by IN (SELECT friend_id FROM user_friends) AND ps.share_type = 'profile'
  ORDER BY ps.created_at DESC LIMIT limit_param;
END;
$$;

-- Fix populate_timeline_for_user
CREATE OR REPLACE FUNCTION public.populate_timeline_for_user(
  p_user_id uuid, 
  p_limit integer DEFAULT 100, 
  w1 numeric DEFAULT 0.25, 
  w2 numeric DEFAULT 0.35, 
  w3 numeric DEFAULT 0.30, 
  w4 numeric DEFAULT 0.10
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  inserted_count INTEGER := 0;
  post_record RECORD;
  user_variant TEXT;
  final_score NUMERIC;
BEGIN
  SELECT CASE WHEN (EXTRACT(EPOCH FROM NOW())::BIGINT + p_user_id::TEXT::BIGINT) % 2 = 0
    THEN 'personalized' ELSE 'chronological' END INTO user_variant;
  
  FOR post_record IN (
    SELECT p.id as post_id, p.created_at, p.user_id as author_id, p.media_type,
      calculate_recency_decay(p.created_at) as recency,
      calculate_engagement_score(p.id) as engagement,
      calculate_affinity_score(p_user_id, p.user_id) as affinity,
      get_content_type_weight(p.media_type) as content_weight
    FROM posts p
    WHERE (p.privacy = 'public' OR (p.privacy = 'friends' AND EXISTS(
         SELECT 1 FROM friend_requests fr WHERE fr.status = 'accepted'
           AND ((fr.sender_id = p_user_id AND fr.receiver_id = p.user_id) OR (fr.sender_id = p.user_id AND fr.receiver_id = p_user_id))
       )))
      AND p.created_at > NOW() - INTERVAL '7 days'
      AND NOT EXISTS (SELECT 1 FROM timeline_items ti WHERE ti.user_id = p_user_id AND ti.post_id = p.id)
    ORDER BY p.created_at DESC LIMIT p_limit
  )
  LOOP
    final_score := calculate_ranking_score(post_record.recency, post_record.engagement, post_record.affinity, post_record.content_weight, w1, w2, w3, w4);
    INSERT INTO timeline_items (user_id, post_id, recency_decay, engagement_score, affinity_score, content_type_weight, ranking_score, variant)
    VALUES (p_user_id, post_record.post_id, post_record.recency, post_record.engagement, post_record.affinity, post_record.content_weight, final_score, user_variant)
    ON CONFLICT (user_id, post_id) DO UPDATE SET
      recency_decay = EXCLUDED.recency_decay, engagement_score = EXCLUDED.engagement_score, affinity_score = EXCLUDED.affinity_score,
      content_type_weight = EXCLUDED.content_type_weight, ranking_score = EXCLUDED.ranking_score, updated_at = NOW();
    inserted_count := inserted_count + 1;
  END LOOP;
  RETURN inserted_count;
END;
$$;