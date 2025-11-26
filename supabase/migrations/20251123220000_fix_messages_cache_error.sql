-- ============================================
-- FIX MESSAGE SENDING ERROR
-- Drops potential ghost table messages_cache and cleans up triggers
-- ============================================

-- 1. Drop ghost object messages_cache if it exists (handling all types)
DROP FOREIGN TABLE IF EXISTS messages_cache CASCADE;
DROP TABLE IF EXISTS messages_cache CASCADE;
DROP MATERIALIZED VIEW IF EXISTS messages_cache CASCADE;
DROP VIEW IF EXISTS messages_cache CASCADE;

-- 2. Clean up triggers on messages table
-- We only want to keep: 
--   - update_conversation_on_message (updates conversations.updated_at)
--   - trigger_increment_unread (updates conversation_participants.unread_count)

DO $$
DECLARE
    t_name text;
BEGIN
    FOR t_name IN 
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'messages'
        AND trigger_schema = 'public'
        AND trigger_name NOT IN (
            'update_conversation_on_message', 
            'trigger_increment_unread',
            'message_insert_increment_unread' -- Keeping this as it might be the active one in some envs
        )
    LOOP
        RAISE NOTICE 'Dropping unknown trigger: %', t_name;
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(t_name) || ' ON public.messages';
    END LOOP;
END $$;

-- 3. Ensure valid triggers exist and are correct

-- Trigger 1: Update conversation timestamp
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.conversations
    SET updated_at = now()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_conversation_on_message ON public.messages;
CREATE TRIGGER update_conversation_on_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_timestamp();

-- Trigger 2: Increment unread count
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

-- Drop potential duplicate names
DROP TRIGGER IF EXISTS message_insert_increment_unread ON messages;
DROP TRIGGER IF EXISTS trigger_increment_unread ON messages;

-- Create the canonical one
CREATE TRIGGER trigger_increment_unread
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION increment_conversation_unread_count();
