-- Fix user_presence RLS policy to allow friends to see each other's online status
-- This resolves the 500 errors when fetching online friends

-- Drop the problematic policy that requires account_settings
DROP POLICY IF EXISTS "Others can view presence if allowed" ON public.user_presence;

-- Create a simpler policy that allows friends to see each other's presence
CREATE POLICY "Friends can view presence"
ON public.user_presence
FOR SELECT
USING (
  check_friendship(auth.uid(), user_id)
  OR auth.uid() = user_id
);

-- Also ensure the system policy allows updates for SECURITY DEFINER functions
DROP POLICY IF EXISTS "System can update presence" ON public.user_presence;
CREATE POLICY "System can update presence"
ON public.user_presence
FOR ALL
USING (true)
WITH CHECK (true);
