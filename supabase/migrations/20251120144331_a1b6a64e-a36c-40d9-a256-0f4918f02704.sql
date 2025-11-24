-- Create trigger to automatically update conversation_participants.unread_count when message_status changes
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
  SELECT COUNT(DISTINCT m.id)
  INTO v_new_unread_count
  FROM messages m
  LEFT JOIN message_status ms ON ms.message_id = m.id AND ms.user_id = v_participant_user_id
  WHERE m.conversation_id = v_conversation_id
    AND m.sender_id != v_participant_user_id
    AND ms.read_at IS NULL;

  -- Update the conversation_participants unread_count
  UPDATE conversation_participants
  SET unread_count = v_new_unread_count,
      last_read_at = CASE WHEN NEW.read_at IS NOT NULL THEN NEW.read_at ELSE last_read_at END
  WHERE user_id = v_participant_user_id
    AND conversation_id = v_conversation_id;

  RETURN NEW;
END;
$$;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS message_status_update_unread_count ON message_status;

-- Create trigger that fires after message_status is updated
CREATE TRIGGER message_status_update_unread_count
AFTER UPDATE OF read_at ON message_status
FOR EACH ROW
WHEN (OLD.read_at IS NULL AND NEW.read_at IS NOT NULL)
EXECUTE FUNCTION update_conversation_unread_count();