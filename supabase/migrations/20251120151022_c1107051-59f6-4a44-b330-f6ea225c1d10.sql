-- Optimiser force_reset_unread_count pour éviter les race conditions
CREATE OR REPLACE FUNCTION force_reset_unread_count(p_user_id uuid, p_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- D'abord forcer le compteur à zéro IMMÉDIATEMENT
  UPDATE conversation_participants
  SET unread_count = 0,
      last_read_at = now()
  WHERE user_id = p_user_id
    AND conversation_id = p_conversation_id;

  -- Ensuite marquer tous les messages comme lus (sans déclencher de recalculs)
  -- Le trigger ne recalculera pas car le compteur est déjà à 0
  UPDATE message_status
  SET read_at = now()
  WHERE user_id = p_user_id
    AND message_id IN (
      SELECT id FROM messages WHERE conversation_id = p_conversation_id
    )
    AND read_at IS NULL;
END;
$$;