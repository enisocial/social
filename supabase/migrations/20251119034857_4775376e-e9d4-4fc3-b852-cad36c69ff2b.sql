-- Fix infinite recursion by NOT using is_conversation_participant on conversation_participants table
-- The function reads conversation_participants, so we can't use it in policies on that same table

-- Drop all existing policies
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users view their conversations" ON conversations;
DROP POLICY IF EXISTS "Users view conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Insert conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "View messages in conversations" ON messages;
DROP POLICY IF EXISTS "Send messages to conversations" ON messages;
DROP POLICY IF EXISTS "Update messages in conversations" ON messages;

-- === CONVERSATIONS TABLE ===
-- Simple policy: any authenticated user can create
CREATE POLICY "Create conversations"
ON conversations FOR INSERT
TO authenticated
WITH CHECK (true);

-- Use security definer function to check participation (safe because conversations table is not queried by the function)
CREATE POLICY "View own conversations"
ON conversations FOR SELECT
TO authenticated
USING (is_conversation_participant(auth.uid(), id));

-- === CONVERSATION_PARTICIPANTS TABLE ===
-- CRITICAL: Do NOT use is_conversation_participant() here - it would cause recursion!
-- Simple logic: users can see rows where they are the user_id
CREATE POLICY "View own participant records"
ON conversation_participants FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow inserting participants:
-- 1. If no participants exist yet (new conversation), OR
-- 2. If the inserting user is already a participant (checked via simple EXISTS)
CREATE POLICY "Add participants"
ON conversation_participants FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow if this is the first participant (no recursion - just counting)
  NOT EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
  )
  OR
  -- Allow if user is already a participant (simple check, no function call)
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
    AND cp.user_id = auth.uid()
  )
);

-- === MESSAGES TABLE ===
-- Safe to use is_conversation_participant() here (messages table is not queried by the function)
CREATE POLICY "View own messages"
ON messages FOR SELECT
TO authenticated
USING (is_conversation_participant(auth.uid(), conversation_id));

CREATE POLICY "Send messages"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND is_conversation_participant(auth.uid(), conversation_id)
);

CREATE POLICY "Update messages"
ON messages FOR UPDATE
TO authenticated
USING (is_conversation_participant(auth.uid(), conversation_id))
WITH CHECK (is_conversation_participant(auth.uid(), conversation_id));