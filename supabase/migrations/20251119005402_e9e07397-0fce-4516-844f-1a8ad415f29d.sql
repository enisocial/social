-- Create function to get trending posts based on engagement
CREATE OR REPLACE FUNCTION public.get_trending_posts(limit_param integer DEFAULT 5)
RETURNS TABLE(
  id uuid,
  content text,
  created_at timestamp with time zone,
  media_url text,
  user_id uuid,
  username text,
  name text,
  avatar_url text,
  likes_count bigint,
  comments_count bigint,
  shares_count bigint,
  views_count bigint,
  engagement_score bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.content,
    p.created_at,
    p.media_url,
    p.user_id,
    prof.username,
    prof.name,
    prof.avatar_url,
    COALESCE(l.like_count, 0)::bigint as likes_count,
    COALESCE(c.comment_count, 0)::bigint as comments_count,
    COALESCE(p.share_count, 0)::bigint as shares_count,
    COALESCE(v.view_count, 0)::bigint as views_count,
    (
      COALESCE(l.like_count, 0) * 2 + 
      COALESCE(c.comment_count, 0) * 3 +
      COALESCE(p.share_count, 0) * 2 +
      COALESCE(v.view_count, 0) +
      CASE 
        WHEN p.created_at > NOW() - INTERVAL '1 hour' THEN 100
        WHEN p.created_at > NOW() - INTERVAL '6 hours' THEN 50
        WHEN p.created_at > NOW() - INTERVAL '24 hours' THEN 25
        ELSE 10
      END
    )::bigint as engagement_score
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
  LEFT JOIN (
    SELECT post_id, COUNT(*) as view_count 
    FROM post_views 
    GROUP BY post_id
  ) v ON v.post_id = p.id
  WHERE 
    p.privacy = 'public'
    AND p.created_at > NOW() - INTERVAL '7 days'
  ORDER BY engagement_score DESC, p.created_at DESC
  LIMIT limit_param;
END;
$function$;