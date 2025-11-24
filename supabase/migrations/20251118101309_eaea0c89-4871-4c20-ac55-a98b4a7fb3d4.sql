-- Add location fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN city text,
ADD COLUMN region text,
ADD COLUMN country text;

-- Create friend requests table (bidirectional friendship system)
CREATE TABLE public.friend_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(sender_id, receiver_id)
);

-- Enable RLS on friend_requests
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for friend_requests
CREATE POLICY "Users can view their own requests"
ON public.friend_requests FOR SELECT
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send friend requests"
ON public.friend_requests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id AND sender_id != receiver_id);

CREATE POLICY "Users can update requests they received"
ON public.friend_requests FOR UPDATE
TO authenticated
USING (auth.uid() = receiver_id);

CREATE POLICY "Users can delete their own requests"
ON public.friend_requests FOR DELETE
TO authenticated
USING (auth.uid() = sender_id);

-- Create friend suggestions view based on location and mutual friends
CREATE OR REPLACE FUNCTION public.get_friend_suggestions(user_id_param uuid, limit_param integer DEFAULT 10)
RETURNS TABLE (
  id uuid,
  username text,
  name text,
  avatar_url text,
  bio text,
  city text,
  region text,
  country text,
  mutual_friends_count bigint,
  same_location boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH user_location AS (
    SELECT city, region, country
    FROM profiles
    WHERE profiles.id = user_id_param
  ),
  user_friends AS (
    SELECT CASE 
      WHEN sender_id = user_id_param THEN receiver_id
      ELSE sender_id
    END AS friend_id
    FROM friend_requests
    WHERE (sender_id = user_id_param OR receiver_id = user_id_param)
    AND status = 'accepted'
  ),
  pending_requests AS (
    SELECT receiver_id AS user_id FROM friend_requests
    WHERE sender_id = user_id_param AND status = 'pending'
    UNION
    SELECT sender_id AS user_id FROM friend_requests
    WHERE receiver_id = user_id_param AND status = 'pending'
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
  AND p.id NOT IN (SELECT user_id FROM pending_requests)
  ORDER BY 
    mutual_friends_count DESC,
    same_location DESC,
    p.created_at DESC
  LIMIT limit_param;
END;
$$;

-- Create function for mutual friends count
CREATE OR REPLACE FUNCTION public.get_mutual_friends_count(user_id_1 uuid, user_id_2 uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mutual_count bigint;
BEGIN
  WITH user1_friends AS (
    SELECT CASE 
      WHEN sender_id = user_id_1 THEN receiver_id
      ELSE sender_id
    END AS friend_id
    FROM friend_requests
    WHERE (sender_id = user_id_1 OR receiver_id = user_id_1)
    AND status = 'accepted'
  ),
  user2_friends AS (
    SELECT CASE 
      WHEN sender_id = user_id_2 THEN receiver_id
      ELSE sender_id
    END AS friend_id
    FROM friend_requests
    WHERE (sender_id = user_id_2 OR receiver_id = user_id_2)
    AND status = 'accepted'
  )
  SELECT COUNT(*)
  INTO mutual_count
  FROM user1_friends u1
  INNER JOIN user2_friends u2 ON u1.friend_id = u2.friend_id;
  
  RETURN mutual_count;
END;
$$;

-- Create trigger for friend request notifications
CREATE OR REPLACE FUNCTION public.create_friend_request_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    INSERT INTO public.notifications (user_id, type, metadata)
    VALUES (
      NEW.receiver_id,
      'follow',
      jsonb_build_object(
        'follower_id', NEW.sender_id,
        'request_id', NEW.id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_friend_request_created
  AFTER INSERT ON public.friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.create_friend_request_notification();

-- Update profile stats to include friends count
CREATE OR REPLACE FUNCTION public.get_user_stats(user_id_param uuid)
RETURNS TABLE (
  posts_count bigint,
  friends_count bigint,
  followers_count bigint,
  following_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM posts WHERE user_id = user_id_param),
    (SELECT COUNT(*) FROM friend_requests 
     WHERE (sender_id = user_id_param OR receiver_id = user_id_param) 
     AND status = 'accepted'),
    (SELECT COUNT(*) FROM follows WHERE following_id = user_id_param),
    (SELECT COUNT(*) FROM follows WHERE follower_id = user_id_param);
END;
$$;