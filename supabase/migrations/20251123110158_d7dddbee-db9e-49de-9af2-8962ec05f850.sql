-- ============================================
-- FIX FINAL search_path WARNING
-- ============================================

-- Fix get_personalized_timeline
CREATE OR REPLACE FUNCTION public.get_personalized_timeline(
  p_user_id uuid, 
  p_limit integer DEFAULT 20, 
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid, content text, media_url text, media_type text, privacy text, 
  created_at timestamp with time zone, updated_at timestamp with time zone, 
  user_id uuid, username text, name text, avatar_url text, 
  likes_count bigint, comments_count bigint, shares_count bigint, views_count bigint, 
  user_liked boolean, ranking_score numeric, variant text
)
LANGUAGE plpgsql
STABLE 
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id, p.content, p.media_url, p.media_type::TEXT, p.privacy::TEXT,
    p.created_at, p.updated_at, p.user_id,
    prof.username, prof.name, prof.avatar_url,
    COALESCE(COUNT(DISTINCT l.id), 0) as likes_count,
    COALESCE(COUNT(DISTINCT c.id), 0) as comments_count,
    COALESCE(COUNT(DISTINCT ps.id), 0) as shares_count,
    COALESCE(COUNT(DISTINCT pv.id), 0) as views_count,
    EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND likes.user_id = p_user_id) as user_liked,
    ti.ranking_score,
    ti.variant
  FROM timeline_items ti
  INNER JOIN posts p ON p.id = ti.post_id
  INNER JOIN profiles prof ON prof.id = p.user_id
  LEFT JOIN likes l ON p.id = l.post_id
  LEFT JOIN comments c ON p.id = c.post_id
  LEFT JOIN post_shares ps ON p.id = ps.post_id
  LEFT JOIN post_views pv ON p.id = pv.post_id
  WHERE ti.user_id = p_user_id
  GROUP BY p.id, prof.username, prof.name, prof.avatar_url, ti.ranking_score, ti.variant, ti.created_at
  ORDER BY 
    CASE WHEN ti.variant = 'personalized' THEN ti.ranking_score ELSE 0 END DESC,
    CASE WHEN ti.variant = 'chronological' THEN ti.created_at ELSE NULL END DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;