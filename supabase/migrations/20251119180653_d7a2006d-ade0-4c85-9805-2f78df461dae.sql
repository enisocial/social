-- Drop existing function if exists
DROP FUNCTION IF EXISTS create_conversation_with_participant(uuid);

-- Create a secure function to create conversations
CREATE OR REPLACE FUNCTION create_conversation_with_participant(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  existing_conv_id uuid;
  new_conv_id uuid;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if conversation already exists between these users
  SELECT DISTINCT cp1.conversation_id INTO existing_conv_id
  FROM conversation_participants cp1
  INNER JOIN conversation_participants cp2 
    ON cp1.conversation_id = cp2.conversation_id
  WHERE cp1.user_id = current_user_id
    AND cp2.user_id = other_user_id
    AND cp1.user_id != cp2.user_id;

  -- If exists, return it
  IF existing_conv_id IS NOT NULL THEN
    RETURN existing_conv_id;
  END IF;

  -- Create new conversation
  INSERT INTO conversations (created_at, updated_at)
  VALUES (now(), now())
  RETURNING id INTO new_conv_id;

  -- Add both participants
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES 
    (new_conv_id, current_user_id),
    (new_conv_id, other_user_id);

  RETURN new_conv_id;
END;
$$;