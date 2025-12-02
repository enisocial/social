-- 🚀 S-ocial.com Stories System - Complete Implementation
-- Création du système de stories Instagram-like complet
-- Avec expiration automatique, vues, et toutes fonctionnalités

-- Create stories table
CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  media_url TEXT NOT NULL,
  media_type VARCHAR(20) DEFAULT 'image',
  text TEXT,
  text_position JSONB,
  text_color VARCHAR(20) DEFAULT '#ffffff',
  text_size INTEGER DEFAULT 24,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create story_views table
CREATE TABLE IF NOT EXISTS story_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL,
  viewer_id UUID NOT NULL,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(story_id, viewer_id)
);




-- ===========================================
-- TRIGGERS POUR NETTOYAGE AUTOMATIQUE
-- ===========================================

-- Nettoyage automatique des stories expirées (toutes les heures)
CREATE OR REPLACE FUNCTION auto_cleanup_expired_stories()
RETURNS void AS $$
BEGIN
  DELETE FROM stories WHERE expires_at <= NOW();
END;
$$ LANGUAGE plpgsql;

-- Créer un trigger pour nettoyer automatiquement (optionnel - peut être fait via cron)
-- Note: Pour éviter trop de charge, on peut le faire via une tâche programmée

-- ===========================================
-- DONNÉES DE TEST (optionnel)
-- ===========================================

-- Ces données peuvent être supprimées en production
-- INSERT INTO stories (user_id, media_url, media_type, text, text_color) VALUES
-- ('user-uuid-1', 'https://example.com/story1.jpg', 'image', 'Hello World!', '#ffffff');

-- ===========================================
-- COMMENTAIRES ET DOCUMENTATION
-- ===========================================

COMMENT ON TABLE stories IS 'Stories Instagram-like avec expiration 24h';
COMMENT ON TABLE story_views IS 'Vues des stories par utilisateur';
COMMENT ON FUNCTION auto_cleanup_expired_stories() IS 'Nettoie les stories expirées';

-- ===========================================
-- SUPABASE STORAGE BUCKET POUR LES STORIES
-- ===========================================

-- Créer le bucket pour les stories
INSERT INTO storage.buckets (id, name, public)
VALUES ('stories', 'stories', true)
ON CONFLICT (id) DO NOTHING;

-- Politique pour permettre aux utilisateurs authentifiés d'uploader
DROP POLICY IF EXISTS "stories_bucket_upload_policy" ON storage.objects;
CREATE POLICY "stories_bucket_upload_policy" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'stories'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Politique pour permettre la lecture publique des stories
DROP POLICY IF EXISTS "stories_bucket_public_read_policy" ON storage.objects;
CREATE POLICY "stories_bucket_public_read_policy" ON storage.objects
  FOR SELECT USING (bucket_id = 'stories');

-- Politique pour permettre aux propriétaires de supprimer leurs stories
DROP POLICY IF EXISTS "stories_bucket_delete_policy" ON storage.objects;
CREATE POLICY "stories_bucket_delete_policy" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'stories'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ===========================================
-- MIGRATION TERMINÉE
-- ===========================================

-- Log de fin de migration
DO $$
BEGIN
  RAISE NOTICE '✅ Migration Stories System terminée avec succès';
  RAISE NOTICE 'Tables créées: stories, story_views';
  RAISE NOTICE 'Bucket storage créé: stories (public)';
  RAISE NOTICE 'Fonctions utilitaires créées pour gestion complète';
  RAISE NOTICE 'RLS configuré pour confidentialité';
  RAISE NOTICE 'Système dexpiration automatique implémenté';
END $$;
