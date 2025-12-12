-- Créer la table pour stocker les vues des posts
CREATE TABLE IF NOT EXISTS post_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  viewer_ip INET,
  user_agent TEXT,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_post_views_post_id ON post_views(post_id);
CREATE INDEX IF NOT EXISTS idx_post_views_user_id ON post_views(user_id);
CREATE INDEX IF NOT EXISTS idx_post_views_viewed_at ON post_views(viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_views_post_user ON post_views(post_id, user_id);

-- Index composite pour éviter les vues dupliquées
CREATE UNIQUE INDEX IF NOT EXISTS idx_post_views_unique_session
ON post_views(post_id, session_id)
WHERE session_id IS NOT NULL;

-- Ajouter la colonne views_count à la table posts
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;

-- Créer une fonction pour mettre à jour le compteur de vues
CREATE OR REPLACE FUNCTION increment_post_views(post_uuid UUID, viewer_uuid UUID DEFAULT NULL, session TEXT DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  -- Insérer la vue (ignore les conflits pour éviter les duplications)
  INSERT INTO post_views (post_id, user_id, session_id)
  VALUES (post_uuid, viewer_uuid, session)
  ON CONFLICT (post_id, session_id) DO NOTHING
  WHERE session_id IS NOT NULL;

  -- Pour les utilisateurs non connectés, on compte par session
  -- Pour les utilisateurs connectés, on compte par utilisateur
  IF viewer_uuid IS NOT NULL THEN
    -- Utilisateur connecté: compter une fois par utilisateur
    SELECT COUNT(DISTINCT user_id) INTO new_count
    FROM post_views
    WHERE post_id = post_uuid AND user_id IS NOT NULL;
  ELSE
    -- Utilisateur non connecté: compter par session unique
    SELECT COUNT(DISTINCT COALESCE(session_id, viewer_ip::TEXT)) INTO new_count
    FROM post_views
    WHERE post_id = post_uuid;
  END IF;

  -- Mettre à jour le compteur dans posts
  UPDATE posts
  SET views_count = new_count
  WHERE id = post_uuid;

  RETURN new_count;
END;
$$;

-- Créer une fonction RPC pour tracker les vues depuis l'application
CREATE OR REPLACE FUNCTION track_post_view(
  post_uuid UUID,
  viewer_uuid UUID DEFAULT NULL,
  session_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  view_count INTEGER;
BEGIN
  -- Appeler la fonction d'incrémentation
  SELECT increment_post_views(post_uuid, viewer_uuid, session_id) INTO view_count;

  -- Retourner les informations de vue
  result := json_build_object(
    'success', true,
    'post_id', post_uuid,
    'views_count', view_count,
    'tracked_at', NOW()
  );

  RETURN result;
END;
$$;

-- Activer RLS sur post_views
ALTER TABLE post_views ENABLE ROW LEVEL SECURITY;

-- Politique RLS: Tout le monde peut insérer des vues
CREATE POLICY "Anyone can track post views" ON post_views
FOR INSERT
WITH CHECK (true);

-- Politique RLS: Les utilisateurs peuvent voir leurs propres vues
CREATE POLICY "Users can view their own post views" ON post_views
FOR SELECT
USING (user_id = auth.uid() OR user_id IS NULL);

-- Mettre à jour les vues existantes (posts sans vues_count)
UPDATE posts
SET views_count = COALESCE((
  SELECT COUNT(*)
  FROM post_views pv
  WHERE pv.post_id = posts.id
), 0)
WHERE views_count IS NULL OR views_count = 0;

-- Créer une vue pour les statistiques de vues
CREATE OR REPLACE VIEW post_view_stats AS
SELECT
  p.id as post_id,
  p.views_count,
  COUNT(pv.id) as total_views,
  COUNT(DISTINCT pv.user_id) as unique_user_views,
  COUNT(DISTINCT CASE WHEN pv.user_id IS NULL THEN pv.session_id ELSE NULL END) as anonymous_views,
  MAX(pv.viewed_at) as last_viewed_at,
  MIN(pv.viewed_at) as first_viewed_at
FROM posts p
LEFT JOIN post_views pv ON p.id = pv.post_id
GROUP BY p.id, p.views_count;

-- Créer un trigger pour mettre à jour automatiquement views_count
CREATE OR REPLACE FUNCTION update_post_views_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Recalculer le compteur de vues pour le post modifié
  UPDATE posts
  SET views_count = (
    SELECT COUNT(DISTINCT COALESCE(pv.user_id::TEXT, pv.session_id, pv.viewer_ip::TEXT))
    FROM post_views pv
    WHERE pv.post_id = COALESCE(NEW.post_id, OLD.post_id)
  )
  WHERE id = COALESCE(NEW.post_id, OLD.post_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_update_post_views_count ON post_views;
CREATE TRIGGER trigger_update_post_views_count
AFTER INSERT OR UPDATE OR DELETE ON post_views
FOR EACH ROW EXECUTE FUNCTION update_post_views_count();
