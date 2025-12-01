-- 🚀 S-ocial.com Messenger System - Base Migration
-- Création des tables pour le système de messagerie 1:1 complet
-- Compatible avec les utilisateurs et permissions existants

-- ===========================================
-- TABLE: Conversations 1:1
-- ===========================================
CREATE TABLE IF NOT EXISTS messenger_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participant2_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Contraintes
  CONSTRAINT different_participants CHECK (participant1_id != participant2_id),
  CONSTRAINT ordered_participants CHECK (participant1_id < participant2_id),
  UNIQUE(participant1_id, participant2_id)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_messenger_conversations_participants
  ON messenger_conversations(participant1_id, participant2_id);
CREATE INDEX IF NOT EXISTS idx_messenger_conversations_updated
  ON messenger_conversations(updated_at DESC);

-- ===========================================
-- TABLE: Messages
-- ===========================================
CREATE TABLE IF NOT EXISTS messenger_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES messenger_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT,
  message_type VARCHAR(50) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'audio', 'file', 'sticker', 'gif')),
  media_url TEXT,
  media_type VARCHAR(100),
  media_size INTEGER,
  media_name VARCHAR(255),
  thumbnail_url TEXT,
  reply_to_id UUID REFERENCES messenger_messages(id) ON DELETE SET NULL,
  forwarded_from_id UUID REFERENCES messenger_messages(id) ON DELETE SET NULL,
  is_edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ, -- Pour messages éphémères
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_messenger_messages_conversation
  ON messenger_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messenger_messages_sender
  ON messenger_messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messenger_messages_type
  ON messenger_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messenger_messages_expires
  ON messenger_messages(expires_at) WHERE expires_at IS NOT NULL;

-- ===========================================
-- TABLE: Statuts de lecture (Read Receipts)
-- ===========================================
CREATE TABLE IF NOT EXISTS messenger_read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messenger_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'delivered' CHECK (status IN ('sent', 'delivered', 'read')),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(message_id, user_id)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_messenger_read_receipts_message
  ON messenger_read_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_messenger_read_receipts_user
  ON messenger_read_receipts(user_id, created_at DESC);

-- ===========================================
-- TABLE: Réactions aux messages
-- ===========================================
CREATE TABLE IF NOT EXISTS messenger_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messenger_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(message_id, user_id)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_messenger_reactions_message
  ON messenger_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_messenger_reactions_user
  ON messenger_reactions(user_id);

-- ===========================================
-- TABLE: Indicateurs de frappe (Typing)
-- ===========================================
CREATE TABLE IF NOT EXISTS messenger_typing_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES messenger_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_typing BOOLEAN DEFAULT FALSE,
  last_seen TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(conversation_id, user_id)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_messenger_typing_conversation
  ON messenger_typing_indicators(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messenger_typing_expires
  ON messenger_typing_indicators(last_seen DESC);

-- ===========================================
-- TABLE: Appels WebRTC
-- ===========================================
CREATE TABLE IF NOT EXISTS messenger_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES messenger_conversations(id) ON DELETE CASCADE,
  initiator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  call_type VARCHAR(20) DEFAULT 'audio' CHECK (call_type IN ('audio', 'video')),
  status VARCHAR(20) DEFAULT 'ringing' CHECK (status IN ('ringing', 'answered', 'ended', 'missed')),
  started_at TIMESTAMPTZ,
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration INTEGER, -- en secondes
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_messenger_calls_conversation
  ON messenger_calls(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messenger_calls_initiator
  ON messenger_calls(initiator_id, created_at DESC);

-- ===========================================
-- TABLE: Messages épinglés
-- ===========================================
CREATE TABLE IF NOT EXISTS messenger_pinned_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES messenger_conversations(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES messenger_messages(id) ON DELETE CASCADE,
  pinned_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pinned_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(conversation_id, message_id)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_messenger_pinned_conversation
  ON messenger_pinned_messages(conversation_id, pinned_at DESC);

-- ===========================================
-- FONCTIONS UTILES
-- ===========================================

-- Fonction pour obtenir ou créer une conversation
CREATE OR REPLACE FUNCTION get_or_create_conversation(p_user1_id UUID, p_user2_id UUID)
RETURNS UUID AS $$
DECLARE
  conv_id UUID;
BEGIN
  -- S'assurer que les IDs sont ordonnés
  IF p_user1_id > p_user2_id THEN
    SELECT id INTO conv_id
    FROM messenger_conversations
    WHERE (participant1_id = p_user2_id AND participant2_id = p_user1_id)
       OR (participant1_id = p_user1_id AND participant2_id = p_user2_id);
  ELSE
    SELECT id INTO conv_id
    FROM messenger_conversations
    WHERE participant1_id = p_user1_id AND participant2_id = p_user2_id;
  END IF;

  -- Créer si n'existe pas
  IF conv_id IS NULL THEN
    INSERT INTO messenger_conversations (participant1_id, participant2_id)
    VALUES (LEAST(p_user1_id, p_user2_id), GREATEST(p_user1_id, p_user2_id))
    RETURNING id INTO conv_id;
  END IF;

  RETURN conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour marquer les messages comme lus
CREATE OR REPLACE FUNCTION mark_messages_as_read(p_conversation_id UUID, p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Marquer tous les messages non lus de l'autre participant comme lus
  UPDATE messenger_read_receipts
  SET status = 'read', read_at = NOW(), updated_at = NOW()
  WHERE message_id IN (
    SELECT m.id FROM messenger_messages m
    WHERE m.conversation_id = p_conversation_id
    AND m.sender_id != p_user_id
    AND m.is_deleted = FALSE
  )
  AND user_id = p_user_id
  AND status != 'read';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- ROW LEVEL SECURITY (RLS)
-- ===========================================

-- Conversations : Seuls les participants peuvent voir
ALTER TABLE messenger_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "conversation_participants_only" ON messenger_conversations;
CREATE POLICY "conversation_participants_only" ON messenger_conversations
  FOR ALL USING (
    auth.uid() = participant1_id OR auth.uid() = participant2_id
  );

-- Messages : Seuls les participants peuvent voir
ALTER TABLE messenger_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "message_participants_only" ON messenger_messages;
CREATE POLICY "message_participants_only" ON messenger_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM messenger_conversations
      WHERE id = conversation_id
      AND (participant1_id = auth.uid() OR participant2_id = auth.uid())
    )
  );

-- Messages : Seuls les expéditeurs peuvent modifier/supprimer
DROP POLICY IF EXISTS "message_sender_modify" ON messenger_messages;
CREATE POLICY "message_sender_modify" ON messenger_messages
  FOR UPDATE USING (auth.uid() = sender_id);

-- Read receipts : Seuls les participants peuvent voir/modifier
ALTER TABLE messenger_read_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_receipt_participants_only" ON messenger_read_receipts;
CREATE POLICY "read_receipt_participants_only" ON messenger_read_receipts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM messenger_messages m
      JOIN messenger_conversations c ON c.id = m.conversation_id
      WHERE m.id = message_id
      AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
    )
  );

-- Réactions : Seuls les participants peuvent voir/modifier
ALTER TABLE messenger_reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reaction_participants_only" ON messenger_reactions;
CREATE POLICY "reaction_participants_only" ON messenger_reactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM messenger_messages m
      JOIN messenger_conversations c ON c.id = m.conversation_id
      WHERE m.id = message_id
      AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
    )
  );

-- Typing indicators : Seuls les participants peuvent voir/modifier
ALTER TABLE messenger_typing_indicators ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "typing_participants_only" ON messenger_typing_indicators;
CREATE POLICY "typing_participants_only" ON messenger_typing_indicators
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM messenger_conversations
      WHERE id = conversation_id
      AND (participant1_id = auth.uid() OR participant2_id = auth.uid())
    )
  );

-- Calls : Seuls les participants peuvent voir
ALTER TABLE messenger_calls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "call_participants_only" ON messenger_calls;
CREATE POLICY "call_participants_only" ON messenger_calls
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM messenger_conversations
      WHERE id = conversation_id
      AND (participant1_id = auth.uid() OR participant2_id = auth.uid())
    )
  );

-- Pinned messages : Seuls les participants peuvent voir/modifier
ALTER TABLE messenger_pinned_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pinned_participants_only" ON messenger_pinned_messages;
CREATE POLICY "pinned_participants_only" ON messenger_pinned_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM messenger_conversations
      WHERE id = conversation_id
      AND (participant1_id = auth.uid() OR participant2_id = auth.uid())
    )
  );

-- ===========================================
-- TRIGGERS POUR MISE À JOUR AUTOMATIQUE
-- ===========================================

-- Mise à jour updated_at pour conversations
CREATE OR REPLACE FUNCTION update_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE messenger_conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_conversation_timestamp ON messenger_messages;
CREATE TRIGGER trigger_update_conversation_timestamp
  AFTER INSERT OR UPDATE ON messenger_messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_updated_at();

-- Nettoyage automatique des indicateurs de frappe expirés
CREATE OR REPLACE FUNCTION cleanup_expired_typing_indicators()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM messenger_typing_indicators
  WHERE last_seen < NOW() - INTERVAL '10 seconds';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cleanup_typing_indicators ON messenger_typing_indicators;
CREATE TRIGGER trigger_cleanup_typing_indicators
  AFTER INSERT OR UPDATE ON messenger_typing_indicators
  FOR EACH ROW EXECUTE FUNCTION cleanup_expired_typing_indicators();

-- ===========================================
-- INDEX FULL-TEXT SEARCH (optionnel pour Phase 2)
-- ===========================================

-- Index pour recherche dans les messages
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messenger_messages_search
--   ON messenger_messages USING gin(to_tsvector('french', content))
--   WHERE content IS NOT NULL AND is_deleted = FALSE;

-- ===========================================
-- DONNÉES DE TEST (optionnel)
-- ===========================================

-- Ces données peuvent être supprimées en production
-- INSERT INTO messenger_conversations (participant1_id, participant2_id) VALUES
-- ('user-uuid-1', 'user-uuid-2');

-- ===========================================
-- COMMENTAIRES ET DOCUMENTATION
-- ===========================================

COMMENT ON TABLE messenger_conversations IS 'Conversations de messagerie 1:1 entre utilisateurs';
COMMENT ON TABLE messenger_messages IS 'Messages des conversations avec support média';
COMMENT ON TABLE messenger_read_receipts IS 'Statuts de lecture des messages (✓ ✓ ✓)';
COMMENT ON TABLE messenger_reactions IS 'Réactions emoji aux messages';
COMMENT ON TABLE messenger_typing_indicators IS 'Indicateurs de frappe en temps réel';
COMMENT ON TABLE messenger_calls IS 'Historique des appels audio/vidéo WebRTC';
COMMENT ON TABLE messenger_pinned_messages IS 'Messages épinglés dans les conversations';

COMMENT ON FUNCTION get_or_create_conversation(UUID, UUID) IS 'Obtient ou crée une conversation 1:1';
COMMENT ON FUNCTION mark_messages_as_read(UUID, UUID) IS 'Marque tous les messages d\'une conversation comme lus';

-- ===========================================
-- MIGRATION TERMINÉE
-- ===========================================

-- Log de fin de migration
DO $$
BEGIN
  RAISE NOTICE '✅ Migration Messenger System terminée avec succès';
  RAISE NOTICE 'Tables créées: conversations, messages, read_receipts, reactions, typing_indicators, calls, pinned_messages';
  RAISE NOTICE 'RLS activé sur toutes les tables';
  RAISE NOTICE 'Fonctions utilitaires créées';
  RAISE NOTICE 'Triggers automatiques configurés';
END $$;
