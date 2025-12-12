-- ============================================
-- FIX search_path SYNTAX ERROR
-- ============================================

-- Fix update_user_affinity_debounced with correct syntax
CREATE OR REPLACE FUNCTION update_user_affinity_debounced()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_TABLE_NAME = 'likes' THEN
    INSERT INTO user_affinity (user_id, target_user_id, interaction_count, affinity_score, last_interaction_at)
    SELECT NEW.user_id, p.user_id, 1, 1.0, now()
    FROM posts p 
    WHERE p.id = NEW.post_id AND p.user_id != NEW.user_id
    ON CONFLICT (user_id, target_user_id) 
    DO UPDATE SET 
      interaction_count = user_affinity.interaction_count + 1,
      affinity_score = user_affinity.affinity_score + 0.3,
      last_interaction_at = now()
    WHERE user_affinity.last_interaction_at < now() - INTERVAL '5 minutes';
    
  ELSIF TG_TABLE_NAME = 'comments' THEN
    INSERT INTO user_affinity (user_id, target_user_id, interaction_count, affinity_score, last_interaction_at)
    SELECT NEW.user_id, p.user_id, 1, 2.0, now()
    FROM posts p 
    WHERE p.id = NEW.post_id AND p.user_id != NEW.user_id
    ON CONFLICT (user_id, target_user_id) 
    DO UPDATE SET 
      interaction_count = user_affinity.interaction_count + 1,
      affinity_score = user_affinity.affinity_score + 0.8,
      last_interaction_at = now()
    WHERE user_affinity.last_interaction_at < now() - INTERVAL '5 minutes';
    
  ELSIF TG_TABLE_NAME = 'post_shares' THEN
    INSERT INTO user_affinity (user_id, target_user_id, interaction_count, affinity_score, last_interaction_at)
    SELECT NEW.shared_by, p.user_id, 1, 3.0, now()
    FROM posts p 
    WHERE p.id = NEW.post_id AND p.user_id != NEW.shared_by
    ON CONFLICT (user_id, target_user_id) 
    DO UPDATE SET 
      interaction_count = user_affinity.interaction_count + 1,
      affinity_score = user_affinity.affinity_score + 1.2,
      last_interaction_at = now()
    WHERE user_affinity.last_interaction_at < now() - INTERVAL '5 minutes';
  END IF;
  
  RETURN NEW;
END;
$$;