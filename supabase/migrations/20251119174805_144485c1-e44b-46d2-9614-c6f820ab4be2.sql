-- Fix notify_new_message trigger to handle errors gracefully
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  recipient_id uuid;
  sender_name text;
BEGIN
  -- Use exception handling to prevent trigger from blocking message insert
  BEGIN
    -- Get the recipient (the other participant in the conversation)
    SELECT cp.user_id INTO recipient_id
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = NEW.conversation_id
    AND cp.user_id != NEW.sender_id
    LIMIT 1;

    -- Get sender's name from profiles
    SELECT p.name INTO sender_name
    FROM public.profiles p
    WHERE p.id = NEW.sender_id;

    -- Only insert notification if we found both recipient and sender name
    IF recipient_id IS NOT NULL AND sender_name IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, metadata, read)
      VALUES (
        recipient_id,
        'message',
        jsonb_build_object(
          'sender_id', NEW.sender_id,
          'sender_name', sender_name,
          'conversation_id', NEW.conversation_id,
          'message_preview', LEFT(NEW.content, 50)
        ),
        false
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't prevent message insertion
    RAISE WARNING 'Error in notify_new_message trigger: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;