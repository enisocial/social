-- Create trigger to increment unread count when a new message arrives
CREATE OR REPLACE FUNCTION increment_conversation_unread_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Increment unread_count for all participants except the sender
  UPDATE conversation_participants
  SET unread_count = unread_count + 1
  WHERE conversation_id = NEW.conversation_id
    AND user_id != NEW.sender_id;
    
  RETURN NEW;
END;
$$;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS message_insert_increment_unread ON messages;

-- Create trigger that fires after a new message is inserted
CREATE TRIGGER message_insert_increment_unread
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION increment_conversation_unread_count();

-- Now fix the existing unread counts for all conversations
UPDATE conversation_participants cp
SET unread_count = (
  SELECT COUNT(DISTINCT m.id)
  FROM messages m
  LEFT JOIN message_status ms ON ms.message_id = m.id AND ms.user_id = cp.user_id
  WHERE m.conversation_id = cp.conversation_id
    AND m.sender_id != cp.user_id
    AND (ms.id IS NULL OR ms.read_at IS NULL)
);