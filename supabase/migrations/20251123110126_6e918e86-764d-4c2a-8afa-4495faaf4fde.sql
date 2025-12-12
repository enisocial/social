-- ============================================
-- FIX LAST 3 search_path WARNINGS
-- ============================================

-- Fix create_friend_request_notification
CREATE OR REPLACE FUNCTION public.create_friend_request_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  sender_profile profiles%ROWTYPE;
  receiver_profile profiles%ROWTYPE;
BEGIN
  SELECT * INTO sender_profile FROM profiles WHERE id = NEW.sender_id;

  IF NEW.status = 'pending' THEN
    INSERT INTO notifications (user_id, sender_id, type, metadata, read, action_url)
    VALUES (NEW.receiver_id, NEW.sender_id, 'friend_request',
      jsonb_build_object('request_id', NEW.id, 'sender_id', NEW.sender_id, 'sender_name', sender_profile.name,
        'sender_username', sender_profile.username, 'sender_avatar_url', sender_profile.avatar_url),
      false, '/profile/' || sender_profile.username);
  
  ELSIF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    SELECT * INTO receiver_profile FROM profiles WHERE id = NEW.receiver_id;
    INSERT INTO notifications (user_id, sender_id, type, metadata, read, action_url)
    VALUES (NEW.sender_id, NEW.receiver_id, 'friend_request_accepted',
      jsonb_build_object('request_id', NEW.id, 'accepter_id', NEW.receiver_id, 'accepter_name', receiver_profile.name,
        'accepter_username', receiver_profile.username, 'accepter_avatar_url', receiver_profile.avatar_url),
      false, '/profile/' || receiver_profile.username);
  END IF;

  RETURN NEW;
END;
$$;

-- Fix record_engagement_signal
CREATE OR REPLACE FUNCTION public.record_engagement_signal(
  p_user_id uuid, 
  p_post_id uuid, 
  p_signal_type text, 
  p_signal_value numeric DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO engagement_signals (user_id, post_id, signal_type, signal_value)
  VALUES (p_user_id, p_post_id, p_signal_type, p_signal_value)
  ON CONFLICT (user_id, post_id, signal_type, created_at) DO NOTHING;
END;
$$;

-- Fix update_user_affinity (the old one without debounce)
CREATE OR REPLACE FUNCTION public.update_user_affinity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_TABLE_NAME = 'likes' THEN
    INSERT INTO user_affinity (user_id, target_user_id, interaction_count, affinity_score, last_interaction_at)
    SELECT NEW.user_id, p.user_id, 1, 2.0, now()
    FROM posts p WHERE p.id = NEW.post_id AND p.user_id != NEW.user_id
    ON CONFLICT (user_id, target_user_id) 
    DO UPDATE SET 
      interaction_count = user_affinity.interaction_count + 1,
      affinity_score = user_affinity.affinity_score + 0.5,
      last_interaction_at = now();
  ELSIF TG_TABLE_NAME = 'comments' THEN
    INSERT INTO user_affinity (user_id, target_user_id, interaction_count, affinity_score, last_interaction_at)
    SELECT NEW.user_id, p.user_id, 1, 3.0, now()
    FROM posts p WHERE p.id = NEW.post_id AND p.user_id != NEW.user_id
    ON CONFLICT (user_id, target_user_id) 
    DO UPDATE SET 
      interaction_count = user_affinity.interaction_count + 1,
      affinity_score = user_affinity.affinity_score + 1.0,
      last_interaction_at = now();
  ELSIF TG_TABLE_NAME = 'post_shares' THEN
    INSERT INTO user_affinity (user_id, target_user_id, interaction_count, affinity_score, last_interaction_at)
    SELECT NEW.shared_by, p.user_id, 1, 4.0, now()
    FROM posts p WHERE p.id = NEW.post_id AND p.user_id != NEW.shared_by
    ON CONFLICT (user_id, target_user_id) 
    DO UPDATE SET 
      interaction_count = user_affinity.interaction_count + 1,
      affinity_score = user_affinity.affinity_score + 1.5,
      last_interaction_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;