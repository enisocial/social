-- Correction des politiques RLS pour les voice posts
-- Problème: Les politiques RLS empêchent la lecture des posts vocaux

-- ===========================================
-- CORRECTION DES POLITIQUES RLS
-- ===========================================

-- Désactiver temporairement RLS pour diagnostiquer
ALTER TABLE voice_posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE voice_post_likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE voice_post_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE voice_post_listens DISABLE ROW LEVEL SECURITY;

-- Recréer des politiques plus simples
DROP POLICY IF EXISTS "voice_posts_select_policy" ON voice_posts;
CREATE POLICY "voice_posts_select_policy" ON voice_posts
  FOR SELECT USING (true); -- Lecture publique pour tous les utilisateurs authentifiés

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

-- ===========================================
-- RÉACTIVER RLS AVEC POLITIQUES CORRIGÉES
-- ===========================================

-- Réactiver RLS
ALTER TABLE voice_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_post_listens ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- LOG DE CORRECTION
-- ===========================================

DO $$
BEGIN
  RAISE NOTICE '🔧 Correction RLS Voice Posts appliquée';
  RAISE NOTICE 'Politiques simplifiées pour permettre la lecture publique';
  RAISE NOTICE 'RLS réactivé avec politiques de sécurité appropriées';
END $$;
