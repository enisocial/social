-- ============================================================================
-- MIGRATION: Enable RLS for Stats Tables
-- Description: Secure post_stats and user_stats tables with RLS policies
-- ============================================================================

-- Enable RLS on post_stats
ALTER TABLE post_stats ENABLE ROW LEVEL SECURITY;

-- Post stats are readable by everyone
CREATE POLICY "Post stats are viewable by everyone"
  ON post_stats
  FOR SELECT
  USING (true);

-- Only system can insert/update/delete post_stats (via triggers)
CREATE POLICY "System can manage post_stats"
  ON post_stats
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Enable RLS on user_stats
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- User stats are readable by everyone
CREATE POLICY "User stats are viewable by everyone"
  ON user_stats
  FOR SELECT
  USING (true);

-- Only system can insert/update/delete user_stats (via triggers)
CREATE POLICY "System can manage user_stats"
  ON user_stats
  FOR ALL
  USING (false)
  WITH CHECK (false);