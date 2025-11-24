-- Table pour tracker les interactions utilisateur (pour le machine learning)
CREATE TABLE IF NOT EXISTS public.user_engagement_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL, -- 'view', 'like', 'comment', 'share', 'click', 'time_spent'
  signal_value NUMERIC DEFAULT 1, -- Pour time_spent en secondes, etc.
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, post_id, signal_type, created_at)
);

-- Table pour les préférences de contenu
CREATE TABLE IF NOT EXISTS public.user_content_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL, -- 'video', 'image', 'text'
  preference_score NUMERIC DEFAULT 1.0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, content_type)
);

-- Table pour l'affinité entre utilisateurs
CREATE TABLE IF NOT EXISTS public.user_affinity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  affinity_score NUMERIC DEFAULT 1.0,
  interaction_count INT DEFAULT 0,
  last_interaction_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, target_user_id)
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_engagement_signals_user_post ON user_engagement_signals(user_id, post_id);
CREATE INDEX IF NOT EXISTS idx_engagement_signals_type ON user_engagement_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_content_preferences_user ON user_content_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_affinity_user_target ON user_affinity(user_id, target_user_id);
CREATE INDEX IF NOT EXISTS idx_affinity_score ON user_affinity(affinity_score DESC);

-- Enable RLS
ALTER TABLE public.user_engagement_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_content_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_affinity ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own engagement signals"
  ON public.user_engagement_signals
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own content preferences"
  ON public.user_content_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own affinity data"
  ON public.user_affinity
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Fonction pour mettre à jour l'affinité automatiquement
CREATE OR REPLACE FUNCTION update_user_affinity()
RETURNS TRIGGER AS $$
BEGIN
  -- Mise à jour de l'affinité entre utilisateurs lors d'interactions
  IF TG_TABLE_NAME = 'likes' THEN
    INSERT INTO user_affinity (user_id, target_user_id, interaction_count, affinity_score, last_interaction_at)
    SELECT NEW.user_id, p.user_id, 1, 2.0, now()
    FROM posts p WHERE p.id = NEW.post_id AND p.user_id != NEW.user_id
    ON CONFLICT (user_id, target_user_id) 
    DO UPDATE SET 
      interaction_count = user_affinity.interaction_count + 1,
      affinity_score = user_affinity.affinity_score + 0.5,
      last_interaction_at = now();
  ELSIF TG_TABLE_NAME = 'comments' THEN
    INSERT INTO user_affinity (user_id, target_user_id, interaction_count, affinity_score, last_interaction_at)
    SELECT NEW.user_id, p.user_id, 1, 3.0, now()
    FROM posts p WHERE p.id = NEW.post_id AND p.user_id != NEW.user_id
    ON CONFLICT (user_id, target_user_id) 
    DO UPDATE SET 
      interaction_count = user_affinity.interaction_count + 1,
      affinity_score = user_affinity.affinity_score + 1.0,
      last_interaction_at = now();
  ELSIF TG_TABLE_NAME = 'post_shares' THEN
    INSERT INTO user_affinity (user_id, target_user_id, interaction_count, affinity_score, last_interaction_at)
    SELECT NEW.shared_by, p.user_id, 1, 4.0, now()
    FROM posts p WHERE p.id = NEW.post_id AND p.user_id != NEW.shared_by
    ON CONFLICT (user_id, target_user_id) 
    DO UPDATE SET 
      interaction_count = user_affinity.interaction_count + 1,
      affinity_score = user_affinity.affinity_score + 1.5,
      last_interaction_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers pour mettre à jour l'affinité
DROP TRIGGER IF EXISTS update_affinity_on_like ON likes;
CREATE TRIGGER update_affinity_on_like
  AFTER INSERT ON likes
  FOR EACH ROW EXECUTE FUNCTION update_user_affinity();

DROP TRIGGER IF EXISTS update_affinity_on_comment ON comments;
CREATE TRIGGER update_affinity_on_comment
  AFTER INSERT ON comments
  FOR EACH ROW EXECUTE FUNCTION update_user_affinity();

DROP TRIGGER IF EXISTS update_affinity_on_share ON post_shares;
CREATE TRIGGER update_affinity_on_share
  AFTER INSERT ON post_shares
  FOR EACH ROW EXECUTE FUNCTION update_user_affinity();

-- Fonction avancée pour le fil d'actualité avec scoring Facebook-like
CREATE OR REPLACE FUNCTION get_smart_feed(
  user_id_param UUID,
  filter_type TEXT DEFAULT 'recommended',
  limit_param INT DEFAULT 20,
  offset_param INT DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  content TEXT,
  media_url TEXT,
  media_type media_type,
  privacy post_privacy,
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
    SELECT CASE 
      WHEN fr.sender_id = user_id_param THEN fr.receiver_id
      ELSE fr.sender_id
    END AS friend_id
    FROM friend_requests fr
    WHERE (fr.sender_id = user_id_param OR fr.receiver_id = user_id_param)
    AND fr.status = 'accepted'
  ),
  -- Affinités utilisateur
  user_affinities AS (
    SELECT target_user_id, affinity_score
    FROM user_affinity
    WHERE user_id = user_id_param
  ),
  -- Préférences de contenu
  content_prefs AS (
    SELECT content_type, preference_score
    FROM user_content_preferences
    WHERE user_id = user_id_param
  ),
  -- Posts avec métriques et scoring
  scored_posts AS (
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
      COALESCE(l.like_count, 0) as likes_count,
      COALESCE(c.comment_count, 0) as comments_count,
      COALESCE(p.share_count, 0) as shares_count,
      COALESCE(v.view_count, 0) as views_count,
      EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND likes.user_id = user_id_param) as user_liked,
      
      -- SCORE DE PERTINENCE (Relevance Score)
      (
        -- 1. Score social (relation avec l'auteur)
        CASE 
          WHEN p.user_id = user_id_param THEN 100 -- Propres posts
          WHEN EXISTS(SELECT 1 FROM user_friends WHERE friend_id = p.user_id) THEN 80 -- Amis
          WHEN EXISTS(SELECT 1 FROM user_affinities WHERE target_user_id = p.user_id) 
            THEN 50 + (SELECT affinity_score FROM user_affinities WHERE target_user_id = p.user_id LIMIT 1) * 5
          ELSE 20 -- Autres
        END +
        
        -- 2. Score de fraîcheur (recency)
        CASE 
          WHEN p.created_at > NOW() - INTERVAL '30 minutes' THEN 150
          WHEN p.created_at > NOW() - INTERVAL '2 hours' THEN 100
          WHEN p.created_at > NOW() - INTERVAL '6 hours' THEN 70
          WHEN p.created_at > NOW() - INTERVAL '24 hours' THEN 40
          WHEN p.created_at > NOW() - INTERVAL '3 days' THEN 20
          WHEN p.created_at > NOW() - INTERVAL '7 days' THEN 10
          ELSE 5
        END +
        
        -- 3. Score de popularité
        (COALESCE(l.like_count, 0) * 2 + 
         COALESCE(c.comment_count, 0) * 4 + 
         COALESCE(p.share_count, 0) * 6) +
        
        -- 4. Score de type de contenu préféré
        CASE p.media_type
          WHEN 'video' THEN COALESCE((SELECT preference_score FROM content_prefs WHERE content_type = 'video'), 1.0) * 30
          WHEN 'image' THEN COALESCE((SELECT preference_score FROM content_prefs WHERE content_type = 'image'), 1.0) * 20
          ELSE COALESCE((SELECT preference_score FROM content_prefs WHERE content_type = 'text'), 1.0) * 10
        END +
        
        -- 5. Bonus pour posts avec média
        CASE WHEN p.media_url IS NOT NULL THEN 25 ELSE 0 END
        
      )::NUMERIC as relevance_score,
      
      -- PRÉDICTION D'ENGAGEMENT (Engagement Prediction)
      (
        -- Probabilité de like (basée sur historique)
        CASE 
          WHEN EXISTS(SELECT 1 FROM user_engagement_signals 
                     WHERE user_id = user_id_param 
                     AND signal_type = 'like' 
                     AND created_at > NOW() - INTERVAL '30 days') THEN 0.6
          ELSE 0.3
        END * 100 +
        
        -- Probabilité de commentaire
        CASE 
          WHEN EXISTS(SELECT 1 FROM user_engagement_signals 
                     WHERE user_id = user_id_param 
                     AND signal_type = 'comment' 
                     AND created_at > NOW() - INTERVAL '30 days') THEN 0.4
          ELSE 0.2
        END * 100 +
        
        -- Probabilité de partage
        CASE 
          WHEN EXISTS(SELECT 1 FROM user_engagement_signals 
                     WHERE user_id = user_id_param 
                     AND signal_type = 'share' 
                     AND created_at > NOW() - INTERVAL '30 days') THEN 0.3
          ELSE 0.15
        END * 100 +
        
        -- Bonus si l'utilisateur a déjà interagi avec cet auteur
        CASE 
          WHEN EXISTS(SELECT 1 FROM user_affinities WHERE target_user_id = p.user_id)
            THEN 50
          ELSE 0
        END
        
      )::NUMERIC as engagement_prediction
      
    FROM posts p
    JOIN profiles prof ON prof.id = p.user_id
    LEFT JOIN (
      SELECT post_id, COUNT(*) as like_count 
      FROM likes 
      GROUP BY post_id
    ) l ON l.post_id = p.id
    LEFT JOIN (
      SELECT post_id, COUNT(*) as comment_count 
      FROM comments 
      GROUP BY post_id
    ) c ON c.post_id = p.id
    LEFT JOIN (
      SELECT post_id, COUNT(*) as view_count 
      FROM post_views 
      GROUP BY post_id
    ) v ON v.post_id = p.id
    WHERE 
      (p.privacy = 'public' OR p.user_id = user_id_param OR
       (p.privacy = 'friends' AND EXISTS(SELECT 1 FROM user_friends WHERE friend_id = p.user_id)))
      AND (
        filter_type = 'recommended' OR
        (filter_type = 'recent' AND p.created_at > NOW() - INTERVAL '24 hours') OR
        (filter_type = 'friends' AND EXISTS(SELECT 1 FROM user_friends WHERE friend_id = p.user_id))
      )
  )
  SELECT 
    sp.*,
    -- SCORE FINAL (combinaison pertinence + prédiction d'engagement)
    (sp.relevance_score * 0.6 + sp.engagement_prediction * 0.4)::NUMERIC as final_score
  FROM scored_posts sp
  ORDER BY 
    CASE 
      WHEN filter_type = 'recent' THEN EXTRACT(EPOCH FROM sp.created_at)
      ELSE (sp.relevance_score * 0.6 + sp.engagement_prediction * 0.4)
    END DESC
  LIMIT limit_param
  OFFSET offset_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fonction pour enregistrer un signal d'engagement
CREATE OR REPLACE FUNCTION record_engagement_signal(
  p_user_id UUID,
  p_post_id UUID,
  p_signal_type TEXT,
  p_signal_value NUMERIC DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_engagement_signals (user_id, post_id, signal_type, signal_value)
  VALUES (p_user_id, p_post_id, p_signal_type, p_signal_value)
  ON CONFLICT (user_id, post_id, signal_type, created_at) DO NOTHING;
  
  -- Mettre à jour les préférences de contenu
  IF p_signal_type IN ('like', 'comment', 'share') THEN
    WITH post_info AS (
      SELECT 
        CASE 
          WHEN media_type = 'video' THEN 'video'
          WHEN media_type = 'image' THEN 'image'
          ELSE 'text'
        END as content_type
      FROM posts
      WHERE id = p_post_id
    )
    INSERT INTO user_content_preferences (user_id, content_type, preference_score)
    SELECT p_user_id, pi.content_type, 1.1
    FROM post_info pi
    ON CONFLICT (user_id, content_type) 
    DO UPDATE SET 
      preference_score = user_content_preferences.preference_score * 1.05,
      updated_at = now();
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;