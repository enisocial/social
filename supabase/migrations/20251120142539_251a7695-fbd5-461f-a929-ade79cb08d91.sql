
-- Simplify and fix get_friend_unread_counts function
CREATE OR REPLACE FUNCTION get_friend_unread_counts(p_user_id uuid)
RETURNS TABLE (friend_id uuid, unread_count bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH user_conversations AS (
    -- Get all conversations for the user with the other participant
    SELECT 
      cp1.conversation_id, 
      cp2.user_id as friend_id
    FROM conversation_participants cp1
    JOIN conversation_participants cp2 
      ON cp1.conversation_id = cp2.conversation_id 
      AND cp2.user_id != p_user_id
    WHERE cp1.user_id = p_user_id
  ),
  friend_list AS (
    -- Get all accepted friends
    SELECT DISTINCT
      CASE 
        WHEN fr.sender_id = p_user_id THEN fr.receiver_id
        ELSE fr.sender_id
      END as friend_id
    FROM friend_requests fr
    WHERE (fr.sender_id = p_user_id OR fr.receiver_id = p_user_id)
      AND fr.status = 'accepted'
  )
  SELECT 
    fl.friend_id,
    COALESCE(
      (
        SELECT COUNT(DISTINCT m.id)
        FROM user_conversations uc
        JOIN messages m ON m.conversation_id = uc.conversation_id
        LEFT JOIN message_status ms ON ms.message_id = m.id AND ms.user_id = p_user_id
        WHERE uc.friend_id = fl.friend_id
          AND m.sender_id = fl.friend_id
          AND (ms.read_at IS NULL)
      ),
      0
    )::bigint as unread_count
  FROM friend_list fl;
END;
$$;
