-- Add index for better performance on online status queries
CREATE INDEX IF NOT EXISTS idx_user_presence_online ON user_presence(online) WHERE online = true;
CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen ON user_presence(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_user_presence_user_id ON user_presence(user_id);