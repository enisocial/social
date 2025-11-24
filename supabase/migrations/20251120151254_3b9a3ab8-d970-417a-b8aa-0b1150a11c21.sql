-- Modifier le trigger pour ne pas recalculer si le compteur est déjà à 0
CREATE OR REPLACE FUNCTION update_conversation_unread_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_conversation_id uuid;
  v_participant_user_id uuid;
  v_current_unread_count bigint;
  v_new_unread_count bigint;
BEGIN
  -- Get conversation_id and user_id from the message_status record
  SELECT m.conversation_id, ms.user_id 
  INTO v_conversation_id, v_participant_user_id
  FROM message_status ms
  JOIN messages m ON m.id = ms.message_id
  WHERE ms.id = NEW.id;

  -- Check current unread count
  SELECT unread_count INTO v_current_unread_count
  FROM conversation_participants
  WHERE user_id = v_participant_user_id
    AND conversation_id = v_conversation_id;

  -- Si le compteur est déjà à 0, ne rien faire (évite les recalculs inutiles)
  IF v_current_unread_count = 0 THEN
    RETURN NEW;
  END IF;

  -- Calculate new unread count for this user in this conversation
  -- Count messages that either have no message_status OR have message_status with read_at IS NULL
  SELECT COUNT(DISTINCT m.id)
  INTO v_new_unread_count
  FROM messages m
  LEFT JOIN message_status ms ON ms.message_id = m.id AND ms.user_id = v_participant_user_id
  WHERE m.conversation_id = v_conversation_id
    AND m.sender_id != v_participant_user_id
    AND (ms.id IS NULL OR ms.read_at IS NULL);

  -- Update the conversation_participants unread_count
  UPDATE conversation_participants
  SET unread_count = v_new_unread_count,
      last_read_at = CASE WHEN NEW.read_at IS NOT NULL THEN NEW.read_at ELSE last_read_at END
  WHERE user_id = v_participant_user_id
    AND conversation_id = v_conversation_id;

  RETURN NEW;
END;
$$;