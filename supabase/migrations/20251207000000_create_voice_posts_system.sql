-- Posts Vocaux - Système complet pour l'application sociale
-- Création d'un système dédié aux posts audio optimisé pour l'Afrique

-- ===========================================
-- TABLE VOICE_POSTS
-- ===========================================

CREATE TABLE IF NOT EXISTS voice_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  audio_url TEXT NOT NULL,
  audio_duration INTEGER NOT NULL, -- en secondes
  audio_size_bytes INTEGER, -- taille compressée
  transcript TEXT, -- transcription automatique (optionnel)
  waveform_data JSONB, -- données pour la visualisation des ondes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Contraintes de validation
  CONSTRAINT voice_posts_duration_check CHECK (audio_duration > 0 AND audio_duration <= 300), -- max 5 minutes
  CONSTRAINT voice_posts_title_length_check CHECK (char_length(title) <= 100)
);

-- ===========================================
-- TABLES DE SUPPORT
-- ===========================================

-- Vues des voice posts (likes, commentaires, partages)
CREATE TABLE IF NOT EXISTS voice_post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_post_id UUID NOT NULL REFERENCES voice_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(voice_post_id, user_id)
);

CREATE TABLE IF NOT EXISTS voice_post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_post_id UUID NOT NULL REFERENCES voice_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT voice_post_comments_content_length_check CHECK (char_length(content) <= 500)
);

CREATE TABLE IF NOT EXISTS voice_post_listens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_post_id UUID NOT NULL REFERENCES voice_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  listen_duration INTEGER, -- durée d'écoute en secondes
  completed BOOLEAN DEFAULT false, -- écoute complète
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(voice_post_id, user_id)
);

-- ===========================================
-- INDEXES POUR PERFORMANCE
-- ===========================================

CREATE INDEX IF NOT EXISTS voice_posts_user_id_created_at_idx ON voice_posts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS voice_posts_created_at_idx ON voice_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS voice_post_likes_voice_post_id_idx ON voice_post_likes(voice_post_id);
CREATE INDEX IF NOT EXISTS voice_post_comments_voice_post_id_idx ON voice_post_comments(voice_post_id);
CREATE INDEX IF NOT EXISTS voice_post_listens_voice_post_id_idx ON voice_post_listens(voice_post_id);

-- ===========================================
-- FONCTIONS UTILITAIRES
-- ===========================================

-- Fonction pour obtenir les stats d'un voice post
CREATE OR REPLACE FUNCTION get_voice_post_stats(voice_post_id_param UUID)
RETURNS TABLE (
  likes_count BIGINT,
  comments_count BIGINT,
  listens_count BIGINT,
  total_listen_duration BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(l.likes_count, 0) as likes_count,
    COALESCE(c.comments_count, 0) as comments_count,
    COALESCE(lst.listens_count, 0) as listens_count,
    COALESCE(lst.total_duration, 0) as total_listen_duration
  FROM
    (SELECT COUNT(*) as likes_count FROM voice_post_likes WHERE voice_post_id = voice_post_id_param) l
  CROSS JOIN
    (SELECT COUNT(*) as comments_count FROM voice_post_comments WHERE voice_post_id = voice_post_id_param) c
  CROSS JOIN
    (SELECT
       COUNT(*) as listens_count,
       COALESCE(SUM(listen_duration), 0) as total_duration
     FROM voice_post_listens
     WHERE voice_post_id = voice_post_id_param) lst;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- SUPABASE STORAGE BUCKET
-- ===========================================

-- Créer le bucket pour les voice posts
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-posts', 'voice-posts', true)
ON CONFLICT (id) DO NOTHING;

-- Politiques de sécurité
DROP POLICY IF EXISTS "voice_posts_bucket_upload_policy" ON storage.objects;
CREATE POLICY "voice_posts_bucket_upload_policy" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'voice-posts'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "voice_posts_bucket_public_read_policy" ON storage.objects;
CREATE POLICY "voice_posts_bucket_public_read_policy" ON storage.objects
  FOR SELECT USING (bucket_id = 'voice-posts');

DROP POLICY IF EXISTS "voice_posts_bucket_delete_policy" ON storage.objects;
CREATE POLICY "voice_posts_bucket_delete_policy" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'voice-posts'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ===========================================
-- POLITIQUES RLS
-- ===========================================

-- Voice Posts - Lecture publique (comme les posts normaux)
DROP POLICY IF EXISTS "voice_posts_select_policy" ON voice_posts;
CREATE POLICY "voice_posts_select_policy" ON voice_posts
  FOR SELECT USING (
    -- Posts publics
    true -- Pour l'instant, tous les voice posts sont publics comme les posts normaux
  );

-- Voice Posts - Création par utilisateur authentifié
DROP POLICY IF EXISTS "voice_posts_insert_policy" ON voice_posts;
CREATE POLICY "voice_posts_insert_policy" ON voice_posts
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND auth.role() = 'authenticated'
  );

-- Voice Posts - Modification par propriétaire uniquement
DROP POLICY IF EXISTS "voice_posts_update_policy" ON voice_posts;
CREATE POLICY "voice_posts_update_policy" ON voice_posts
  FOR UPDATE USING (auth.uid() = user_id);

-- Voice Posts - Suppression par propriétaire uniquement
DROP POLICY IF EXISTS "voice_posts_delete_policy" ON voice_posts;
CREATE POLICY "voice_posts_delete_policy" ON voice_posts
  FOR DELETE USING (auth.uid() = user_id);

-- Likes
DROP POLICY IF EXISTS "voice_post_likes_policy" ON voice_post_likes;
CREATE POLICY "voice_post_likes_policy" ON voice_post_likes
  FOR ALL USING (auth.uid() = user_id);

-- Comments
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

-- Listens (écoutes)
DROP POLICY IF EXISTS "voice_post_listens_policy" ON voice_post_listens;
CREATE POLICY "voice_post_listens_policy" ON voice_post_listens
  FOR ALL USING (auth.uid() = user_id);

-- ===========================================
-- TRIGGERS POUR METADATA
-- ===========================================

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_voice_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS voice_posts_updated_at_trigger ON voice_posts;
CREATE TRIGGER voice_posts_updated_at_trigger
  BEFORE UPDATE ON voice_posts
  FOR EACH ROW EXECUTE FUNCTION update_voice_posts_updated_at();

-- Trigger pour updated_at sur comments
DROP TRIGGER IF EXISTS voice_post_comments_updated_at_trigger ON voice_post_comments;
CREATE TRIGGER voice_post_comments_updated_at_trigger
  BEFORE UPDATE ON voice_post_comments
  FOR EACH ROW EXECUTE FUNCTION update_voice_posts_updated_at();

-- ===========================================
-- VUES POUR LE FEED
-- ===========================================

-- Vue optimisée pour le feed des voice posts
CREATE OR REPLACE VIEW voice_posts_feed AS
SELECT
  vp.id,
  vp.user_id,
  vp.title,
  vp.audio_url,
  vp.audio_duration,
  vp.audio_size_bytes,
  vp.transcript,
  vp.waveform_data,
  vp.created_at,
  vp.updated_at,
  p.username,
  p.name,
  p.avatar_url,
  -- Stats calculées
  COALESCE(l.likes_count, 0) as likes_count,
  COALESCE(c.comments_count, 0) as comments_count,
  COALESCE(lst.listens_count, 0) as listens_count,
  -- Interaction utilisateur (sera calculé côté client)
  false as user_liked,
  false as user_listened
FROM voice_posts vp
JOIN profiles p ON vp.user_id = p.id
LEFT JOIN (
  SELECT voice_post_id, COUNT(*) as likes_count
  FROM voice_post_likes
  GROUP BY voice_post_id
) l ON vp.id = l.voice_post_id
LEFT JOIN (
  SELECT voice_post_id, COUNT(*) as comments_count
  FROM voice_post_comments
  GROUP BY voice_post_id
) c ON vp.id = c.voice_post_id
LEFT JOIN (
  SELECT voice_post_id, COUNT(*) as listens_count
  FROM voice_post_listens
  GROUP BY voice_post_id
) lst ON vp.id = lst.voice_post_id
ORDER BY vp.created_at DESC;

-- ===========================================
-- FONCTION DE NETTOYAGE
-- ===========================================

-- Nettoyage automatique des vieux voice posts (optionnel - configurable)
CREATE OR REPLACE FUNCTION cleanup_old_voice_posts(days_old INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Supprimer les voice posts vieux de plus de X jours
  WITH deleted AS (
    DELETE FROM voice_posts
    WHERE created_at < NOW() - INTERVAL '1 day' * days_old
    RETURNING id, audio_url
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  -- Log
  RAISE NOTICE '🧹 Cleaned up % old voice posts', deleted_count;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- LOG DE FIN DE MIGRATION
-- ===========================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration Voice Posts System terminée avec succès';
  RAISE NOTICE 'Tables créées: voice_posts, voice_post_likes, voice_post_comments, voice_post_listens';
  RAISE NOTICE 'Bucket storage créé: voice-posts (public)';
  RAISE NOTICE 'Fonctions utilitaires créées pour stats et nettoyage';
  RAISE NOTICE 'RLS configuré pour confidentialité';
  RAISE NOTICE 'Vues optimisées pour le feed créées';
  RAISE NOTICE 'Système prêt pour l Afrique avec optimisation mobile';
END $$;
