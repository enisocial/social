-- Add indexes for online friends queries
CREATE INDEX IF NOT EXISTS idx_user_presence_user_id_online ON user_presence(user_id, online);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status_users ON friend_requests(status, sender_id, receiver_id);

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_friend_unread_counts(uuid);

-- Create optimized function to get online friends with all data in one call
CREATE OR REPLACE FUNCTION get_online_friends_optimized(p_user_id uuid)
RETURNS TABLE (
  friend_id uuid,
  friend_name text,
  friend_username text,
  friend_avatar_url text,
  is_online boolean,
  last_seen timestamp with time zone,
  unread_count integer,
  conversation_id uuid
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH user_friends AS (
    -- Get all accepted friends
    SELECT 
      CASE 
        WHEN fr.sender_id = p_user_id THEN fr.receiver_id
        ELSE fr.sender_id
      END AS friend_user_id
    FROM friend_requests fr
    WHERE fr.status = 'accepted'
      AND (fr.sender_id = p_user_id OR fr.receiver_id = p_user_id)
  ),
  friend_conversations AS (
    -- Get conversations with each friend
    SELECT DISTINCT
      cp1.user_id AS friend_user_id,
      cp1.conversation_id,
      cp1.unread_count
    FROM conversation_participants cp1
    INNER JOIN conversation_participants cp2 
      ON cp1.conversation_id = cp2.conversation_id
    WHERE cp2.user_id = p_user_id
      AND cp1.user_id != p_user_id
      AND cp1.user_id IN (SELECT friend_user_id FROM user_friends)
  )
  SELECT 
    uf.friend_user_id,
    p.name,
    p.username,
    p.avatar_url,
    COALESCE(up.online, false) AS is_online,
    COALESCE(up.last_seen, NOW()) AS last_seen,
    COALESCE(fc.unread_count, 0)::integer AS unread_count,
    fc.conversation_id
  FROM user_friends uf
  INNER JOIN profiles p ON p.id = uf.friend_user_id
  LEFT JOIN user_presence up ON up.user_id = uf.friend_user_id
  LEFT JOIN friend_conversations fc ON fc.friend_user_id = uf.friend_user_id
  ORDER BY 
    COALESCE(up.online, false) DESC,
    COALESCE(up.last_seen, NOW()) DESC;
END;
$$;