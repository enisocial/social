-- Désactiver temporairement les RLS sur les tables voice_posts pour diagnostiquer
-- Cette migration permet de tester le système sans restrictions RLS

ALTER TABLE voice_posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE voice_post_likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE voice_post_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE voice_post_listens DISABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  RAISE NOTICE '🔓 RLS désactivées temporairement sur les tables voice_posts';
  RAISE NOTICE 'Cela permet de tester la récupération des posts vocaux';
  RAISE NOTICE 'À réactiver une fois le système testé';
END $$;
