
-- Drop the old function if it exists
DROP FUNCTION IF EXISTS get_friend_unread_counts(uuid);

-- Create improved function to count unread messages from friends
CREATE OR REPLACE FUNCTION get_friend_unread_counts(p_user_id uuid)
RETURNS TABLE (friend_id uuid, unread_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN fr.sender_id = p_user_id THEN fr.receiver_id
      ELSE fr.sender_id
    END as friend_id,
    COUNT(DISTINCT m.id)::bigint as unread_count
  FROM friend_requests fr
  CROSS JOIN LATERAL (
    SELECT cp.conversation_id
    FROM conversation_participants cp
    WHERE cp.user_id = p_user_id
  ) my_convs
  CROSS JOIN LATERAL (
    SELECT cp2.conversation_id
    FROM conversation_participants cp2
    WHERE cp2.user_id = CASE 
      WHEN fr.sender_id = p_user_id THEN fr.receiver_id
      ELSE fr.sender_id
    END
    AND cp2.conversation_id = my_convs.conversation_id
  ) friend_convs
  LEFT JOIN messages m ON m.conversation_id = friend_convs.conversation_id
    AND m.sender_id != p_user_id
  LEFT JOIN message_status ms ON ms.message_id = m.id 
    AND ms.user_id = p_user_id
    AND ms.read_at IS NOT NULL
  WHERE fr.status = 'accepted'
    AND (fr.sender_id = p_user_id OR fr.receiver_id = p_user_id)
    AND ms.message_id IS NULL
    AND m.id IS NOT NULL
  GROUP BY friend_id;
END;
$$;

-- Create function to mark messages as read and update counters
CREATE OR REPLACE FUNCTION mark_messages_as_read(p_user_id uuid, p_message_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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
  UPDATE conversation_participants
  SET unread_count = (
    SELECT COUNT(DISTINCT m.id)
    FROM messages m
    LEFT JOIN message_status ms ON ms.message_id = m.id AND ms.user_id = p_user_id
    WHERE m.conversation_id = v_conversation_id
      AND m.sender_id != p_user_id
      AND (ms.read_at IS NULL OR ms.message_id IS NULL)
  )
  WHERE user_id = p_user_id
    AND conversation_id = v_conversation_id;
END;
$$;

-- Create trigger to auto-update unread count on new messages
CREATE OR REPLACE FUNCTION update_unread_count_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Increment unread count for all participants except the sender
  UPDATE conversation_participants
  SET unread_count = unread_count + 1
  WHERE conversation_id = NEW.conversation_id
    AND user_id != NEW.sender_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_unread_count ON messages;
CREATE TRIGGER trigger_update_unread_count
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_unread_count_on_insert();
