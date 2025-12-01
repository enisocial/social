-- Migration: Create Chat System for S-ocial.com
-- Date: December 1, 2025
-- Description: Base schema for 1:1 instant messaging system

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ===========================================
-- CONVERSATIONS TABLE (1:1 only for MVP)
-- ===========================================
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(20) NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  name VARCHAR(255), -- NULL for direct conversations
  description TEXT,
  avatar_url TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Indexes for performance
  INDEX idx_conversations_created_by (created_by),
  INDEX idx_conversations_last_message (last_message_at DESC),
  INDEX idx_conversations_active (is_active) WHERE is_active = true
);

-- ===========================================
-- CONVERSATION PARTICIPANTS (for 1:1 chats)
-- ===========================================
CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Ensure only 2 participants for direct conversations
  CONSTRAINT unique_direct_participants EXCLUDE (
    conversation_id WITH =,
    user_id WITH =
  ) WHERE (conversation_id IN (
    SELECT id FROM conversations WHERE type = 'direct'
  )),

  -- Unique constraint per conversation
  UNIQUE(conversation_id, user_id),

  -- Indexes
  INDEX idx_participants_conversation (conversation_id),
  INDEX idx_participants_user (user_id),
  INDEX idx_participants_active (is_active) WHERE is_active = true
);

-- ===========================================
-- MESSAGES TABLE (optimized for performance)
-- ===========================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,

  -- Content (mutually exclusive)
  content TEXT,
  media_url TEXT,
  media_type VARCHAR(50), -- 'image', 'video', 'audio', 'file'
  media_name TEXT,
  media_size INTEGER, -- bytes
  media_duration INTEGER, -- seconds for audio/video

  -- Status tracking
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,

  -- Metadata
  is_system_message BOOLEAN NOT NULL DEFAULT false,
  system_message_type VARCHAR(50), -- 'user_joined', 'user_left', etc.

  -- Full-text search
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('french', COALESCE(content, ''))
  ) STORED,

  -- Indexes for performance
  INDEX idx_messages_conversation_time (conversation_id, created_at DESC),
  INDEX idx_messages_sender_time (sender_id, created_at DESC),
  INDEX idx_messages_status (delivered_at, read_at) WHERE delivered_at IS NOT NULL,
  INDEX idx_messages_search (search_vector) WHERE content IS NOT NULL,
  INDEX idx_messages_reply (reply_to_id) WHERE reply_to_id IS NOT NULL,
  INDEX idx_messages_active (deleted_at) WHERE deleted_at IS NULL
);

-- ===========================================
-- MESSAGE REACTIONS
-- ===========================================
CREATE TABLE message_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(message_id, user_id, emoji),
  INDEX idx_reactions_message (message_id),
  INDEX idx_reactions_user (user_id)
);

-- ===========================================
-- TYPING INDICATORS (temporary state)
-- ===========================================
CREATE TABLE typing_indicators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(conversation_id, user_id)
);

-- ===========================================
-- FUNCTIONS & TRIGGERS
-- ===========================================

-- Function to update conversation last_message_at
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET
    last_message_at = NEW.created_at,
    last_message_preview = CASE
      WHEN NEW.media_type IS NOT NULL THEN
        CASE NEW.media_type
          WHEN 'image' THEN '📷 Image'
          WHEN 'video' THEN '🎥 Vidéo'
          WHEN 'audio' THEN '🎵 Audio'
          ELSE '📎 Fichier'
        END
      ELSE LEFT(NEW.content, 100)
    END,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for last message update
CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- Function to mark messages as delivered
CREATE OR REPLACE FUNCTION mark_messages_delivered(
  p_conversation_id UUID,
  p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE messages
  SET delivered_at = NOW()
  WHERE conversation_id = p_conversation_id
    AND sender_id != p_user_id
    AND delivered_at IS NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_read(
  p_conversation_id UUID,
  p_user_id UUID,
  p_message_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE messages
  SET read_at = NOW()
  WHERE conversation_id = p_conversation_id
    AND sender_id != p_user_id
    AND read_at IS NULL
    AND (p_message_ids IS NULL OR id = ANY(p_message_ids));

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  -- Update participant last_read_at
  UPDATE conversation_participants
  SET last_read_at = NOW()
  WHERE conversation_id = p_conversation_id
    AND user_id = p_user_id;

  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- RLS POLICIES (Row Level Security)
-- ===========================================

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

-- Conversations: Users can see conversations they're part of
CREATE POLICY "Users can view their conversations" ON conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversations.id
      AND cp.user_id = auth.uid()
      AND cp.is_active = true
    )
  );

-- Conversation Participants: Users can see participants of conversations they're in
CREATE POLICY "Users can view conversation participants" ON conversation_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
      AND cp.is_active = true
    )
  );

-- Messages: Users can see messages from conversations they're part of
CREATE POLICY "Users can view messages in their conversations" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
      AND cp.user_id = auth.uid()
      AND cp.is_active = true
    )
  );

-- Messages: Users can insert messages in conversations they're part of
CREATE POLICY "Users can send messages in their conversations" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
      AND cp.user_id = auth.uid()
      AND cp.is_active = true
    )
  );

-- Messages: Users can update their own messages
CREATE POLICY "Users can edit their own messages" ON messages
  FOR UPDATE USING (
    sender_id = auth.uid() AND
    deleted_at IS NULL
  );

-- Message Reactions: Users can manage reactions in their conversations
CREATE POLICY "Users can manage reactions in their conversations" ON message_reactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      JOIN messages m ON m.conversation_id = cp.conversation_id
      WHERE m.id = message_reactions.message_id
      AND cp.user_id = auth.uid()
      AND cp.is_active = true
    )
  );

-- Typing Indicators: Users can manage their own typing status
CREATE POLICY "Users can manage their typing indicators" ON typing_indicators
  FOR ALL USING (user_id = auth.uid());

-- ===========================================
-- INITIAL DATA (for testing)
-- ===========================================

-- Note: Insert statements will be added after user profiles exist
-- This migration sets up the base schema only

COMMENT ON TABLE conversations IS 'Chat conversations (direct 1:1 only for MVP)';
COMMENT ON TABLE conversation_participants IS 'Users participating in conversations';
COMMENT ON TABLE messages IS 'Chat messages with media support and status tracking';
COMMENT ON TABLE message_reactions IS 'Emoji reactions on messages';
COMMENT ON TABLE typing_indicators IS 'Real-time typing status (temporary state)';
