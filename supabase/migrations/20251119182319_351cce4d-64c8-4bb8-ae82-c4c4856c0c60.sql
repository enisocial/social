-- =============================================
-- PHASE 1: Core Messaging System Migration
-- Améliore l'existant + ajoute fonctionnalités manquantes
-- =============================================

-- 1. Améliorer la table conversations
ALTER TABLE conversations 
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'dm' CHECK (type IN ('dm', 'group')),
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- 2. Améliorer la table conversation_participants
ALTER TABLE conversation_participants
  ADD COLUMN IF NOT EXISTS role text DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  ADD COLUMN IF NOT EXISTS unread_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_read_at timestamptz;

-- 3. Améliorer la table messages
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS reply_to uuid REFERENCES messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS edited boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reactions jsonb DEFAULT '[]'::jsonb;

-- 4. Créer table message_status pour read receipts avancés
CREATE TABLE IF NOT EXISTS message_status (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- 5. Créer table user_presence pour tracking online/offline
CREATE TABLE IF NOT EXISTS user_presence (
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  online boolean DEFAULT false,
  last_seen timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 6. Créer table typing_status pour typing indicators
CREATE TABLE IF NOT EXISTS typing_status (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  is_typing boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- =============================================
-- INDEXES pour performance
-- =============================================

-- Conversations
CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type);

-- Conversation participants
CREATE INDEX IF NOT EXISTS idx_conv_participant ON conversation_participants(conversation_id, user_id);
CREATE INDEX IF NOT EXISTS idx_participant_user ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participant_unread ON conversation_participants(user_id, unread_count) WHERE unread_count > 0;

-- Messages
CREATE INDEX IF NOT EXISTS idx_messages_conv_time ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_reply ON messages(reply_to) WHERE reply_to IS NOT NULL;

-- Full-text search sur messages (extension pg_trgm requise)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_messages_content_trgm ON messages USING gin (content gin_trgm_ops);

-- Message status
CREATE INDEX IF NOT EXISTS idx_msg_status_message ON message_status(message_id);
CREATE INDEX IF NOT EXISTS idx_msg_status_user ON message_status(user_id);
CREATE INDEX IF NOT EXISTS idx_msg_status_unread ON message_status(user_id) WHERE read_at IS NULL;

-- User presence
CREATE INDEX IF NOT EXISTS idx_presence_online ON user_presence(online) WHERE online = true;
CREATE INDEX IF NOT EXISTS idx_presence_last_seen ON user_presence(last_seen DESC);

-- Typing status
CREATE INDEX IF NOT EXISTS idx_typing_conv ON typing_status(conversation_id);
CREATE INDEX IF NOT EXISTS idx_typing_active ON typing_status(conversation_id, is_typing) WHERE is_typing = true;

-- =============================================
-- FONCTIONS HELPER pour performance
-- =============================================

-- Fonction pour mettre à jour unread_count automatiquement
CREATE OR REPLACE FUNCTION update_unread_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Increment unread_count pour tous les participants sauf l'expéditeur
  UPDATE conversation_participants
  SET unread_count = unread_count + 1
  WHERE conversation_id = NEW.conversation_id
    AND user_id != NEW.sender_id;
  
  RETURN NEW;
END;
$$;

-- Trigger pour unread_count
DROP TRIGGER IF EXISTS trigger_update_unread ON messages;
CREATE TRIGGER trigger_update_unread
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_unread_count();

-- Fonction pour reset unread_count
CREATE OR REPLACE FUNCTION reset_unread_count(
  p_conversation_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE conversation_participants
  SET unread_count = 0,
      last_read_at = now()
  WHERE conversation_id = p_conversation_id
    AND user_id = p_user_id;
END;
$$;

-- Fonction pour créer message_status automatiquement pour tous les participants
CREATE OR REPLACE FUNCTION create_message_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Créer message_status pour chaque participant (sauf expéditeur)
  INSERT INTO message_status (message_id, user_id, delivered_at)
  SELECT NEW.id, cp.user_id, now()
  FROM conversation_participants cp
  WHERE cp.conversation_id = NEW.conversation_id
    AND cp.user_id != NEW.sender_id;
  
  RETURN NEW;
END;
$$;

-- Trigger pour message_status
DROP TRIGGER IF EXISTS trigger_create_message_status ON messages;
CREATE TRIGGER trigger_create_message_status
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION create_message_status();

-- Fonction pour update presence automatiquement
CREATE OR REPLACE FUNCTION update_user_presence(
  p_user_id uuid,
  p_online boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_presence (user_id, online, last_seen, updated_at)
  VALUES (p_user_id, p_online, now(), now())
  ON CONFLICT (user_id) DO UPDATE
  SET online = p_online,
      last_seen = CASE WHEN NOT p_online THEN now() ELSE user_presence.last_seen END,
      updated_at = now();
END;
$$;

-- Fonction pour update typing status
CREATE OR REPLACE FUNCTION update_typing_status(
  p_conversation_id uuid,
  p_user_id uuid,
  p_is_typing boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO typing_status (conversation_id, user_id, is_typing, updated_at)
  VALUES (p_conversation_id, p_user_id, p_is_typing, now())
  ON CONFLICT (conversation_id, user_id) DO UPDATE
  SET is_typing = p_is_typing,
      updated_at = now();
      
  -- Auto-cleanup typing status after 10 seconds
  IF NOT p_is_typing THEN
    DELETE FROM typing_status
    WHERE conversation_id = p_conversation_id
      AND user_id = p_user_id;
  END IF;
END;
$$;

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS sur nouvelles tables
ALTER TABLE message_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_status ENABLE ROW LEVEL SECURITY;

-- RLS policies pour message_status
CREATE POLICY "Users can view message status for their conversations"
  ON message_status FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = (
        SELECT conversation_id FROM messages WHERE id = message_status.message_id
      )
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own message status"
  ON message_status FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can insert message status"
  ON message_status FOR INSERT
  WITH CHECK (true);

-- RLS policies pour user_presence
CREATE POLICY "Anyone can view user presence"
  ON user_presence FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own presence"
  ON user_presence FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS policies pour typing_status
CREATE POLICY "Users can view typing in their conversations"
  ON typing_status FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = typing_status.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own typing status"
  ON typing_status FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =============================================
-- ENABLE REALTIME sur nouvelles tables
-- =============================================

ALTER PUBLICATION supabase_realtime ADD TABLE message_status;
ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE typing_status;