-- Fix infinite recursion in conversation_participants RLS policies
-- Use security definer function instead of direct table queries

-- Drop all existing policies that cause recursion
DROP POLICY IF EXISTS "Anyone authenticated can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can add participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON messages;
DROP POLICY IF EXISTS "Users can update messages in their conversations" ON messages;

-- Conversations policies
CREATE POLICY "Authenticated users can create conversations"
ON conversations FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users view their conversations"
ON conversations FOR SELECT
TO authenticated
USING (public.is_conversation_participant(auth.uid(), id));

-- Conversation participants policies - CRITICAL: Allow initial inserts without recursion
CREATE POLICY "Users view conversation participants"
ON conversation_participants FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR public.is_conversation_participant(auth.uid(), conversation_id)
);

-- Allow inserting participants for new conversations OR if user is already a participant
CREATE POLICY "Insert conversation participants"
ON conversation_participants FOR INSERT
TO authenticated
WITH CHECK (
  -- Always allow if no participants exist yet (prevents deadlock on first insert)
  NOT EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
  )
  OR
  -- Allow if user is already a participant (using security definer function)
  public.is_conversation_participant(auth.uid(), conversation_id)
);

-- Messages policies using security definer function
CREATE POLICY "View messages in conversations"
ON messages FOR SELECT
TO authenticated
USING (public.is_conversation_participant(auth.uid(), conversation_id));

CREATE POLICY "Send messages to conversations"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND public.is_conversation_participant(auth.uid(), conversation_id)
);

CREATE POLICY "Update messages in conversations"
ON messages FOR UPDATE
TO authenticated
USING (public.is_conversation_participant(auth.uid(), conversation_id))
WITH CHECK (public.is_conversation_participant(auth.uid(), conversation_id));