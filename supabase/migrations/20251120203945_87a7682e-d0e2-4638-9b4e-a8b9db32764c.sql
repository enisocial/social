-- Corriger la fonction get_smart_feed pour améliorer le feed
CREATE OR REPLACE FUNCTION public.get_smart_feed(
  user_id_param uuid,
  filter_type text DEFAULT 'recommended',
  limit_param integer DEFAULT 10,
  offset_param integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  content text,
  media_url text,
  media_type text,
  privacy text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  user_id uuid,
  username text,
  name text,
  avatar_url text,
  likes_count bigint,
  comments_count bigint,
  shares_count bigint,
  views_count bigint,
  user_liked boolean,
  relevance_score numeric,
  engagement_prediction numeric,
  final_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH 
  user_friends AS (
    SELECT DISTINCT
      CASE 
        WHEN sender_id = user_id_param THEN receiver_id
        ELSE sender_id
      END as friend_id
    FROM friend_requests
    WHERE (sender_id = user_id_param OR receiver_id = user_id_param)
      AND status = 'accepted'
  ),
  admin_moderator_users AS (
    SELECT user_id
    FROM user_roles
    WHERE role IN ('admin', 'moderator')
  ),
  user_engagement AS (
    SELECT 
      es.post_id,
      SUM(
        CASE es.signal_type
          WHEN 'view' THEN 0.1
          WHEN 'click' THEN 0.3
          WHEN 'like' THEN 1.0
          WHEN 'comment' THEN 2.0
          WHEN 'share' THEN 3.0
          WHEN 'time_spent' THEN es.signal_value * 0.05
          ELSE 0
        END
      ) as engagement_score
    FROM engagement_signals es
    WHERE es.user_id = user_id_param
      AND es.created_at > now() - interval '30 days'
    GROUP BY es.post_id
  ),
  post_metrics AS (
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
      EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND likes.user_id = user_id_param) as user_liked,
      CASE 
        WHEN EXISTS(SELECT 1 FROM user_friends WHERE friend_id = p.user_id) THEN 10.0
        WHEN p.user_id = user_id_param THEN 5.0
        ELSE 1.0
      END as friend_score,
      (
        COALESCE(COUNT(DISTINCT l.id), 0) * 1.0 +
        COALESCE(COUNT(DISTINCT c.id), 0) * 2.0 +
        COALESCE(COUNT(DISTINCT ps.id), 0) * 3.0
      ) / GREATEST(EXTRACT(EPOCH FROM (now() - p.created_at)) / 3600, 1) as popularity_score,
      COALESCE(ue.engagement_score, 0.5) as engagement_prediction,
      CASE 
        WHEN p.created_at > now() - interval '1 hour' THEN 5.0
        WHEN p.created_at > now() - interval '6 hours' THEN 3.0
        WHEN p.created_at > now() - interval '24 hours' THEN 2.0
        WHEN p.created_at > now() - interval '3 days' THEN 1.0
        ELSE 0.5
      END as recency_score
    FROM posts p
    INNER JOIN profiles prof ON p.user_id = prof.id
    LEFT JOIN likes l ON p.id = l.post_id
    LEFT JOIN comments c ON p.id = c.post_id
    LEFT JOIN post_shares ps ON p.id = ps.post_id
    LEFT JOIN post_views pv ON p.id = pv.post_id
    LEFT JOIN user_engagement ue ON p.id = ue.post_id
    WHERE 
      -- Inclure les posts publics, les posts d'amis et ses propres posts
      (p.privacy = 'public' OR 
       (p.privacy = 'friends' AND EXISTS(SELECT 1 FROM user_friends WHERE friend_id = p.user_id)) OR
       p.user_id = user_id_param)
      -- Exclure les admins et modérateurs (sauf si c'est l'utilisateur lui-même)
      AND (p.user_id = user_id_param OR p.user_id NOT IN (SELECT user_id FROM admin_moderator_users))
    GROUP BY p.id, prof.username, prof.name, prof.avatar_url, ue.engagement_score
  )
  SELECT 
    pm.id,
    pm.content,
    pm.media_url,
    pm.media_type,
    pm.privacy,
    pm.created_at,
    pm.updated_at,
    pm.user_id,
    pm.username,
    pm.name,
    pm.avatar_url,
    pm.likes_count,
    pm.comments_count,
    pm.shares_count,
    pm.views_count,
    pm.user_liked,
    pm.friend_score as relevance_score,
    pm.engagement_prediction,
    CASE 
      WHEN filter_type = 'recommended' THEN
        (pm.friend_score * 0.35 + pm.popularity_score * 0.25 + pm.engagement_prediction * 0.25 + pm.recency_score * 0.15)
      WHEN filter_type = 'friends' THEN
        CASE WHEN pm.friend_score > 1 THEN (pm.recency_score * 0.6 + pm.popularity_score * 0.4) ELSE 0 END
      WHEN filter_type = 'recent' THEN
        pm.recency_score
      ELSE
        pm.popularity_score
    END as final_score
  FROM post_metrics pm
  WHERE 
    CASE 
      WHEN filter_type = 'friends' THEN pm.friend_score > 5
      ELSE true
    END
  ORDER BY final_score DESC, pm.created_at DESC
  LIMIT limit_param
  OFFSET offset_param;
END;
$$;