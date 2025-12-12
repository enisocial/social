-- Utiliser un verrou pour garantir l'atomicité de force_reset_unread_count
CREATE OR REPLACE FUNCTION force_reset_unread_count(p_user_id uuid, p_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verrouiller la ligne conversation_participants pour éviter les race conditions
  PERFORM * FROM conversation_participants
  WHERE user_id = p_user_id AND conversation_id = p_conversation_id
  FOR UPDATE;

  -- Forcer le compteur à zéro IMMÉDIATEMENT
  UPDATE conversation_participants
  SET unread_count = 0,
      last_read_at = now()
  WHERE user_id = p_user_id
    AND conversation_id = p_conversation_id;

  -- Marquer tous les messages comme lus
  -- Le trigger vérifiera que le compteur est déjà à 0 et ne fera rien
  UPDATE message_status
  SET read_at = now()
  WHERE user_id = p_user_id
    AND message_id IN (
      SELECT id FROM messages WHERE conversation_id = p_conversation_id
    )
    AND read_at IS NULL;
END;
$$;