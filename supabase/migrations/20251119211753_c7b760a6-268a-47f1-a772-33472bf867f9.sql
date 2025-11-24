-- Create table for hidden friend suggestions
CREATE TABLE IF NOT EXISTS public.hidden_friend_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  hidden_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  hidden_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, hidden_user_id)
);

-- Enable RLS
ALTER TABLE public.hidden_friend_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own hidden suggestions"
  ON public.hidden_friend_suggestions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can hide suggestions"
  ON public.hidden_friend_suggestions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unhide suggestions"
  ON public.hidden_friend_suggestions FOR DELETE
  USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON public.friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON public.friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON public.friend_requests(status);
CREATE INDEX IF NOT EXISTS idx_profiles_location ON public.profiles(city, region, country);
CREATE INDEX IF NOT EXISTS idx_hidden_suggestions_user ON public.hidden_friend_suggestions(user_id);

-- Advanced friend suggestion algorithm (Facebook-style)
CREATE OR REPLACE FUNCTION public.get_smart_friend_suggestions(
  user_id_param UUID,
  limit_param INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  username TEXT,
  name TEXT,
  avatar_url TEXT,
  bio TEXT,
  city TEXT,
  region TEXT,
  country TEXT,
  mutual_friends_count INTEGER,
  same_location BOOLEAN,
  is_new_user BOOLEAN,
  interaction_score INTEGER,
  suggestion_score NUMERIC
) AS $$
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
        -- Mutual friends (highest weight)
        COALESCE(mfc.mutual_count, 0) * 10 +
        -- Interactions
        COALESCE(i.interaction_count, 0) * 5 +
        -- Same city (high weight)
        CASE WHEN up.city IS NOT NULL AND p.city = up.city THEN 15 ELSE 0 END +
        -- Same region
        CASE WHEN up.region IS NOT NULL AND p.region = up.region THEN 8 ELSE 0 END +
        -- Same country
        CASE WHEN up.country IS NOT NULL AND p.country = up.country THEN 3 ELSE 0 END +
        -- New user bonus
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
$$ LANGUAGE plpgsql SECURITY DEFINER;