
-- Compléter la migration : créer le trigger et la fonction utilitaire manquants

-- 1. Créer le trigger d'auto-incrémentation
DROP TRIGGER IF EXISTS trigger_increment_unread ON messages;

CREATE TRIGGER trigger_increment_unread
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION increment_conversation_unread_count();

-- 2. Créer la fonction utilitaire pour le total
CREATE OR REPLACE FUNCTION get_total_unread_for_user(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(unread_count), 0)::INTEGER
  FROM conversation_participants
  WHERE user_id = p_user_id;
$$;

-- 3. Ajouter les commentaires
COMMENT ON FUNCTION increment_conversation_unread_count() IS 
  'Auto-incrémente unread_count pour tous les participants sauf expéditeur lors de nouveau message';
COMMENT ON FUNCTION force_reset_unread_count(UUID, UUID) IS 
  'Reset unread_count à 0 avec lock pour éviter race conditions';
COMMENT ON FUNCTION get_total_unread_for_user(UUID) IS 
  'Retourne le total de messages non lus pour un utilisateur';
