-- ============================================================================
-- MIGRATION: Atomic Triggers for Stats Maintenance
-- Description: Maintain denormalized counters atomically with triggers
-- Impact: Real-time stats updates without N+1 queries
-- ============================================================================

-- ============================================================================
-- TABLE: post_stats (denormalized stats for performance)
-- ============================================================================
CREATE TABLE IF NOT EXISTS post_stats (
  post_id UUID PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
  likes_count INTEGER DEFAULT 0 NOT NULL,
  comments_count INTEGER DEFAULT 0 NOT NULL,
  shares_count INTEGER DEFAULT 0 NOT NULL,
  views_count INTEGER DEFAULT 0 NOT NULL,
  engagement_score NUMERIC DEFAULT 0 NOT NULL,
  last_updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_post_stats_engagement 
  ON post_stats(engagement_score DESC, last_updated_at DESC);

-- ============================================================================
-- FUNCTION: Initialize post stats
-- ============================================================================
CREATE OR REPLACE FUNCTION initialize_post_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO post_stats (post_id, likes_count, comments_count, shares_count, views_count)
  VALUES (NEW.id, 0, 0, 0, 0)
  ON CONFLICT (post_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_initialize_post_stats ON posts;
CREATE TRIGGER trigger_initialize_post_stats
  AFTER INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION initialize_post_stats();

-- ============================================================================
-- FUNCTION: Update likes count atomically
-- ============================================================================
CREATE OR REPLACE FUNCTION update_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE post_stats 
    SET likes_count = likes_count + 1,
        engagement_score = engagement_score + 2,
        last_updated_at = NOW()
    WHERE post_id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE post_stats 
    SET likes_count = GREATEST(0, likes_count - 1),
        engagement_score = GREATEST(0, engagement_score - 2),
        last_updated_at = NOW()
    WHERE post_id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_likes_count ON likes;
CREATE TRIGGER trigger_update_likes_count
  AFTER INSERT OR DELETE ON likes
  FOR EACH ROW
  EXECUTE FUNCTION update_likes_count();

-- ============================================================================
-- FUNCTION: Update comments count atomically
-- ============================================================================
CREATE OR REPLACE FUNCTION update_comments_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE post_stats 
    SET comments_count = comments_count + 1,
        engagement_score = engagement_score + 3,
        last_updated_at = NOW()
    WHERE post_id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE post_stats 
    SET comments_count = GREATEST(0, comments_count - 1),
        engagement_score = GREATEST(0, engagement_score - 3),
        last_updated_at = NOW()
    WHERE post_id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_comments_count ON comments;
CREATE TRIGGER trigger_update_comments_count
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_comments_count();

-- ============================================================================
-- FUNCTION: Update shares count atomically
-- ============================================================================
CREATE OR REPLACE FUNCTION update_shares_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE post_stats 
    SET shares_count = shares_count + 1,
        engagement_score = engagement_score + 5,
        last_updated_at = NOW()
    WHERE post_id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE post_stats 
    SET shares_count = GREATEST(0, shares_count - 1),
        engagement_score = GREATEST(0, engagement_score - 5),
        last_updated_at = NOW()
    WHERE post_id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_shares_count ON post_shares;
CREATE TRIGGER trigger_update_shares_count
  AFTER INSERT OR DELETE ON post_shares
  FOR EACH ROW
  EXECUTE FUNCTION update_shares_count();

-- ============================================================================
-- FUNCTION: Update views count atomically
-- ============================================================================
CREATE OR REPLACE FUNCTION update_views_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE post_stats 
  SET views_count = views_count + 1,
      engagement_score = engagement_score + 0.5,
      last_updated_at = NOW()
  WHERE post_id = NEW.post_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_views_count ON post_views;
CREATE TRIGGER trigger_update_views_count
  AFTER INSERT ON post_views
  FOR EACH ROW
  EXECUTE FUNCTION update_views_count();

-- ============================================================================
-- TABLE: user_stats (denormalized user stats)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_stats (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  posts_count INTEGER DEFAULT 0 NOT NULL,
  followers_count INTEGER DEFAULT 0 NOT NULL,
  following_count INTEGER DEFAULT 0 NOT NULL,
  likes_received INTEGER DEFAULT 0 NOT NULL,
  last_updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_stats_followers 
  ON user_stats(followers_count DESC);

-- ============================================================================
-- FUNCTION: Initialize user stats
-- ============================================================================
CREATE OR REPLACE FUNCTION initialize_user_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_stats (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_initialize_user_stats ON profiles;
CREATE TRIGGER trigger_initialize_user_stats
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_stats();

-- ============================================================================
-- FUNCTION: Update followers count atomically
-- ============================================================================
CREATE OR REPLACE FUNCTION update_followers_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment followers for the followed user
    UPDATE user_stats 
    SET followers_count = followers_count + 1,
        last_updated_at = NOW()
    WHERE user_id = NEW.following_id;
    
    -- Increment following for the follower
    UPDATE user_stats 
    SET following_count = following_count + 1,
        last_updated_at = NOW()
    WHERE user_id = NEW.follower_id;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement followers
    UPDATE user_stats 
    SET followers_count = GREATEST(0, followers_count - 1),
        last_updated_at = NOW()
    WHERE user_id = OLD.following_id;
    
    -- Decrement following
    UPDATE user_stats 
    SET following_count = GREATEST(0, following_count - 1),
        last_updated_at = NOW()
    WHERE user_id = OLD.follower_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_followers_count ON follows;
CREATE TRIGGER trigger_update_followers_count
  AFTER INSERT OR DELETE ON follows
  FOR EACH ROW
  EXECUTE FUNCTION update_followers_count();

-- ============================================================================
-- FUNCTION: Update posts count atomically
-- ============================================================================
CREATE OR REPLACE FUNCTION update_posts_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE user_stats 
    SET posts_count = posts_count + 1,
        last_updated_at = NOW()
    WHERE user_id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_stats 
    SET posts_count = GREATEST(0, posts_count - 1),
        last_updated_at = NOW()
    WHERE user_id = OLD.user_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_posts_count ON posts;
CREATE TRIGGER trigger_update_posts_count
  AFTER INSERT OR DELETE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_posts_count();

-- ============================================================================
-- Backfill existing stats (run once)
-- ============================================================================
INSERT INTO post_stats (post_id, likes_count, comments_count, shares_count, views_count, engagement_score)
SELECT 
  p.id,
  COALESCE(l.count, 0) as likes_count,
  COALESCE(c.count, 0) as comments_count,
  COALESCE(s.count, 0) as shares_count,
  COALESCE(v.count, 0) as views_count,
  (COALESCE(l.count, 0) * 2 + COALESCE(c.count, 0) * 3 + COALESCE(s.count, 0) * 5 + COALESCE(v.count, 0) * 0.5) as engagement_score
FROM posts p
LEFT JOIN (SELECT post_id, COUNT(*) as count FROM likes GROUP BY post_id) l ON l.post_id = p.id
LEFT JOIN (SELECT post_id, COUNT(*) as count FROM comments GROUP BY post_id) c ON c.post_id = p.id
LEFT JOIN (SELECT post_id, COUNT(*) as count FROM post_shares GROUP BY post_id) s ON s.post_id = p.id
LEFT JOIN (SELECT post_id, COUNT(*) as count FROM post_views GROUP BY post_id) v ON v.post_id = p.id
ON CONFLICT (post_id) DO UPDATE SET
  likes_count = EXCLUDED.likes_count,
  comments_count = EXCLUDED.comments_count,
  shares_count = EXCLUDED.shares_count,
  views_count = EXCLUDED.views_count,
  engagement_score = EXCLUDED.engagement_score;

INSERT INTO user_stats (user_id, posts_count, followers_count, following_count)
SELECT 
  p.id,
  COALESCE(posts.count, 0) as posts_count,
  COALESCE(followers.count, 0) as followers_count,
  COALESCE(following.count, 0) as following_count
FROM profiles p
LEFT JOIN (SELECT user_id, COUNT(*) as count FROM posts GROUP BY user_id) posts ON posts.user_id = p.id
LEFT JOIN (SELECT following_id, COUNT(*) as count FROM follows GROUP BY following_id) followers ON followers.following_id = p.id
LEFT JOIN (SELECT follower_id, COUNT(*) as count FROM follows GROUP BY follower_id) following ON following.follower_id = p.id
ON CONFLICT (user_id) DO UPDATE SET
  posts_count = EXCLUDED.posts_count,
  followers_count = EXCLUDED.followers_count,
  following_count = EXCLUDED.following_count;