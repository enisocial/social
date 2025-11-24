-- Create function to get personalized feed with intelligent sorting
CREATE OR REPLACE FUNCTION public.get_personalized_feed(
  user_id_param uuid,
  filter_type text DEFAULT 'all',
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
  relevance_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH user_friends AS (
    SELECT CASE 
      WHEN sender_id = user_id_param THEN receiver_id
      ELSE sender_id
    END AS friend_id
    FROM friend_requests
    WHERE (sender_id = user_id_param OR receiver_id = user_id_param)
    AND status = 'accepted'
  ),
  user_interactions AS (
    SELECT 
      p.user_id as author_id,
      COUNT(DISTINCT l.id) as likes_given,
      COUNT(DISTINCT c.id) as comments_given
    FROM posts p
    LEFT JOIN likes l ON l.post_id = p.id AND l.user_id = user_id_param
    LEFT JOIN comments c ON c.post_id = p.id AND c.user_id = user_id_param
    WHERE p.user_id != user_id_param
    GROUP BY p.user_id
  ),
  post_scores AS (
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
      COUNT(DISTINCT l.id) as likes_count,
      COUNT(DISTINCT c.id) as comments_count,
      EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = user_id_param) as user_liked,
      (
        -- Base score from post engagement
        (COUNT(DISTINCT l.id) * 2 + COUNT(DISTINCT c.id) * 3) +
        
        -- Bonus for friend posts
        CASE WHEN EXISTS(SELECT 1 FROM user_friends WHERE friend_id = p.user_id) 
          THEN 50 ELSE 0 END +
        
        -- Bonus based on user's past interactions with author
        COALESCE((
          SELECT (ui.likes_given * 5 + ui.comments_given * 8)
          FROM user_interactions ui
          WHERE ui.author_id = p.user_id
        ), 0) +
        
        -- Recency bonus (more recent = higher score)
        CASE 
          WHEN p.created_at > NOW() - INTERVAL '1 hour' THEN 100
          WHEN p.created_at > NOW() - INTERVAL '6 hours' THEN 50
          WHEN p.created_at > NOW() - INTERVAL '24 hours' THEN 25
          WHEN p.created_at > NOW() - INTERVAL '3 days' THEN 10
          ELSE 0
        END
      ) as relevance_score
    FROM posts p
    JOIN profiles prof ON prof.id = p.user_id
    LEFT JOIN likes l ON l.post_id = p.id
    LEFT JOIN comments c ON c.post_id = p.id
    WHERE 
      (p.privacy = 'public' OR p.user_id = user_id_param OR
       (p.privacy = 'friends' AND EXISTS(SELECT 1 FROM user_friends WHERE friend_id = p.user_id)))
      AND (
        filter_type = 'all' OR
        (filter_type = 'friends' AND EXISTS(SELECT 1 FROM user_friends WHERE friend_id = p.user_id)) OR
        (filter_type = 'popular' AND p.created_at > NOW() - INTERVAL '7 days') OR
        (filter_type = 'recent' AND p.created_at > NOW() - INTERVAL '24 hours')
      )
    GROUP BY p.id, prof.username, prof.name, prof.avatar_url
  )
  SELECT * FROM post_scores
  ORDER BY 
    CASE 
      WHEN filter_type = 'recent' THEN EXTRACT(EPOCH FROM created_at)
      WHEN filter_type = 'popular' THEN likes_count + comments_count
      ELSE relevance_score
    END DESC,
    created_at DESC
  LIMIT limit_param
  OFFSET offset_param;
END;
$$;