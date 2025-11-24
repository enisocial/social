-- Create security definer function to check if user is conversation participant
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_user_id uuid, _conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM conversation_participants
    WHERE conversation_id = _conversation_id
      AND user_id = _user_id
  )
$$;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can add participants to conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can insert conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;

DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON conversations;

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;

-- Create new RLS policies using the security definer function

-- conversation_participants policies
CREATE POLICY "Users can view conversation participants"
ON conversation_participants FOR SELECT
USING (
  user_id = auth.uid() 
  OR 
  is_conversation_participant(auth.uid(), conversation_id)
);

CREATE POLICY "Users can insert conversation participants"
ON conversation_participants FOR INSERT
WITH CHECK (
  is_conversation_participant(auth.uid(), conversation_id)
);

-- conversations policies
CREATE POLICY "Users can view their conversations"
ON conversations FOR SELECT
USING (is_conversation_participant(auth.uid(), id));

CREATE POLICY "Authenticated users can create conversations"
ON conversations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- messages policies
CREATE POLICY "Users can view messages in their conversations"
ON messages FOR SELECT
USING (is_conversation_participant(auth.uid(), conversation_id));

CREATE POLICY "Users can send messages to their conversations"
ON messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND
  is_conversation_participant(auth.uid(), conversation_id)
);

CREATE POLICY "Users can update their own messages"
ON messages FOR UPDATE
USING (is_conversation_participant(auth.uid(), conversation_id))
WITH CHECK (is_conversation_participant(auth.uid(), conversation_id));