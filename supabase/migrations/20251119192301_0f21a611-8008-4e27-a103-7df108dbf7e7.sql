-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "View participants in own conversations" ON conversation_participants;

-- Create a simpler, non-recursive policy
-- Users can view all participants in conversations where they are a participant
CREATE POLICY "View all participants in joined conversations" ON conversation_participants
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id 
      FROM conversation_participants 
      WHERE user_id = auth.uid()
    )
  );