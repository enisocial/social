
-- ============================================
-- MIGRATION PORTABILITÉ COMPLÈTE (CORRIGÉE)
-- Garantit 100% portabilité sur tout Supabase
-- ============================================

-- SECTION 1: Valeurs par défaut critiques
ALTER TABLE conversation_participants 
ALTER COLUMN unread_count SET DEFAULT 0,
ALTER COLUMN unread_count SET NOT NULL;

ALTER TABLE user_presence
ALTER COLUMN online SET DEFAULT false,
ALTER COLUMN last_seen SET DEFAULT now(),
ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE notifications
ALTER COLUMN read SET DEFAULT false;

ALTER TABLE messages
ALTER COLUMN read SET DEFAULT false,
ALTER COLUMN edited SET DEFAULT false;

-- SECTION 2: Initialisation données NULL
UPDATE conversation_participants SET unread_count = 0 WHERE unread_count IS NULL;
UPDATE user_stats SET posts_count = 0 WHERE posts_count IS NULL;
UPDATE user_stats SET followers_count = 0 WHERE followers_count IS NULL;
UPDATE user_stats SET following_count = 0 WHERE following_count IS NULL;

-- SECTION 3: Triggers conversations updated_at
CREATE OR REPLACE FUNCTION update_conversations_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_conversations_updated_at ON conversations;
CREATE TRIGGER trigger_update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_conversations_updated_at();

-- SECTION 4: Index de performance
CREATE INDEX IF NOT EXISTS idx_messages_sender_conversation 
  ON messages(sender_id, conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_message_status_read 
  ON message_status(user_id, read_at) 
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
  ON notifications(user_id, read) 
  WHERE read = false;

CREATE INDEX IF NOT EXISTS idx_notifications_created 
  ON notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_presence_online 
  ON user_presence(user_id, online) 
  WHERE online = true;

CREATE INDEX IF NOT EXISTS idx_posts_user_created 
  ON posts(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_privacy_created 
  ON posts(privacy, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_friend_requests_status 
  ON friend_requests(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver_status 
  ON friend_requests(receiver_id, status);

-- SECTION 5: Fonctions utilitaires
CREATE OR REPLACE FUNCTION get_total_unread_notifications(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM notifications
  WHERE user_id = p_user_id
    AND read = false;
$$;

CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE notifications
  SET read = true
  WHERE user_id = p_user_id
    AND read = false;
END;
$$;

-- SECTION 6: Contraintes uniques
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'conversation_participants_user_conversation_unique'
  ) THEN
    ALTER TABLE conversation_participants
    ADD CONSTRAINT conversation_participants_user_conversation_unique
    UNIQUE (user_id, conversation_id);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'message_status_user_message_unique'
  ) THEN
    ALTER TABLE message_status
    ADD CONSTRAINT message_status_user_message_unique
    UNIQUE (user_id, message_id);
  END IF;
END $$;

-- SECTION 7: Realtime (vérification si existe avant ajout)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_presence'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'posts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE posts;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'likes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE likes;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE comments;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'friend_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE friend_requests;
  END IF;
END $$;

-- SECTION 8: Documentation
COMMENT ON TABLE conversation_participants IS 'Participants avec unread_count auto-incrémenté';
COMMENT ON TABLE user_presence IS 'Présence utilisateur mise à jour par update_user_presence()';
COMMENT ON TABLE notifications IS 'Notifications avec read=false par défaut';
COMMENT ON TABLE messages IS 'Messages avec trigger auto-incrémentation unread_count';
