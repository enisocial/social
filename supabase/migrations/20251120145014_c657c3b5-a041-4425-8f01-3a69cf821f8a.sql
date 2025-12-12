-- Update get_friend_unread_counts to use the maintained unread_count from conversation_participants
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
      cp2.user_id as friend_id,
      cp1.unread_count
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
    COALESCE(MAX(uc.unread_count), 0)::bigint as unread_count
  FROM friend_list fl
  LEFT JOIN user_conversations uc ON uc.friend_id = fl.friend_id
  GROUP BY fl.friend_id;
END;
$$;