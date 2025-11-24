-- ============================================
-- FIX search_path: DROP AND RECREATE FUNCTIONS
-- ============================================

-- Drop existing functions first
DROP FUNCTION IF EXISTS get_personalized_feed(uuid, text, integer, integer);
DROP FUNCTION IF EXISTS get_friend_suggestions(uuid, integer);

-- Recreate with SET search_path
CREATE FUNCTION get_personalized_feed(
  user_id_param UUID,
  filter_type TEXT DEFAULT 'all',
  limit_param INT DEFAULT 20,
  offset_param INT DEFAULT 0
)
RETURNS TABLE (
  id UUID, content TEXT, media_url TEXT, media_type media_type, privacy post_privacy,
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ, user_id UUID,
  username TEXT, name TEXT, avatar_url TEXT,
  likes_count BIGINT, comments_count BIGINT, user_liked BOOLEAN, relevance_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH user_friends AS (
    SELECT CASE WHEN fr.sender_id = user_id_param THEN fr.receiver_id ELSE fr.sender_id END AS friend_id
    FROM friend_requests fr
    WHERE (fr.sender_id = user_id_param OR fr.receiver_id = user_id_param) AND fr.status = 'accepted'
  )
  SELECT p.id, p.content, p.media_url, p.media_type, p.privacy, p.created_at, p.updated_at, p.user_id,
    prof.username, prof.name, prof.avatar_url,
    COALESCE(l.like_count, 0) as likes_count, COALESCE(c.comment_count, 0) as comments_count,
    EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND likes.user_id = user_id_param) as user_liked,
    (COALESCE(l.like_count, 0) * 2 + COALESCE(c.comment_count, 0) * 3 +
     CASE WHEN EXISTS(SELECT 1 FROM user_friends WHERE friend_id = p.user_id) THEN 50 ELSE 0 END +
     CASE WHEN p.created_at > NOW() - INTERVAL '1 hour' THEN 100
          WHEN p.created_at > NOW() - INTERVAL '6 hours' THEN 50
          WHEN p.created_at > NOW() - INTERVAL '24 hours' THEN 25
          WHEN p.created_at > NOW() - INTERVAL '3 days' THEN 10 ELSE 0 END
    ) as relevance_score
  FROM posts p
  JOIN profiles prof ON prof.id = p.user_id
  LEFT JOIN (SELECT post_id, COUNT(*) as like_count FROM likes GROUP BY post_id) l ON l.post_id = p.id
  LEFT JOIN (SELECT post_id, COUNT(*) as comment_count FROM comments GROUP BY post_id) c ON c.post_id = p.id
  WHERE (p.privacy = 'public' OR p.user_id = user_id_param OR
         (p.privacy = 'friends' AND EXISTS(SELECT 1 FROM user_friends WHERE friend_id = p.user_id)))
    AND (filter_type = 'all' OR
         (filter_type = 'friends' AND EXISTS(SELECT 1 FROM user_friends WHERE friend_id = p.user_id)) OR
         (filter_type = 'popular' AND p.created_at > NOW() - INTERVAL '7 days') OR
         (filter_type = 'recent' AND p.created_at > NOW() - INTERVAL '24 hours'))
  ORDER BY 
    CASE WHEN filter_type = 'recent' THEN EXTRACT(EPOCH FROM p.created_at)
         WHEN filter_type = 'popular' THEN COALESCE(l.like_count, 0) + COALESCE(c.comment_count, 0)
         ELSE relevance_score END DESC,
    p.created_at DESC
  LIMIT limit_param OFFSET offset_param;
END;
$$;

-- Recreate get_friend_suggestions with SET search_path
CREATE FUNCTION get_friend_suggestions(
  user_id_param UUID,
  limit_param INT DEFAULT 10
)
RETURNS TABLE (
  id UUID, username TEXT, name TEXT, avatar_url TEXT, bio TEXT,
  city TEXT, region TEXT, country TEXT,
  mutual_friends_count BIGINT, same_location BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH user_location AS (
    SELECT ul.city, ul.region, ul.country FROM profiles ul WHERE ul.id = user_id_param
  ),
  user_friends AS (
    SELECT CASE WHEN fr.sender_id = user_id_param THEN fr.receiver_id ELSE fr.sender_id END AS friend_id
    FROM friend_requests fr WHERE (fr.sender_id = user_id_param OR fr.receiver_id = user_id_param) AND fr.status = 'accepted'
  ),
  pending_requests AS (
    SELECT fr.receiver_id AS user_id FROM friend_requests fr WHERE fr.sender_id = user_id_param AND fr.status = 'pending'
    UNION
    SELECT fr.sender_id AS user_id FROM friend_requests fr WHERE fr.receiver_id = user_id_param AND fr.status = 'pending'
  )
  SELECT p.id, p.username, p.name, p.avatar_url, p.bio, p.city, p.region, p.country,
    COALESCE(mf.mutual_count, 0) AS mutual_friends_count,
    (p.city = ul.city OR p.region = ul.region OR p.country = ul.country) AS same_location
  FROM profiles p
  CROSS JOIN user_location ul
  LEFT JOIN (
    SELECT p2.id, COUNT(DISTINCT uf2.friend_id) AS mutual_count
    FROM profiles p2
    JOIN friend_requests fr ON (fr.sender_id = p2.id OR fr.receiver_id = p2.id) AND fr.status = 'accepted'
    JOIN user_friends uf2 ON uf2.friend_id = CASE WHEN fr.sender_id = p2.id THEN fr.receiver_id ELSE fr.sender_id END
    WHERE p2.id != user_id_param GROUP BY p2.id
  ) mf ON mf.id = p.id
  WHERE p.id != user_id_param
    AND p.id NOT IN (SELECT friend_id FROM user_friends)
    AND p.id NOT IN (SELECT pr.user_id FROM pending_requests pr)
  ORDER BY mutual_friends_count DESC, same_location DESC, p.created_at DESC
  LIMIT limit_param;
END;
$$;