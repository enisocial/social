-- Create a function to atomically create a conversation with participants
-- This avoids RLS timing issues
CREATE OR REPLACE FUNCTION create_conversation_with_participant(other_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_conversation_id UUID;
BEGIN
  -- Insert conversation
  INSERT INTO conversations DEFAULT VALUES
  RETURNING id INTO new_conversation_id;
  
  -- Insert both participants
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES 
    (new_conversation_id, auth.uid()),
    (new_conversation_id, other_user_id);
  
  RETURN new_conversation_id;
END;
$$;