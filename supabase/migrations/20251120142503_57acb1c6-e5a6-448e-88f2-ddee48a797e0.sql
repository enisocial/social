
-- Fix the mark_messages_as_read function to correctly calculate unread count
CREATE OR REPLACE FUNCTION mark_messages_as_read(p_user_id uuid, p_message_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_conversation_id uuid;
BEGIN
  -- Get the conversation_id from the first message
  SELECT conversation_id INTO v_conversation_id
  FROM messages
  WHERE id = p_message_ids[1];

  -- Update message_status to mark as read
  UPDATE message_status
  SET read_at = now()
  WHERE user_id = p_user_id
    AND message_id = ANY(p_message_ids)
    AND read_at IS NULL;

  -- Update conversation_participants unread_count
  -- Count messages that don't have a read_at status
  UPDATE conversation_participants
  SET unread_count = (
    SELECT COUNT(DISTINCT m.id)
    FROM messages m
    LEFT JOIN message_status ms ON ms.message_id = m.id AND ms.user_id = p_user_id
    WHERE m.conversation_id = v_conversation_id
      AND m.sender_id != p_user_id
      AND (ms.read_at IS NULL)
  )
  WHERE user_id = p_user_id
    AND conversation_id = v_conversation_id;
END;
$$;
