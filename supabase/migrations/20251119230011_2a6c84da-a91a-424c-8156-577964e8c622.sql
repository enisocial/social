-- Supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS get_smart_feed(uuid, text, integer, integer);

-- Table pour stocker les signaux d'engagement des utilisateurs
CREATE TABLE IF NOT EXISTS public.engagement_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('view', 'like', 'comment', 'share', 'click', 'time_spent')),
  signal_value NUMERIC NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id, signal_type, created_at)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_engagement_signals_user ON engagement_signals(user_id);
CREATE INDEX IF NOT EXISTS idx_engagement_signals_post ON engagement_signals(post_id);
CREATE INDEX IF NOT EXISTS idx_engagement_signals_created ON engagement_signals(created_at DESC);

-- RLS policies
ALTER TABLE public.engagement_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own signals" ON public.engagement_signals;
CREATE POLICY "Users can view their own signals"
  ON public.engagement_signals FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own signals" ON public.engagement_signals;
CREATE POLICY "Users can insert their own signals"
  ON public.engagement_signals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Fonction pour enregistrer un signal d'engagement
CREATE OR REPLACE FUNCTION record_engagement_signal(
  p_user_id UUID,
  p_post_id UUID,
  p_signal_type TEXT,
  p_signal_value NUMERIC DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO engagement_signals (user_id, post_id, signal_type, signal_value)
  VALUES (p_user_id, p_post_id, p_signal_type, p_signal_value)
  ON CONFLICT (user_id, post_id, signal_type, created_at) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Nouvelle fonction get_smart_feed avec algorithme intelligent
CREATE OR REPLACE FUNCTION get_smart_feed(
  user_id_param UUID,
  filter_type TEXT DEFAULT 'recommended',
  limit_param INTEGER DEFAULT 10,
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
  final_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH 
  -- Amis de l'utilisateur
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
  
  -- Engagement récent de l'utilisateur
  user_engagement AS (
    SELECT 
      post_id,
      SUM(
        CASE signal_type
          WHEN 'view' THEN 0.1
          WHEN 'click' THEN 0.3
          WHEN 'like' THEN 1.0
          WHEN 'comment' THEN 2.0
          WHEN 'share' THEN 3.0
          WHEN 'time_spent' THEN signal_value * 0.05
          ELSE 0
        END
      ) as engagement_score
    FROM engagement_signals
    WHERE user_id = user_id_param
      AND created_at > now() - interval '30 days'
    GROUP BY post_id
  ),
  
  -- Posts avec leurs métriques
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
      
      -- Score de pertinence basé sur les amis
      CASE 
        WHEN p.user_id = user_id_param THEN 0 -- Ne pas montrer ses propres posts
        WHEN EXISTS(SELECT 1 FROM user_friends WHERE friend_id = p.user_id) THEN 5.0
        ELSE 1.0
      END as friend_score,
      
      -- Score de popularité (likes, comments, shares)
      (
        COALESCE(COUNT(DISTINCT l.id), 0) * 1.0 +
        COALESCE(COUNT(DISTINCT c.id), 0) * 2.0 +
        COALESCE(COUNT(DISTINCT ps.id), 0) * 3.0
      ) / GREATEST(EXTRACT(EPOCH FROM (now() - p.created_at)) / 3600, 1) as popularity_score,
      
      -- Score d'engagement prédit basé sur l'historique
      COALESCE(ue.engagement_score, 0.5) as engagement_prediction,
      
      -- Fraîcheur du post (posts récents = score plus élevé)
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
      (p.privacy = 'public' OR 
       (p.privacy = 'friends' AND EXISTS(SELECT 1 FROM user_friends WHERE friend_id = p.user_id)) OR
       p.user_id = user_id_param)
      AND p.user_id != user_id_param  -- Exclure les propres posts
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
    -- Calcul du score final
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
      WHEN filter_type = 'friends' THEN pm.friend_score > 1
      ELSE true
    END
  ORDER BY final_score DESC, pm.created_at DESC
  LIMIT limit_param
  OFFSET offset_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;