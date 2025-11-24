-- Allow users to view other participants in their conversations
CREATE POLICY "View participants in own conversations"
ON conversation_participants
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
    AND cp.user_id = auth.uid()
  )
);

-- Allow users to update their own participant record (for last_read_at, unread_count)
CREATE POLICY "Update own participation"
ON conversation_participants
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());