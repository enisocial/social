-- Function to get user analytics overview
CREATE OR REPLACE FUNCTION public.get_user_analytics(user_id_param uuid, days_param integer DEFAULT 30)
RETURNS TABLE(
  total_posts bigint,
  total_likes bigint,
  total_comments bigint,
  total_views bigint,
  total_friends bigint,
  avg_engagement_rate numeric,
  posts_growth numeric,
  likes_growth numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cutoff_date timestamp with time zone;
  previous_cutoff_date timestamp with time zone;
BEGIN
  cutoff_date := now() - (days_param || ' days')::interval;
  previous_cutoff_date := now() - (days_param * 2 || ' days')::interval;

  RETURN QUERY
  WITH current_period AS (
    SELECT
      COUNT(DISTINCT p.id) as posts_count,
      COUNT(DISTINCT l.id) as likes_count,
      COUNT(DISTINCT c.id) as comments_count,
      COUNT(DISTINCT pv.id) as views_count
    FROM posts p
    LEFT JOIN likes l ON l.post_id = p.id
    LEFT JOIN comments c ON c.post_id = p.id
    LEFT JOIN post_views pv ON pv.post_id = p.id
    WHERE p.user_id = user_id_param
    AND p.created_at >= cutoff_date
  ),
  previous_period AS (
    SELECT
      COUNT(DISTINCT p.id) as posts_count,
      COUNT(DISTINCT l.id) as likes_count
    FROM posts p
    LEFT JOIN likes l ON l.post_id = p.id
    WHERE p.user_id = user_id_param
    AND p.created_at >= previous_cutoff_date
    AND p.created_at < cutoff_date
  ),
  friends_count AS (
    SELECT COUNT(*) as total
    FROM friend_requests
    WHERE (sender_id = user_id_param OR receiver_id = user_id_param)
    AND status = 'accepted'
  ),
  all_time_stats AS (
    SELECT
      COUNT(DISTINCT p.id) as total_posts,
      COUNT(DISTINCT l.id) as total_likes,
      COUNT(DISTINCT c.id) as total_comments,
      COUNT(DISTINCT pv.id) as total_views
    FROM posts p
    LEFT JOIN likes l ON l.post_id = p.id
    LEFT JOIN comments c ON c.post_id = p.id
    LEFT JOIN post_views pv ON pv.post_id = p.id
    WHERE p.user_id = user_id_param
  )
  SELECT
    ats.total_posts,
    ats.total_likes,
    ats.total_comments,
    ats.total_views,
    fc.total as total_friends,
    CASE 
      WHEN ats.total_posts > 0 
      THEN ROUND(((ats.total_likes + ats.total_comments)::numeric / ats.total_posts::numeric) * 100, 2)
      ELSE 0
    END as avg_engagement_rate,
    CASE 
      WHEN pp.posts_count > 0 
      THEN ROUND(((cp.posts_count - pp.posts_count)::numeric / pp.posts_count::numeric) * 100, 2)
      ELSE 0
    END as posts_growth,
    CASE 
      WHEN pp.likes_count > 0 
      THEN ROUND(((cp.likes_count - pp.likes_count)::numeric / pp.likes_count::numeric) * 100, 2)
      ELSE 0
    END as likes_growth
  FROM current_period cp, previous_period pp, friends_count fc, all_time_stats ats;
END;
$$;

-- Function to get daily engagement over time
CREATE OR REPLACE FUNCTION public.get_daily_engagement(user_id_param uuid, days_param integer DEFAULT 30)
RETURNS TABLE(
  date date,
  likes_count bigint,
  comments_count bigint,
  views_count bigint,
  posts_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      (now() - (days_param || ' days')::interval)::date,
      now()::date,
      '1 day'::interval
    )::date as day
  ),
  daily_stats AS (
    SELECT
      p.created_at::date as day,
      COUNT(DISTINCT p.id) as posts,
      COUNT(DISTINCT l.id) as likes,
      COUNT(DISTINCT c.id) as comments,
      COUNT(DISTINCT pv.id) as views
    FROM posts p
    LEFT JOIN likes l ON l.post_id = p.id AND l.created_at::date = p.created_at::date
    LEFT JOIN comments c ON c.post_id = p.id AND c.created_at::date = p.created_at::date
    LEFT JOIN post_views pv ON pv.post_id = p.id AND pv.viewed_at::date = p.created_at::date
    WHERE p.user_id = user_id_param
    AND p.created_at >= (now() - (days_param || ' days')::interval)
    GROUP BY p.created_at::date
  )
  SELECT
    ds.day,
    COALESCE(dst.likes, 0) as likes_count,
    COALESCE(dst.comments, 0) as comments_count,
    COALESCE(dst.views, 0) as views_count,
    COALESCE(dst.posts, 0) as posts_count
  FROM date_series ds
  LEFT JOIN daily_stats dst ON ds.day = dst.day
  ORDER BY ds.day;
END;
$$;

-- Function to get top performing posts
CREATE OR REPLACE FUNCTION public.get_top_posts(user_id_param uuid, limit_param integer DEFAULT 10)
RETURNS TABLE(
  post_id uuid,
  content text,
  created_at timestamp with time zone,
  likes_count bigint,
  comments_count bigint,
  views_count bigint,
  engagement_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id as post_id,
    p.content,
    p.created_at,
    COUNT(DISTINCT l.id) as likes_count,
    COUNT(DISTINCT c.id) as comments_count,
    COUNT(DISTINCT pv.id) as views_count,
    (COUNT(DISTINCT l.id) * 2 + COUNT(DISTINCT c.id) * 3 + COUNT(DISTINCT pv.id))::numeric as engagement_score
  FROM posts p
  LEFT JOIN likes l ON l.post_id = p.id
  LEFT JOIN comments c ON c.post_id = p.id
  LEFT JOIN post_views pv ON pv.post_id = p.id
  WHERE p.user_id = user_id_param
  GROUP BY p.id, p.content, p.created_at
  ORDER BY engagement_score DESC
  LIMIT limit_param;
END;
$$;

-- Function to get hourly activity pattern
CREATE OR REPLACE FUNCTION public.get_activity_by_hour(user_id_param uuid)
RETURNS TABLE(
  hour_of_day integer,
  activity_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH all_hours AS (
    SELECT generate_series(0, 23) as hour
  ),
  activity AS (
    SELECT
      EXTRACT(HOUR FROM created_at)::integer as hour,
      COUNT(*) as count
    FROM posts
    WHERE user_id = user_id_param
    GROUP BY EXTRACT(HOUR FROM created_at)
  )
  SELECT
    ah.hour as hour_of_day,
    COALESCE(a.count, 0) as activity_count
  FROM all_hours ah
  LEFT JOIN activity a ON ah.hour = a.hour
  ORDER BY ah.hour;
END;
$$;