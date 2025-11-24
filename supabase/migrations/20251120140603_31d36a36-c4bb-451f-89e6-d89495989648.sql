-- Create an optimized function to get unread message counts for friends
CREATE OR REPLACE FUNCTION get_friend_unread_counts(p_user_id uuid)
RETURNS TABLE (
  friend_id uuid,
  unread_count bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH user_conversations AS (
    -- Get all conversations for the user
    SELECT cp1.conversation_id, cp2.user_id as friend_id
    FROM conversation_participants cp1
    JOIN conversation_participants cp2 
      ON cp1.conversation_id = cp2.conversation_id 
      AND cp2.user_id != p_user_id
    WHERE cp1.user_id = p_user_id
  )
  SELECT 
    uc.friend_id,
    COUNT(m.id)::bigint as unread_count
  FROM user_conversations uc
  LEFT JOIN messages m 
    ON m.conversation_id = uc.conversation_id 
    AND m.sender_id = uc.friend_id
  LEFT JOIN message_status ms 
    ON ms.message_id = m.id 
    AND ms.user_id = p_user_id 
    AND ms.read_at IS NOT NULL
  WHERE ms.message_id IS NULL -- Only count messages without read status
    AND m.id IS NOT NULL -- Only count actual messages
  GROUP BY uc.friend_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;