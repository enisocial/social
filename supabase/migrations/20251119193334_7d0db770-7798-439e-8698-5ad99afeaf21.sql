-- Drop the policies on conversations that use direct subqueries
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON conversations;

-- Create new policies using the security definer function
CREATE POLICY "Users can view their conversations" ON conversations
  FOR SELECT
  USING (is_conversation_participant(auth.uid(), id));

CREATE POLICY "Users can update their conversations" ON conversations
  FOR UPDATE
  USING (is_conversation_participant(auth.uid(), id));