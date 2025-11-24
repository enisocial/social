-- Fix the unread count calculation trigger to properly handle message_status records
CREATE OR REPLACE FUNCTION update_conversation_unread_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_conversation_id uuid;
  v_participant_user_id uuid;
  v_new_unread_count bigint;
BEGIN
  -- Get conversation_id and user_id from the message_status record
  SELECT m.conversation_id, ms.user_id 
  INTO v_conversation_id, v_participant_user_id
  FROM message_status ms
  JOIN messages m ON m.id = ms.message_id
  WHERE ms.id = NEW.id;

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

-- Also update the force_reset function to ensure it triggers the counter update properly
CREATE OR REPLACE FUNCTION force_reset_unread_count(p_user_id uuid, p_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_unread_count bigint;
BEGIN
  -- Mark all unread messages as read
  UPDATE message_status
  SET read_at = now()
  WHERE user_id = p_user_id
    AND message_id IN (
      SELECT id FROM messages WHERE conversation_id = p_conversation_id
    )
    AND read_at IS NULL;

  -- Recalculate the exact unread count (should be 0 now)
  SELECT COUNT(DISTINCT m.id)
  INTO v_unread_count
  FROM messages m
  LEFT JOIN message_status ms ON ms.message_id = m.id AND ms.user_id = p_user_id
  WHERE m.conversation_id = p_conversation_id
    AND m.sender_id != p_user_id
    AND (ms.id IS NULL OR ms.read_at IS NULL);

  -- Force set the counter to the calculated value
  UPDATE conversation_participants
  SET unread_count = v_unread_count,
      last_read_at = now()
  WHERE user_id = p_user_id
    AND conversation_id = p_conversation_id;
END;
$$;