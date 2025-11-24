-- ============================================================================
-- MIGRATION: Database Optimization for Scale
-- Description: Optimize database for millions of users with indexes, 
--              partitioning, and performance improvements
-- ============================================================================

-- ============================================================================
-- SECTION 1: Critical Indexes for Performance
-- ============================================================================

-- Posts table indexes
CREATE INDEX IF NOT EXISTS idx_posts_user_created ON posts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_privacy_created ON posts(privacy, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);

-- Messages table indexes (critical for messenger performance)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

-- Conversation participants indexes
CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_conv ON conversation_participants(conversation_id);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read, created_at DESC);

-- Likes and reactions indexes
CREATE INDEX IF NOT EXISTS idx_likes_post_user ON likes(post_id, user_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_post_user ON post_reactions(post_id, user_id);

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_comments_post_created ON comments(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);

-- Friend requests indexes
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender_status ON friend_requests(sender_id, status);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver_status ON friend_requests(receiver_id, status);

-- Post shares indexes
CREATE INDEX IF NOT EXISTS idx_post_shares_post ON post_shares(post_id);
CREATE INDEX IF NOT EXISTS idx_post_shares_user ON post_shares(shared_by);

-- Engagement signals indexes
CREATE INDEX IF NOT EXISTS idx_engagement_signals_user_post ON engagement_signals(user_id, post_id);
CREATE INDEX IF NOT EXISTS idx_engagement_signals_post_created ON engagement_signals(post_id, created_at DESC);

-- Message status indexes
CREATE INDEX IF NOT EXISTS idx_message_status_message_user ON message_status(message_id, user_id);
CREATE INDEX IF NOT EXISTS idx_message_status_user_read ON message_status(user_id, read_at);

-- User presence indexes
CREATE INDEX IF NOT EXISTS idx_user_presence_online ON user_presence(online, last_seen DESC);

-- ============================================================================
-- SECTION 2: Composite Indexes for Complex Queries
-- ============================================================================

-- For feed queries
CREATE INDEX IF NOT EXISTS idx_posts_feed_optimization ON posts(privacy, created_at DESC, user_id) 
WHERE privacy IN ('public', 'friends');

-- For friend suggestions
CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles(country, region, city);

-- For search functionality
CREATE INDEX IF NOT EXISTS idx_profiles_search ON profiles USING gin(
  to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(username, '') || ' ' || COALESCE(bio, ''))
);

-- ============================================================================
-- SECTION 3: Automatic Cleanup Functions
-- ============================================================================

-- Function to cleanup old read notifications (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM notifications
  WHERE read = true
    AND created_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Function to cleanup old engagement signals (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_engagement_signals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM engagement_signals
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

-- Function to cleanup old typing status
CREATE OR REPLACE FUNCTION cleanup_old_typing_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM typing_status
  WHERE updated_at < NOW() - INTERVAL '1 minute';
END;
$$;

-- ============================================================================
-- SECTION 4: Optimized Functions
-- ============================================================================

-- Optimized function to get unread messages count
CREATE OR REPLACE FUNCTION get_unread_messages_count(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(unread_count), 0)::integer
  FROM conversation_participants
  WHERE user_id = p_user_id;
$$;

-- Optimized function to check if users are friends
CREATE OR REPLACE FUNCTION are_friends(user1_id uuid, user2_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM friend_requests
    WHERE status = 'accepted'
    AND ((sender_id = user1_id AND receiver_id = user2_id)
      OR (sender_id = user2_id AND receiver_id = user1_id))
  )
$$;

-- ============================================================================
-- SECTION 5: Materialized View for User Stats (faster reads)
-- ============================================================================

-- Create materialized view for user stats aggregation
CREATE MATERIALIZED VIEW IF NOT EXISTS user_stats_mv AS
SELECT 
  p.id as user_id,
  COUNT(DISTINCT posts.id) as posts_count,
  COUNT(DISTINCT friends.id) as friends_count,
  COUNT(DISTINCT followers.id) as followers_count,
  COUNT(DISTINCT following.id) as following_count
FROM profiles p
LEFT JOIN posts ON posts.user_id = p.id
LEFT JOIN friend_requests friends ON 
  ((friends.sender_id = p.id OR friends.receiver_id = p.id) AND friends.status = 'accepted')
LEFT JOIN follows followers ON followers.following_id = p.id
LEFT JOIN follows following ON following.follower_id = p.id
GROUP BY p.id;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_stats_mv_user ON user_stats_mv(user_id);

-- Function to refresh user stats materialized view
CREATE OR REPLACE FUNCTION refresh_user_stats_mv()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_stats_mv;
END;
$$;

-- ============================================================================
-- SECTION 6: Query Performance Settings
-- ============================================================================

-- Optimize autovacuum for high-traffic tables
ALTER TABLE posts SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);

ALTER TABLE messages SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);

ALTER TABLE notifications SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);

-- ============================================================================
-- SECTION 7: Connection Pooling Optimization
-- ============================================================================

-- Set statement timeout to prevent long-running queries
ALTER DATABASE postgres SET statement_timeout = '30s';

-- Set reasonable work_mem for complex queries
ALTER DATABASE postgres SET work_mem = '256MB';

-- ============================================================================
-- SECTION 8: Batch Operations Helper Functions
-- ============================================================================

-- Batch mark notifications as read
CREATE OR REPLACE FUNCTION batch_mark_notifications_read(p_user_id uuid, p_notification_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE notifications
  SET read = true
  WHERE user_id = p_user_id
    AND id = ANY(p_notification_ids);
END;
$$;

-- Batch delete old messages
CREATE OR REPLACE FUNCTION batch_delete_old_messages(p_conversation_id uuid, p_older_than interval)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  WITH deleted AS (
    DELETE FROM messages
    WHERE conversation_id = p_conversation_id
      AND created_at < NOW() - p_older_than
      AND pinned_by IS NULL
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$;

-- ============================================================================
-- SECTION 9: Performance Monitoring Functions
-- ============================================================================

-- Function to get slow queries
CREATE OR REPLACE FUNCTION get_table_sizes()
RETURNS TABLE(
  table_name text,
  row_count bigint,
  total_size text,
  index_size text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    schemaname || '.' || tablename as table_name,
    n_live_tup as row_count,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$;