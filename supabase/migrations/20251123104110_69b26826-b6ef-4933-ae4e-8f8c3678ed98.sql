-- ============================================================================
-- CRITICAL OPTIMIZATIONS: Fix Remaining Performance Issues
-- ============================================================================

-- 1. GIN INDEXES FOR GEOGRAPHIC SEARCH
-- ============================================
-- Enable faster location-based friend suggestions with trigram similarity
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN indexes for fast geographic searches using trigram similarity
CREATE INDEX IF NOT EXISTS idx_profiles_city_gin 
ON profiles USING gin (city gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_profiles_region_gin 
ON profiles USING gin (region gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_profiles_country_gin 
ON profiles USING gin (country gin_trgm_ops);


-- 2. OPTIMIZE update_user_affinity TRIGGER (Add Debouncing)
-- ============================================
DROP TRIGGER IF EXISTS trg_update_affinity_likes ON likes;
DROP TRIGGER IF EXISTS trg_update_affinity_comments ON comments;
DROP TRIGGER IF EXISTS trg_update_affinity_shares ON post_shares;

CREATE OR REPLACE FUNCTION update_user_affinity_debounced()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  -- Only update affinity if last interaction was > 5 minutes ago (aggressive debouncing)
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
    WHERE user_affinity.last_interaction_at < now() - INTERVAL '5 minutes'; -- 5 min debounce
    
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

-- Re-create triggers with new debounced function
CREATE TRIGGER trg_update_affinity_likes
AFTER INSERT ON likes
FOR EACH ROW
EXECUTE FUNCTION update_user_affinity_debounced();

CREATE TRIGGER trg_update_affinity_comments
AFTER INSERT ON comments
FOR EACH ROW
EXECUTE FUNCTION update_user_affinity_debounced();

CREATE TRIGGER trg_update_affinity_shares
AFTER INSERT ON post_shares
FOR EACH ROW
EXECUTE FUNCTION update_user_affinity_debounced();


-- 3. REMOVE DUPLICATE RPC FUNCTION
-- ============================================
-- Drop the older, less efficient get_friend_suggestions
DROP FUNCTION IF EXISTS get_friend_suggestions(UUID, INTEGER);

-- Keep only get_batch_friend_suggestions (already optimized with materialized view)