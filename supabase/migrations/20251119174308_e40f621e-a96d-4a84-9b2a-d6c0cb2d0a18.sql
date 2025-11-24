-- Fix search_path for the function
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  recipient_id uuid;
  sender_name text;
BEGIN
  -- Get the recipient (the other participant in the conversation)
  SELECT cp.user_id INTO recipient_id
  FROM conversation_participants cp
  WHERE cp.conversation_id = NEW.conversation_id
  AND cp.user_id != NEW.sender_id
  LIMIT 1;

  -- Get sender's name
  SELECT name INTO sender_name
  FROM profiles
  WHERE id = NEW.sender_id;

  -- Insert notification for recipient
  IF recipient_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, metadata)
    VALUES (
      recipient_id,
      'message',
      jsonb_build_object(
        'sender_id', NEW.sender_id,
        'sender_name', sender_name,
        'conversation_id', NEW.conversation_id,
        'message_preview', LEFT(NEW.content, 50)
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;