-- Modifier get_smart_friend_suggestions pour exclure les admins et modérateurs
CREATE OR REPLACE FUNCTION public.get_smart_friend_suggestions(user_id_param uuid, limit_param integer DEFAULT 20)
RETURNS TABLE(id uuid, username text, name text, avatar_url text, bio text, city text, region text, country text, mutual_friends_count integer, same_location boolean, is_new_user boolean, interaction_score integer, suggestion_score numeric)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH user_profile AS (
    SELECT p.city, p.region, p.country, p.created_at
    FROM profiles p
    WHERE p.id = user_id_param
  ),
  user_friends AS (
    SELECT 
      CASE 
        WHEN fr.sender_id = user_id_param THEN fr.receiver_id
        ELSE fr.sender_id
      END as friend_id
    FROM friend_requests fr
    WHERE 
      (fr.sender_id = user_id_param OR fr.receiver_id = user_id_param)
      AND fr.status = 'accepted'
  ),
  pending_requests AS (
    SELECT 
      CASE 
        WHEN fr.sender_id = user_id_param THEN fr.receiver_id
        ELSE fr.sender_id
      END as user_id
    FROM friend_requests fr
    WHERE 
      (fr.sender_id = user_id_param OR fr.receiver_id = user_id_param)
      AND fr.status IN ('pending', 'rejected')
  ),
  hidden_users AS (
    SELECT hidden_user_id
    FROM hidden_friend_suggestions
    WHERE hidden_friend_suggestions.user_id = user_id_param
  ),
  admin_moderator_users AS (
    -- Exclure les admins et modérateurs des suggestions
    SELECT user_id
    FROM user_roles
    WHERE role IN ('admin', 'moderator')
  ),
  mutual_friends_count AS (
    SELECT 
      p.id,
      COUNT(DISTINCT uf2.friend_id) as mutual_count
    FROM profiles p
    CROSS JOIN user_friends uf1
    LEFT JOIN friend_requests fr ON (
      (fr.sender_id = p.id AND fr.receiver_id = uf1.friend_id) OR
      (fr.receiver_id = p.id AND fr.sender_id = uf1.friend_id)
    ) AND fr.status = 'accepted'
    LEFT JOIN user_friends uf2 ON uf2.friend_id = fr.sender_id OR uf2.friend_id = fr.receiver_id
    WHERE p.id != user_id_param
      AND p.id NOT IN (SELECT friend_id FROM user_friends)
      AND p.id NOT IN (SELECT user_id FROM pending_requests)
      AND p.id NOT IN (SELECT hidden_user_id FROM hidden_users)
      AND p.id NOT IN (SELECT user_id FROM admin_moderator_users)
    GROUP BY p.id
  ),
  interactions AS (
    SELECT 
      p.user_id as interacted_user_id,
      COUNT(*) as interaction_count
    FROM (
      SELECT user_id FROM likes WHERE post_id IN (SELECT id FROM posts WHERE user_id = user_id_param)
      UNION ALL
      SELECT user_id FROM comments WHERE post_id IN (SELECT id FROM posts WHERE user_id = user_id_param)
      UNION ALL
      SELECT user_id FROM post_reactions WHERE post_id IN (SELECT id FROM posts WHERE user_id = user_id_param)
    ) p
    WHERE p.user_id != user_id_param
    GROUP BY p.user_id
  ),
  candidates AS (
    SELECT 
      p.id,
      p.username,
      p.name,
      p.avatar_url,
      p.bio,
      p.city,
      p.region,
      p.country,
      COALESCE(mfc.mutual_count, 0)::INTEGER as mutual_friends_count,
      (
        up.city IS NOT NULL AND p.city IS NOT NULL AND up.city = p.city OR
        up.region IS NOT NULL AND p.region IS NOT NULL AND up.region = p.region OR
        up.country IS NOT NULL AND p.country IS NOT NULL AND up.country = p.country
      ) as same_location,
      (p.created_at > NOW() - INTERVAL '30 days') as is_new_user,
      COALESCE(i.interaction_count, 0)::INTEGER as interaction_score,
      (
        COALESCE(mfc.mutual_count, 0) * 10 +
        COALESCE(i.interaction_count, 0) * 5 +
        CASE WHEN up.city IS NOT NULL AND p.city = up.city THEN 15 ELSE 0 END +
        CASE WHEN up.region IS NOT NULL AND p.region = up.region THEN 8 ELSE 0 END +
        CASE WHEN up.country IS NOT NULL AND p.country = up.country THEN 3 ELSE 0 END +
        CASE WHEN p.created_at > NOW() - INTERVAL '30 days' THEN 5 ELSE 0 END
      )::NUMERIC as suggestion_score
    FROM profiles p
    CROSS JOIN user_profile up
    LEFT JOIN mutual_friends_count mfc ON mfc.id = p.id
    LEFT JOIN interactions i ON i.interacted_user_id = p.id
    WHERE p.id != user_id_param
      AND p.id NOT IN (SELECT friend_id FROM user_friends)
      AND p.id NOT IN (SELECT user_id FROM pending_requests)
      AND p.id NOT IN (SELECT hidden_user_id FROM hidden_users)
      AND p.id NOT IN (SELECT user_id FROM admin_moderator_users)
  )
  SELECT 
    c.id,
    c.username,
    c.name,
    c.avatar_url,
    c.bio,
    c.city,
    c.region,
    c.country,
    c.mutual_friends_count,
    c.same_location,
    c.is_new_user,
    c.interaction_score,
    c.suggestion_score
  FROM candidates c
  WHERE c.suggestion_score > 0
  ORDER BY c.suggestion_score DESC, c.mutual_friends_count DESC, c.created_at DESC
  LIMIT limit_param;
END;
$$;

-- Modifier get_friend_suggestions pour exclure les admins et modérateurs
CREATE OR REPLACE FUNCTION public.get_friend_suggestions(user_id_param uuid, limit_param integer DEFAULT 10)
RETURNS TABLE(id uuid, username text, name text, avatar_url text, bio text, city text, region text, country text, mutual_friends_count bigint, same_location boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH user_location AS (
    SELECT ul.city, ul.region, ul.country
    FROM profiles ul
    WHERE ul.id = user_id_param
  ),
  user_friends AS (
    SELECT CASE 
      WHEN fr.sender_id = user_id_param THEN fr.receiver_id
      ELSE fr.sender_id
    END AS friend_id
    FROM friend_requests fr
    WHERE (fr.sender_id = user_id_param OR fr.receiver_id = user_id_param)
    AND fr.status = 'accepted'
  ),
  pending_requests AS (
    SELECT fr.receiver_id AS user_id FROM friend_requests fr
    WHERE fr.sender_id = user_id_param AND fr.status = 'pending'
    UNION
    SELECT fr.sender_id AS user_id FROM friend_requests fr
    WHERE fr.receiver_id = user_id_param AND fr.status = 'pending'
  ),
  admin_moderator_users AS (
    SELECT user_id
    FROM user_roles
    WHERE role IN ('admin', 'moderator')
  )
  SELECT 
    p.id,
    p.username,
    p.name,
    p.avatar_url,
    p.bio,
    p.city,
    p.region,
    p.country,
    COALESCE(mf.mutual_count, 0) AS mutual_friends_count,
    (p.city = ul.city OR p.region = ul.region OR p.country = ul.country) AS same_location
  FROM profiles p
  CROSS JOIN user_location ul
  LEFT JOIN (
    SELECT 
      p2.id,
      COUNT(DISTINCT uf2.friend_id) AS mutual_count
    FROM profiles p2
    JOIN friend_requests fr ON 
      (fr.sender_id = p2.id OR fr.receiver_id = p2.id)
      AND fr.status = 'accepted'
    JOIN user_friends uf2 ON 
      uf2.friend_id = CASE 
        WHEN fr.sender_id = p2.id THEN fr.receiver_id
        ELSE fr.sender_id
      END
    WHERE p2.id != user_id_param
    GROUP BY p2.id
  ) mf ON mf.id = p.id
  WHERE p.id != user_id_param
  AND p.id NOT IN (SELECT friend_id FROM user_friends)
  AND p.id NOT IN (SELECT pr.user_id FROM pending_requests pr)
  AND p.id NOT IN (SELECT user_id FROM admin_moderator_users)
  ORDER BY 
    mutual_friends_count DESC,
    same_location DESC,
    p.created_at DESC
  LIMIT limit_param;
END;
$$;

-- Modifier get_smart_feed pour exclure les posts des admins/modérateurs
CREATE OR REPLACE FUNCTION public.get_smart_feed(user_id_param uuid, filter_type text DEFAULT 'recommended'::text, limit_param integer DEFAULT 10, offset_param integer DEFAULT 0)
RETURNS TABLE(id uuid, content text, media_url text, media_type text, privacy text, created_at timestamp with time zone, updated_at timestamp with time zone, user_id uuid, username text, name text, avatar_url text, likes_count bigint, comments_count bigint, shares_count bigint, views_count bigint, user_liked boolean, relevance_score numeric, engagement_prediction numeric, final_score numeric)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH 
  user_friends AS (
    SELECT DISTINCT
      CASE 
        WHEN sender_id = user_id_param THEN receiver_id
        ELSE sender_id
      END as friend_id
    FROM friend_requests
    WHERE (sender_id = user_id_param OR receiver_id = user_id_param)
      AND status = 'accepted'
  ),
  admin_moderator_users AS (
    SELECT user_id
    FROM user_roles
    WHERE role IN ('admin', 'moderator')
  ),
  user_engagement AS (
    SELECT 
      es.post_id,
      SUM(
        CASE es.signal_type
          WHEN 'view' THEN 0.1
          WHEN 'click' THEN 0.3
          WHEN 'like' THEN 1.0
          WHEN 'comment' THEN 2.0
          WHEN 'share' THEN 3.0
          WHEN 'time_spent' THEN es.signal_value * 0.05
          ELSE 0
        END
      ) as engagement_score
    FROM engagement_signals es
    WHERE es.user_id = user_id_param
      AND es.created_at > now() - interval '30 days'
    GROUP BY es.post_id
  ),
  post_metrics AS (
    SELECT 
      p.id,
      p.content,
      p.media_url,
      p.media_type::TEXT,
      p.privacy::TEXT,
      p.created_at,
      p.updated_at,
      p.user_id,
      prof.username,
      prof.name,
      prof.avatar_url,
      COALESCE(COUNT(DISTINCT l.id), 0) as likes_count,
      COALESCE(COUNT(DISTINCT c.id), 0) as comments_count,
      COALESCE(COUNT(DISTINCT ps.id), 0) as shares_count,
      COALESCE(COUNT(DISTINCT pv.id), 0) as views_count,
      EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND likes.user_id = user_id_param) as user_liked,
      CASE 
        WHEN p.user_id = user_id_param THEN 0
        WHEN EXISTS(SELECT 1 FROM user_friends WHERE friend_id = p.user_id) THEN 5.0
        ELSE 1.0
      END as friend_score,
      (
        COALESCE(COUNT(DISTINCT l.id), 0) * 1.0 +
        COALESCE(COUNT(DISTINCT c.id), 0) * 2.0 +
        COALESCE(COUNT(DISTINCT ps.id), 0) * 3.0
      ) / GREATEST(EXTRACT(EPOCH FROM (now() - p.created_at)) / 3600, 1) as popularity_score,
      COALESCE(ue.engagement_score, 0.5) as engagement_prediction,
      CASE 
        WHEN p.created_at > now() - interval '1 hour' THEN 5.0
        WHEN p.created_at > now() - interval '6 hours' THEN 3.0
        WHEN p.created_at > now() - interval '24 hours' THEN 2.0
        WHEN p.created_at > now() - interval '3 days' THEN 1.0
        ELSE 0.5
      END as recency_score
    FROM posts p
    INNER JOIN profiles prof ON p.user_id = prof.id
    LEFT JOIN likes l ON p.id = l.post_id
    LEFT JOIN comments c ON p.id = c.post_id
    LEFT JOIN post_shares ps ON p.id = ps.post_id
    LEFT JOIN post_views pv ON p.id = pv.post_id
    LEFT JOIN user_engagement ue ON p.id = ue.post_id
    WHERE 
      (p.privacy = 'public' OR 
       (p.privacy = 'friends' AND EXISTS(SELECT 1 FROM user_friends WHERE friend_id = p.user_id)) OR
       p.user_id = user_id_param)
      AND p.user_id != user_id_param
      AND p.user_id NOT IN (SELECT user_id FROM admin_moderator_users)
    GROUP BY p.id, prof.username, prof.name, prof.avatar_url, ue.engagement_score
  )
  SELECT 
    pm.id,
    pm.content,
    pm.media_url,
    pm.media_type,
    pm.privacy,
    pm.created_at,
    pm.updated_at,
    pm.user_id,
    pm.username,
    pm.name,
    pm.avatar_url,
    pm.likes_count,
    pm.comments_count,
    pm.shares_count,
    pm.views_count,
    pm.user_liked,
    pm.friend_score as relevance_score,
    pm.engagement_prediction,
    CASE 
      WHEN filter_type = 'recommended' THEN
        (pm.friend_score * 0.35 + pm.popularity_score * 0.25 + pm.engagement_prediction * 0.25 + pm.recency_score * 0.15)
      WHEN filter_type = 'friends' THEN
        CASE WHEN pm.friend_score > 1 THEN (pm.recency_score * 0.6 + pm.popularity_score * 0.4) ELSE 0 END
      WHEN filter_type = 'recent' THEN
        pm.recency_score
      ELSE
        pm.popularity_score
    END as final_score
  FROM post_metrics pm
  WHERE 
    CASE 
      WHEN filter_type = 'friends' THEN pm.friend_score > 1
      ELSE true
    END
  ORDER BY final_score DESC, pm.created_at DESC
  LIMIT limit_param
  OFFSET offset_param;
END;
$$;