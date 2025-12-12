-- Ajout du système d'expiration des stories (24 heures)
-- Les stories expirent automatiquement après 24 heures

-- ===========================================
-- AJOUT DU CHAMP D'EXPIRATION
-- ===========================================

-- Ajouter le champ expires_at à la table stories
ALTER TABLE stories ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Définir l'expiration par défaut à 24 heures pour les nouvelles stories
UPDATE stories SET expires_at = created_at + INTERVAL '24 hours' WHERE expires_at IS NULL;
ALTER TABLE stories ALTER COLUMN expires_at SET DEFAULT (NOW() + INTERVAL '24 hours');
ALTER TABLE stories ALTER COLUMN expires_at SET NOT NULL;

-- ===========================================
-- INDEX POUR PERFORMANCE
-- ===========================================

-- Index pour filtrer rapidement les stories expirées
CREATE INDEX IF NOT EXISTS stories_expires_at_idx ON stories(expires_at);

-- ===========================================
-- FONCTION DE NETTOYAGE DES STORIES EXPIRÉES
-- ===========================================

CREATE OR REPLACE FUNCTION cleanup_expired_stories()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Supprimer les stories expirées
  WITH deleted AS (
    DELETE FROM stories
    WHERE expires_at < NOW()
    RETURNING id, media_url
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  -- Log
  RAISE NOTICE '🧹 Cleaned up % expired stories', deleted_count;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- TRIGGER POUR LES NOUVELLES STORIES
-- ===========================================

-- S'assurer que expires_at est toujours défini pour les nouvelles stories
CREATE OR REPLACE FUNCTION set_story_expiration()
RETURNS TRIGGER AS $$
BEGIN
  -- Si expires_at n'est pas défini, le définir à 24 heures
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := NOW() + INTERVAL '24 hours';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger existant s'il existe
DROP TRIGGER IF EXISTS set_story_expiration_trigger ON stories;

-- Créer le trigger
CREATE TRIGGER set_story_expiration_trigger
  BEFORE INSERT ON stories
  FOR EACH ROW EXECUTE FUNCTION set_story_expiration();

-- ===========================================
-- FONCTION PLANIFIÉE DE NETTOYAGE (optionnel)
-- ===========================================

-- Cette fonction peut être appelée manuellement ou via un cron job
-- Pour un nettoyage automatique, configurer un cron job qui appelle cette fonction

CREATE OR REPLACE FUNCTION scheduled_stories_cleanup()
RETURNS TEXT AS $$
DECLARE
  cleaned_count INTEGER;
BEGIN
  -- Nettoyer les stories expirées
  SELECT cleanup_expired_stories() INTO cleaned_count;

  -- Retourner un message de statut
  RETURN format('✅ Nettoyage terminé: %s stories expirées supprimées', cleaned_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- MISE À JOUR DE LA VUE STORIES_FEED
-- ===========================================

-- La vue existante filtre déjà par expiration
-- S'assurer qu'elle utilise le nouveau champ

DROP VIEW IF EXISTS stories_feed;
CREATE OR REPLACE VIEW stories_feed AS
SELECT
  s.id,
  s.user_id,
  s.media_url,
  s.media_type,
  s.caption,
  s.created_at,
  s.updated_at,
  s.expires_at,
  s.location,
  s.privacy,
  p.username,
  p.name,
  p.avatar_url,
  -- Calculer le temps restant avant expiration (en secondes)
  EXTRACT(EPOCH FROM (s.expires_at - NOW())) as time_remaining_seconds,
  -- Stats
  COALESCE(v.views_count, 0) as views_count,
  COALESCE(r.reactions_count, 0) as reactions_count
FROM stories s
JOIN profiles p ON s.user_id = p.id
-- IMPORTANT: Filtrer les stories non expirées
WHERE s.expires_at > NOW()
LEFT JOIN (
  SELECT story_id, COUNT(*) as views_count
  FROM story_views
  GROUP BY story_id
) v ON s.id = v.story_id
LEFT JOIN (
  SELECT story_id, COUNT(*) as reactions_count
  FROM story_reactions
  GROUP BY story_id
) r ON s.id = r.story_id
ORDER BY s.created_at DESC;

-- ===========================================
-- LOG DE MISE À JOUR
-- ===========================================

DO $$
BEGIN
  RAISE NOTICE '⏰ Système d expiration des stories configuré';
  RAISE NOTICE 'Stories expirent après 24 heures';
  RAISE NOTICE 'Nettoyage automatique disponible via scheduled_stories_cleanup()';
  RAISE NOTICE 'Vue stories_feed mise à jour avec filtrage expiration';
END $$;
