-- Créer une fonction qui force la mise à zéro du compteur pour une conversation spécifique
CREATE OR REPLACE FUNCTION force_reset_unread_count(p_user_id uuid, p_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Marquer tous les messages de cette conversation comme lus
  UPDATE message_status
  SET read_at = now()
  WHERE user_id = p_user_id
    AND message_id IN (
      SELECT id FROM messages WHERE conversation_id = p_conversation_id
    )
    AND read_at IS NULL;

  -- Forcer le compteur à zéro
  UPDATE conversation_participants
  SET unread_count = 0,
      last_read_at = now()
  WHERE user_id = p_user_id
    AND conversation_id = p_conversation_id;
END;
$$;