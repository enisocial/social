-- Drop the overly restrictive policy that only allows viewing own participation
DROP POLICY IF EXISTS "View own participation" ON conversation_participants;

-- The policy "View participants in own conversations" is sufficient and allows viewing
-- ALL participants in conversations where the user is a participant