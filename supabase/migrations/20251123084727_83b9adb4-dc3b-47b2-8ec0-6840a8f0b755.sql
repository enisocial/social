-- ============================================================================
-- MIGRATION: Optimisation complète du système de fil d'actualité (Correction)
-- ============================================================================

-- 1. Table pour les poids dynamiques de l'algorithme
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.feed_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant TEXT NOT NULL DEFAULT 'default',
  w_friend_score NUMERIC NOT NULL DEFAULT 0.35,
  w_popularity_score NUMERIC NOT NULL DEFAULT 0.25,
  w_engagement_prediction NUMERIC NOT NULL DEFAULT 0.25,
  w_recency_score NUMERIC NOT NULL DEFAULT 0.15,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(variant)
);

-- Insérer les poids par défaut
INSERT INTO public.feed_weights (variant, w_friend_score, w_popularity_score, w_engagement_prediction, w_recency_score, active)
VALUES 
  ('default', 0.35, 0.25, 0.25, 0.15, true),
  ('engagement_focused', 0.20, 0.40, 0.30, 0.10, false),
  ('recency_focused', 0.15, 0.15, 0.20, 0.50, false)
ON CONFLICT (variant) DO NOTHING;

-- RLS pour feed_weights
ALTER TABLE public.feed_weights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Feed weights viewable by everyone" ON public.feed_weights;
CREATE POLICY "Feed weights viewable by everyone"
  ON public.feed_weights FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Only admins can modify feed weights" ON public.feed_weights;
CREATE POLICY "Only admins can modify feed weights"
  ON public.feed_weights FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 2. Optimiser get_smart_feed pour inclure médias et tags
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_smart_feed_optimized(
  user_id_param uuid,
  filter_type text DEFAULT 'recommended',
  limit_param integer DEFAULT 15,
  offset_param integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  content text,
  media_url text,
  media_type text,
  privacy text,
  created_at timestamptz,
  updated_at timestamptz,
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
  final_score numeric,
  media jsonb,
  tags jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_weights RECORD;
BEGIN
  SELECT * INTO active_weights FROM feed_weights WHERE active = true LIMIT 1;
  IF active_weights IS NULL THEN
    active_weights.w_friend_score := 0.35;
    active_weights.w_popularity_score := 0.25;
    active_weights.w_engagement_prediction := 0.25;
    active_weights.w_recency_score := 0.15;
  END IF;

  RETURN QUERY
  WITH 
  user_friends AS (
    SELECT DISTINCT
      CASE WHEN sender_id = user_id_param THEN receiver_id ELSE sender_id END as friend_id
    FROM friend_requests
    WHERE (sender_id = user_id_param OR receiver_id = user_id_param) AND status = 'accepted'
  ),
  admin_moderator_users AS (
    SELECT user_id FROM user_roles WHERE role IN ('admin', 'moderator')
  ),
  user_engagement AS (
    SELECT 
      es.post_id,
      SUM(CASE es.signal_type
          WHEN 'view' THEN 0.1 WHEN 'click' THEN 0.3 WHEN 'like' THEN 1.0
          WHEN 'comment' THEN 2.0 WHEN 'share' THEN 3.0
          WHEN 'time_spent' THEN es.signal_value * 0.05 ELSE 0 END) as engagement_score
    FROM engagement_signals es
    WHERE es.user_id = user_id_param AND es.created_at > now() - interval '30 days'
    GROUP BY es.post_id
  ),
  post_metrics AS (
    SELECT 
      p.id, p.content, p.media_url, p.media_type::TEXT, p.privacy::TEXT,
      p.created_at, p.updated_at, p.user_id,
      prof.username, prof.name, prof.avatar_url,
      COALESCE(COUNT(DISTINCT l.id), 0) as likes_count,
      COALESCE(COUNT(DISTINCT c.id), 0) as comments_count,
      COALESCE(COUNT(DISTINCT ps.id), 0) as shares_count,
      COALESCE(COUNT(DISTINCT pv.id), 0) as views_count,
      EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND likes.user_id = user_id_param) as user_liked,
      CASE 
        WHEN EXISTS(SELECT 1 FROM user_friends WHERE friend_id = p.user_id) THEN 10.0
        WHEN p.user_id = user_id_param THEN 5.0 ELSE 1.0 END as friend_score,
      (COALESCE(COUNT(DISTINCT l.id), 0) * 1.0 + COALESCE(COUNT(DISTINCT c.id), 0) * 2.0 +
       COALESCE(COUNT(DISTINCT ps.id), 0) * 3.0) / GREATEST(EXTRACT(EPOCH FROM (now() - p.created_at)) / 3600, 1) as popularity_score,
      COALESCE(ue.engagement_score, 0.5) as engagement_prediction,
      CASE 
        WHEN p.created_at > now() - interval '1 hour' THEN 5.0
        WHEN p.created_at > now() - interval '6 hours' THEN 3.0
        WHEN p.created_at > now() - interval '24 hours' THEN 2.0
        WHEN p.created_at > now() - interval '3 days' THEN 1.0 ELSE 0.5 END as recency_score,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('id', pm.id, 'media_url', pm.media_url, 'media_type', pm.media_type, 'order_index', pm.order_index) ORDER BY pm.order_index)
                FROM post_media pm WHERE pm.post_id = p.id), '[]'::jsonb) as media,
      COALESCE((SELECT jsonb_agg(pt.tag) FROM post_tags pt WHERE pt.post_id = p.id), '[]'::jsonb) as tags
    FROM posts p
    INNER JOIN profiles prof ON p.user_id = prof.id
    LEFT JOIN likes l ON p.id = l.post_id
    LEFT JOIN comments c ON p.id = c.post_id
    LEFT JOIN post_shares ps ON p.id = ps.post_id
    LEFT JOIN post_views pv ON p.id = pv.post_id
    LEFT JOIN user_engagement ue ON p.id = ue.post_id
    WHERE (p.privacy = 'public' OR (p.privacy = 'friends' AND EXISTS(SELECT 1 FROM user_friends WHERE friend_id = p.user_id)) OR p.user_id = user_id_param)
      AND (p.user_id = user_id_param OR p.user_id NOT IN (SELECT user_id FROM admin_moderator_users))
    GROUP BY p.id, prof.username, prof.name, prof.avatar_url, ue.engagement_score
  )
  SELECT pm.id, pm.content, pm.media_url, pm.media_type, pm.privacy, pm.created_at, pm.updated_at,
    pm.user_id, pm.username, pm.name, pm.avatar_url, pm.likes_count, pm.comments_count, pm.shares_count, pm.views_count, pm.user_liked,
    pm.friend_score as relevance_score, pm.engagement_prediction,
    CASE WHEN filter_type = 'recommended' THEN
        (pm.friend_score * active_weights.w_friend_score + pm.popularity_score * active_weights.w_popularity_score + 
         pm.engagement_prediction * active_weights.w_engagement_prediction + pm.recency_score * active_weights.w_recency_score)
      WHEN filter_type = 'friends' THEN CASE WHEN pm.friend_score > 1 THEN (pm.recency_score * 0.6 + pm.popularity_score * 0.4) ELSE 0 END
      WHEN filter_type = 'recent' THEN pm.recency_score ELSE pm.popularity_score END as final_score,
    pm.media, pm.tags
  FROM post_metrics pm
  WHERE CASE WHEN filter_type = 'friends' THEN pm.friend_score > 5 ELSE true END
  ORDER BY final_score DESC, pm.created_at DESC LIMIT limit_param OFFSET offset_param;
END;
$$;

-- 3. Index pour optimiser les performances
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_posts_created_at_desc ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user_privacy ON public.posts(user_id, privacy);
CREATE INDEX IF NOT EXISTS idx_likes_post_user ON public.likes(post_id, user_id);
CREATE INDEX IF NOT EXISTS idx_comments_post ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_shares_post ON public.post_shares(post_id);
CREATE INDEX IF NOT EXISTS idx_engagement_signals_user_post ON public.engagement_signals(user_id, post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON public.friend_requests(status) WHERE status = 'accepted';
CREATE INDEX IF NOT EXISTS idx_post_media_post_order ON public.post_media(post_id, order_index);
CREATE INDEX IF NOT EXISTS idx_post_tags_post ON public.post_tags(post_id);

-- 4. Fonction pour gérer les posts partagés optimisés
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_shared_posts_optimized(
  user_id_param uuid,
  limit_param integer DEFAULT 50
)
RETURNS TABLE(
  id uuid, post_id uuid, share_message text, created_at timestamptz,
  shared_by uuid, share_type text, shared_by_profile jsonb, original_post jsonb
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
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