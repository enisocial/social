-- ULTIMATE FIX: Remove ALL recursion by making conversation_participants policies DEAD SIMPLE
-- No EXISTS checks on conversation_participants from conversation_participants policies!

-- Drop all policies
DROP POLICY IF EXISTS "Create conversations" ON conversations;
DROP POLICY IF EXISTS "View own conversations" ON conversations;
DROP POLICY IF EXISTS "View own participant records" ON conversation_participants;
DROP POLICY IF EXISTS "Add participants" ON conversation_participants;
DROP POLICY IF EXISTS "View own messages" ON messages;
DROP POLICY IF EXISTS "Send messages" ON messages;
DROP POLICY IF EXISTS "Update messages" ON messages;

-- === CONVERSATIONS TABLE ===
CREATE POLICY "Anyone can create conversations"
ON conversations FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "View conversations where you are participant"
ON conversations FOR SELECT
TO authenticated
USING (is_conversation_participant(auth.uid(), id));

-- === CONVERSATION_PARTICIPANTS TABLE ===
-- CRITICAL: ZERO recursion - only check the row being inserted/selected
CREATE POLICY "View own participation"
ON conversation_participants FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- CRITICAL: Allow inserting ONLY if the user is adding themselves
-- No EXISTS checks, no subqueries on conversation_participants!
CREATE POLICY "Add yourself as participant"
ON conversation_participants FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- === MESSAGES TABLE ===
CREATE POLICY "View messages in your conversations"
ON messages FOR SELECT
TO authenticated
USING (is_conversation_participant(auth.uid(), conversation_id));

CREATE POLICY "Send messages to your conversations"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND is_conversation_participant(auth.uid(), conversation_id)
);

CREATE POLICY "Update messages in your conversations"
ON messages FOR UPDATE
TO authenticated
USING (is_conversation_participant(auth.uid(), conversation_id))
WITH CHECK (is_conversation_participant(auth.uid(), conversation_id));