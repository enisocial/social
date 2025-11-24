-- ============================================================================
-- MIGRATION: Performance Indexes for Scale
-- Description: Add critical indexes for high-traffic queries
-- Impact: Dramatically improves query performance for feeds, timelines, and stats
-- Note: Indexes created without CONCURRENTLY for migration compatibility
-- ============================================================================

-- Posts indexes (most critical for feed queries)
CREATE INDEX IF NOT EXISTS idx_posts_user_created 
  ON posts(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_created 
  ON posts(created_at DESC) 
  WHERE privacy = 'public';

CREATE INDEX IF NOT EXISTS idx_posts_privacy_created 
  ON posts(privacy, created_at DESC);

-- Likes indexes (for post stats and user activity)
CREATE INDEX IF NOT EXISTS idx_likes_post_id 
  ON likes(post_id);

CREATE INDEX IF NOT EXISTS idx_likes_user_post 
  ON likes(user_id, post_id);

CREATE INDEX IF NOT EXISTS idx_likes_created 
  ON likes(created_at DESC);

-- Comments indexes (for post engagement)
CREATE INDEX IF NOT EXISTS idx_comments_post_created 
  ON comments(post_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comments_user_id 
  ON comments(user_id);

CREATE INDEX IF NOT EXISTS idx_comments_parent 
  ON comments(parent_comment_id) 
  WHERE parent_comment_id IS NOT NULL;

-- Follows indexes (for social graph queries)
CREATE INDEX IF NOT EXISTS idx_follows_follower 
  ON follows(follower_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_follows_following 
  ON follows(following_id, created_at DESC);

-- Friend requests indexes (for connection queries)
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender_status 
  ON friend_requests(sender_id, status);

CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver_status 
  ON friend_requests(receiver_id, status);

-- Messages indexes (for conversations)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
  ON messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_sender 
  ON messages(sender_id, created_at DESC);

-- Conversation participants indexes
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user 
  ON conversation_participants(user_id, last_read_at DESC);

-- Notifications indexes (for user alerts)
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created 
  ON notifications(user_id, read, created_at DESC);

-- Post reactions indexes
CREATE INDEX IF NOT EXISTS idx_post_reactions_post_type 
  ON post_reactions(post_id, reaction_type);

CREATE INDEX IF NOT EXISTS idx_post_reactions_user 
  ON post_reactions(user_id, created_at DESC);

-- Post views indexes (for analytics)
CREATE INDEX IF NOT EXISTS idx_post_views_post_viewed 
  ON post_views(post_id, viewed_at DESC);

-- Engagement signals indexes (for ML/recommendations)
CREATE INDEX IF NOT EXISTS idx_engagement_signals_user_created 
  ON engagement_signals(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_engagement_signals_post_type 
  ON engagement_signals(post_id, signal_type);

-- ============================================================================
-- VACUUM ANALYZE to update statistics
-- ============================================================================
ANALYZE posts;
ANALYZE likes;
ANALYZE comments;
ANALYZE follows;
ANALYZE messages;
ANALYZE notifications;
ANALYZE post_reactions;
ANALYZE friend_requests;