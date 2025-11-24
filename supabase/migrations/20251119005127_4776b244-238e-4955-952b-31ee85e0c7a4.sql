-- Fix the get_personalized_feed function to return correct types
DROP FUNCTION IF EXISTS get_personalized_feed(uuid, text, integer, integer);

CREATE OR REPLACE FUNCTION get_personalized_feed(
  user_id_param uuid,
  filter_type text DEFAULT 'all'::text,
  limit_param integer DEFAULT 20,
  offset_param integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  content text,
  media_url text,
  media_type media_type,
  privacy post_privacy,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  user_id uuid,
  username text,
  name text,
  avatar_url text,
  likes_count bigint,
  comments_count bigint,
  user_liked boolean,
  relevance_score bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH user_friends AS (
    SELECT CASE 
      WHEN fr.sender_id = user_id_param THEN fr.receiver_id
      ELSE fr.sender_id
    END AS friend_id
    FROM friend_requests fr
    WHERE (fr.sender_id = user_id_param OR fr.receiver_id = user_id_param)
    AND fr.status = 'accepted'
  )
  SELECT 
    p.id,
    p.content,
    p.media_url,
    p.media_type,
    p.privacy,
    p.created_at,
    p.updated_at,
    p.user_id,
    prof.username,
    prof.name,
    prof.avatar_url,
    COALESCE(l.like_count, 0)::bigint as likes_count,
    COALESCE(c.comment_count, 0)::bigint as comments_count,
    EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND likes.user_id = user_id_param) as user_liked,
    (
      COALESCE(l.like_count, 0) * 2 + 
      COALESCE(c.comment_count, 0) * 3 +
      CASE WHEN EXISTS(SELECT 1 FROM user_friends WHERE friend_id = p.user_id) THEN 50 ELSE 0 END +
      CASE 
        WHEN p.created_at > NOW() - INTERVAL '1 hour' THEN 100
        WHEN p.created_at > NOW() - INTERVAL '6 hours' THEN 50
        WHEN p.created_at > NOW() - INTERVAL '24 hours' THEN 25
        WHEN p.created_at > NOW() - INTERVAL '3 days' THEN 10
        ELSE 0
      END
    )::bigint as relevance_score
  FROM posts p
  JOIN profiles prof ON prof.id = p.user_id
  LEFT JOIN (
    SELECT post_id, COUNT(*) as like_count 
    FROM likes 
    GROUP BY post_id
  ) l ON l.post_id = p.id
  LEFT JOIN (
    SELECT post_id, COUNT(*) as comment_count 
    FROM comments 
    GROUP BY post_id
  ) c ON c.post_id = p.id
  WHERE 
    (p.privacy = 'public' OR p.user_id = user_id_param OR
     (p.privacy = 'friends' AND EXISTS(SELECT 1 FROM user_friends WHERE friend_id = p.user_id)))
    AND (
      filter_type = 'all' OR
      (filter_type = 'friends' AND EXISTS(SELECT 1 FROM user_friends WHERE friend_id = p.user_id)) OR
      (filter_type = 'popular' AND p.created_at > NOW() - INTERVAL '7 days') OR
      (filter_type = 'recent' AND p.created_at > NOW() - INTERVAL '24 hours')
    )
  ORDER BY 
    CASE 
      WHEN filter_type = 'recent' THEN EXTRACT(EPOCH FROM p.created_at)::bigint
      WHEN filter_type = 'popular' THEN (COALESCE(l.like_count, 0) + COALESCE(c.comment_count, 0))::bigint
      ELSE relevance_score
    END DESC,
    p.created_at DESC
  LIMIT limit_param
  OFFSET offset_param;
END;
$$;