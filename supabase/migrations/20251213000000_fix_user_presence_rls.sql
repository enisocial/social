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

-- ============================================
-- CRITICAL FIXES FOR PRESENCE SYSTEM
-- ============================================

-- Function to safely update user presence (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.safe_update_presence(
  target_user_id UUID,
  online_status BOOLEAN DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert or update presence record
  INSERT INTO user_presence (user_id, is_online, last_seen, updated_at)
  VALUES (target_user_id, online_status, NOW(), NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET
    is_online = EXCLUDED.is_online,
    last_seen = CASE WHEN EXCLUDED.is_online THEN NOW() ELSE user_presence.last_seen END,
    updated_at = NOW();
END;
$$;

-- Function to clean up stale presence records (runs as SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.cleanup_stale_presence()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  -- Mark users as offline if they haven't updated their presence in 5 minutes
  -- OR if they have been online for more than 8 hours (failsafe)
  UPDATE user_presence
  SET is_online = false,
      last_seen = updated_at,
      updated_at = NOW()
  WHERE (updated_at < NOW() - INTERVAL '5 minutes' AND is_online = true)
     OR (updated_at < NOW() - INTERVAL '8 hours'); -- Failsafe for extremely stale records

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$;

-- Function to get accurate online friends count for a user
CREATE OR REPLACE FUNCTION public.get_online_friends_count(user_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  online_count INTEGER;
BEGIN
  -- First clean up any stale records
  PERFORM cleanup_stale_presence();

  -- Count friends who are online
  SELECT COUNT(*)::INTEGER INTO online_count
  FROM user_presence up
  INNER JOIN friend_requests fr ON (
    (fr.sender_id = user_id_param AND fr.receiver_id = up.user_id)
    OR (fr.receiver_id = user_id_param AND fr.sender_id = up.user_id)
  )
  WHERE fr.status = 'accepted'
    AND up.is_online = true
    AND up.user_id != user_id_param;

  RETURN COALESCE(online_count, 0);
END;
$$;

-- Create a trigger to automatically clean up stale presence on updates
CREATE OR REPLACE FUNCTION public.trigger_cleanup_stale_presence()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Run cleanup every 100 presence updates (throttled cleanup)
  IF (SELECT (nextval('presence_update_counter') % 100) = 0) THEN
    PERFORM cleanup_stale_presence();
  END IF;
  RETURN NEW;
END;
$$;

-- Create a sequence for throttling cleanup
CREATE SEQUENCE IF NOT EXISTS presence_update_counter;

-- Create trigger on presence updates
DROP TRIGGER IF EXISTS trigger_presence_cleanup ON user_presence;
CREATE TRIGGER trigger_presence_cleanup
  AFTER INSERT OR UPDATE ON user_presence
  FOR EACH ROW
  EXECUTE FUNCTION trigger_cleanup_stale_presence();
