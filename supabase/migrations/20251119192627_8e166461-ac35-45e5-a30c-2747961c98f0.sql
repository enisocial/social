-- Drop the problematic policy
DROP POLICY IF EXISTS "View all participants in joined conversations" ON conversation_participants;

-- Create security definer function to check if user is in a conversation
-- This function bypasses RLS to avoid infinite recursion
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

-- Create non-recursive policy using the security definer function
CREATE POLICY "View participants in own conversations" ON conversation_participants
  FOR SELECT
  USING (public.is_conversation_participant(auth.uid(), conversation_id));