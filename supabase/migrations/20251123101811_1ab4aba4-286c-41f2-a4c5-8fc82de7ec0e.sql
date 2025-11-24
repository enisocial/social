-- Fix get_smart_feed_optimized: remove invalid tags aggregation
CREATE OR REPLACE FUNCTION public.get_smart_feed_optimized(
  user_id_param UUID,
  filter_type TEXT DEFAULT 'recommended',
  limit_param INTEGER DEFAULT 15,
  offset_param INTEGER DEFAULT 0
)
RETURNS TABLE (
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
  relevance_score NUMERIC,
  engagement_prediction NUMERIC,
  final_score NUMERIC,
  media JSONB,
  tags JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_weights RECORD;
BEGIN
  -- Get active weights
  SELECT * INTO v_weights
  FROM feed_weights
  WHERE active = true
  LIMIT 1;

  -- Fallback to default weights if none active
  IF NOT FOUND THEN
    v_weights.w_friend_score := 0.3;
    v_weights.w_popularity_score := 0.25;
    v_weights.w_recency_score := 0.25;
    v_weights.w_engagement_prediction := 0.2;
  END IF;

  RETURN QUERY
  WITH user_friends AS (
    SELECT CASE
      WHEN fr.sender_id = user_id_param THEN fr.receiver_id
      ELSE fr.sender_id
    END AS friend_id
    FROM friend_requests fr
    WHERE fr.status = 'accepted'
    AND (fr.sender_id = user_id_param OR fr.receiver_id = user_id_param)
  ),
  post_stats AS (
    SELECT
      p.id,
      p.content,
      p.media_url,
      p.media_type,
      p.privacy,
      p.created_at,
      p.updated_at,
      p.user_id,
      prof.username,
      prof.name,
      prof.avatar_url,
      COALESCE(COUNT(DISTINCT l.id), 0)::BIGINT AS likes_count,
      COALESCE(COUNT(DISTINCT c.id), 0)::BIGINT AS comments_count,
      COALESCE(COUNT(DISTINCT ps.id), 0)::BIGINT AS shares_count,
      COALESCE(COUNT(DISTINCT pv.id), 0)::BIGINT AS views_count,
      EXISTS(SELECT 1 FROM likes l2 WHERE l2.post_id = p.id AND l2.user_id = user_id_param) AS user_liked,
      -- Friend score
      CASE WHEN uf.friend_id IS NOT NULL THEN 1.0 ELSE 0.0 END AS friend_score,
      -- Popularity score
      (COALESCE(COUNT(DISTINCT l.id), 0) * 2 + 
       COALESCE(COUNT(DISTINCT c.id), 0) * 3 + 
       COALESCE(COUNT(DISTINCT ps.id), 0) * 4)::NUMERIC / 
       NULLIF((EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600 + 1), 0) AS popularity_score,
      -- Recency score
      1.0 / (EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600 + 1) AS recency_score,
      -- Engagement prediction
      COALESCE(
        (SELECT AVG(es.signal_value)
         FROM engagement_signals es
         WHERE es.user_id = user_id_param
         AND es.post_id = p.id),
        0.5
      ) AS engagement_prediction,
      -- Aggregate media
      COALESCE(
        (SELECT jsonb_agg(
          jsonb_build_object(
            'id', pm.id,
            'media_url', pm.media_url,
            'media_type', pm.media_type,
            'order_index', pm.order_index
          ) ORDER BY pm.order_index
        )
        FROM post_media pm
        WHERE pm.post_id = p.id),
        '[]'::jsonb
      ) AS media,
      -- Tagged users (not content tags)
      COALESCE(
        (SELECT jsonb_agg(
          jsonb_build_object(
            'user_id', pt.tagged_user_id,
            'tagged_by', pt.tagged_by
          )
        )
        FROM post_tags pt
        WHERE pt.post_id = p.id),
        '[]'::jsonb
      ) AS tags
    FROM posts p
    INNER JOIN profiles prof ON p.user_id = prof.id
    LEFT JOIN likes l ON p.id = l.post_id
    LEFT JOIN comments c ON p.id = c.post_id
    LEFT JOIN post_shares ps ON p.id = ps.post_id
    LEFT JOIN post_views pv ON p.id = pv.post_id
    LEFT JOIN user_friends uf ON p.user_id = uf.friend_id
    WHERE (
      p.privacy = 'public'
      OR (p.privacy = 'friends' AND uf.friend_id IS NOT NULL)
    )
    GROUP BY p.id, prof.id, prof.username, prof.name, prof.avatar_url, uf.friend_id
  )
  SELECT
    ps.id,
    ps.content,
    ps.media_url,
    ps.media_type,
    ps.privacy,
    ps.created_at,
    ps.updated_at,
    ps.user_id,
    ps.username,
    ps.name,
    ps.avatar_url,
    ps.likes_count,
    ps.comments_count,
    ps.shares_count,
    ps.views_count,
    ps.user_liked,
    ps.friend_score AS relevance_score,
    ps.engagement_prediction,
    (
      ps.friend_score * v_weights.w_friend_score +
      ps.popularity_score * v_weights.w_popularity_score +
      ps.recency_score * v_weights.w_recency_score +
      ps.engagement_prediction * v_weights.w_engagement_prediction
    ) AS final_score,
    ps.media,
    ps.tags
  FROM post_stats ps
  ORDER BY
    CASE 
      WHEN filter_type = 'recent' THEN ps.created_at
      ELSE NULL
    END DESC,
    CASE 
      WHEN filter_type = 'recommended' THEN (
        ps.friend_score * v_weights.w_friend_score +
        ps.popularity_score * v_weights.w_popularity_score +
        ps.recency_score * v_weights.w_recency_score +
        ps.engagement_prediction * v_weights.w_engagement_prediction
      )
      ELSE NULL
    END DESC NULLS LAST,
    ps.created_at DESC
  LIMIT limit_param
  OFFSET offset_param;
END;
$$;