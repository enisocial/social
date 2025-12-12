-- NETTOYAGE POUR PRODUCTION
-- Suppression des données de test et sécurisation finale

-- ===========================================
-- SUPPRESSION DES DONNÉES DE TEST
-- ===========================================

-- Supprimer les posts vocaux de test
DELETE FROM voice_post_likes
WHERE voice_post_id IN (
  SELECT id FROM voice_posts
  WHERE title LIKE '%Post vocal de test%' OR title LIKE '%Deuxième message vocal%'
);

DELETE FROM voice_post_listens
WHERE voice_post_id IN (
  SELECT id FROM voice_posts
  WHERE title LIKE '%Post vocal de test%' OR title LIKE '%Deuxième message vocal%'
);

DELETE FROM voice_posts
WHERE title LIKE '%Post vocal de test%' OR title LIKE '%Deuxième message vocal%';

-- ===========================================
-- SÉCURISATION FINALE DES POLITIQUES RLS
-- ===========================================

-- S'assurer que RLS sont activées sur toutes les tables critiques
ALTER TABLE voice_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_post_listens ENABLE ROW LEVEL SECURITY;

ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_reactions ENABLE ROW LEVEL SECURITY;

-- Politiques finales pour posts vocaux
DROP POLICY IF EXISTS "voice_posts_select_policy" ON voice_posts;
CREATE POLICY "voice_posts_select_policy" ON voice_posts
  FOR SELECT USING (true); -- Lecture publique

DROP POLICY IF EXISTS "voice_posts_insert_policy" ON voice_posts;
CREATE POLICY "voice_posts_insert_policy" ON voice_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "voice_posts_update_policy" ON voice_posts;
CREATE POLICY "voice_posts_update_policy" ON voice_posts
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "voice_posts_delete_policy" ON voice_posts;
CREATE POLICY "voice_posts_delete_policy" ON voice_posts
  FOR DELETE USING (auth.uid() = user_id);

-- Politiques pour stories (simplifiées)
DROP POLICY IF EXISTS "stories_select_policy" ON stories;
CREATE POLICY "stories_select_policy" ON stories
  FOR SELECT USING (
    -- Stories de l'utilisateur OU de ses amis (toutes les stories sont privées entre amis)
    user_id = auth.uid()
    OR user_id IN (
      SELECT sender_id FROM friend_requests
      WHERE receiver_id = auth.uid() AND status = 'accepted'
      UNION
      SELECT receiver_id FROM friend_requests
      WHERE sender_id = auth.uid() AND status = 'accepted'
    )
  );

DROP POLICY IF EXISTS "stories_insert_policy" ON stories;
CREATE POLICY "stories_insert_policy" ON stories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "stories_update_policy" ON stories;
CREATE POLICY "stories_update_policy" ON stories
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "stories_delete_policy" ON stories;
CREATE POLICY "stories_delete_policy" ON stories
  FOR DELETE USING (auth.uid() = user_id);

-- ===========================================
-- OPTIMISATIONS FINALES
-- ===========================================

-- Créer un index composite pour les performances
CREATE INDEX IF NOT EXISTS stories_user_expires_idx ON stories(user_id, expires_at);
CREATE INDEX IF NOT EXISTS voice_posts_user_created_idx ON voice_posts(user_id, created_at DESC);

-- ===========================================
-- VÉRIFICATIONS FINALES
-- ===========================================

DO $$
DECLARE
  stories_count INTEGER;
  voice_posts_count INTEGER;
  expired_stories INTEGER;
BEGIN
  SELECT COUNT(*) INTO stories_count FROM stories;
  SELECT COUNT(*) INTO voice_posts_count FROM voice_posts;
  SELECT COUNT(*) INTO expired_stories FROM stories WHERE expires_at < NOW();

  RAISE NOTICE '📊 État final de la base:';
  RAISE NOTICE '📖 Stories actives: %', stories_count - expired_stories;
  RAISE NOTICE '🎵 Posts vocaux: %', voice_posts_count;
  RAISE NOTICE '🗑️  Stories expirées à nettoyer: %', expired_stories;
  RAISE NOTICE '✅ Système prêt pour la production';
END $$;
