-- Réactivation des RLS avec politiques appropriées pour la sécurité
-- Maintenant que nous avons confirmé que le système fonctionne

-- Réactiver les RLS
ALTER TABLE voice_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_post_listens ENABLE ROW LEVEL SECURITY;

-- Politiques pour voice_posts : lecture publique, écriture par propriétaire
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

-- Politiques pour likes
DROP POLICY IF EXISTS "voice_post_likes_select_policy" ON voice_post_likes;
CREATE POLICY "voice_post_likes_select_policy" ON voice_post_likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "voice_post_likes_insert_policy" ON voice_post_likes;
CREATE POLICY "voice_post_likes_insert_policy" ON voice_post_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "voice_post_likes_delete_policy" ON voice_post_likes;
CREATE POLICY "voice_post_likes_delete_policy" ON voice_post_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Politiques pour commentaires
DROP POLICY IF EXISTS "voice_post_comments_select_policy" ON voice_post_comments;
CREATE POLICY "voice_post_comments_select_policy" ON voice_post_comments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "voice_post_comments_insert_policy" ON voice_post_comments;
CREATE POLICY "voice_post_comments_insert_policy" ON voice_post_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "voice_post_comments_update_policy" ON voice_post_comments;
CREATE POLICY "voice_post_comments_update_policy" ON voice_post_comments
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "voice_post_comments_delete_policy" ON voice_post_comments;
CREATE POLICY "voice_post_comments_delete_policy" ON voice_post_comments
  FOR DELETE USING (auth.uid() = user_id);

-- Politiques pour écoutes
DROP POLICY IF EXISTS "voice_post_listens_select_policy" ON voice_post_listens;
CREATE POLICY "voice_post_listens_select_policy" ON voice_post_listens
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "voice_post_listens_insert_policy" ON voice_post_listens;
CREATE POLICY "voice_post_listens_insert_policy" ON voice_post_listens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DO $$
BEGIN
  RAISE NOTICE '🔒 RLS réactivées avec politiques de sécurité appropriées';
  RAISE NOTICE 'Lecture publique autorisée, écriture sécurisée par propriétaire';
  RAISE NOTICE 'Système prêt pour la production';
END $$;
