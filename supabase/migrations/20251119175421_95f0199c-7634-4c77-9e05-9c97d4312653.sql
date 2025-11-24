-- Create/update trigger for conversation timestamp updates
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  UPDATE conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS on_message_insert_update_conversation ON messages;
DROP TRIGGER IF EXISTS on_message_insert_notify ON messages;
DROP TRIGGER IF EXISTS update_conversation_timestamp ON messages;

-- Create trigger for conversation updates
CREATE TRIGGER on_message_insert_update_conversation
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_timestamp();

-- Create trigger for message notifications
CREATE TRIGGER on_message_insert_notify
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION notify_new_message();