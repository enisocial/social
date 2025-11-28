-- MIGRATION POUR AJOUTER LES FONCTIONNALITÉS CHAT COMPLETES

-- 1. CRÉER LES BUCKETS DE STOCKAGE POUR LES MÉDIAS
-- (Ces buckets doivent être créés manuellement dans Supabase Dashboard)
-- - chat-media : pour les images
-- - chat-files : pour les fichiers
-- - chat-voice : pour les messages vocaux

-- 2. AJOUTER LES POLICIES RLS POUR LES BUCKETS
-- (À configurer dans Supabase Dashboard > Storage)

-- 3. AJOUTER LES TABLES POUR LES EMOJIS ET STICKERS
CREATE TABLE IF NOT EXISTS chat_emojis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emoji TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'basic',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_stickers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  category TEXT DEFAULT 'basic',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. AJOUTER LES POLICIES RLS
ALTER TABLE chat_emojis ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_stickers ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire les emojis et stickers
CREATE POLICY "Anyone can read emojis" ON chat_emojis FOR SELECT USING (true);
CREATE POLICY "Anyone can read stickers" ON chat_stickers FOR SELECT USING (true);

-- 5. INSÉRER LES EMOJIS DE BASE
INSERT INTO chat_emojis (emoji, name, category) VALUES
  ('😀', 'smile', 'faces'),
  ('😂', 'laugh', 'faces'),
  ('❤️', 'heart', 'hearts'),
  ('👍', 'thumbs_up', 'gestures'),
  ('🔥', 'fire', 'symbols'),
  ('🎉', 'party', 'celebration'),
  ('😢', 'cry', 'faces'),
  ('😮', 'surprise', 'faces'),
  ('😍', 'love', 'faces'),
  ('🤔', 'thinking', 'faces'),
  ('🙄', 'eye_roll', 'faces'),
  ('😴', 'sleep', 'faces'),
  ('🤗', 'hug', 'gestures'),
  ('😎', 'cool', 'faces'),
  ('🥳', 'celebrate', 'celebration'),
  ('🤩', 'star_struck', 'faces')
ON CONFLICT DO NOTHING;

-- 6. AJOUTER LES COLONNES MANQUANTES À LA TABLE MESSAGES
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'sticker', 'voice')),
ADD COLUMN IF NOT EXISTS media_url TEXT,
ADD COLUMN IF NOT EXISTS file_name TEXT,
ADD COLUMN IF NOT EXISTS file_size BIGINT,
ADD COLUMN IF NOT EXISTS sticker_id UUID REFERENCES chat_stickers(id);

-- 7. CRÉER UNE TABLE POUR LES MESSAGES VOCAUX
CREATE TABLE IF NOT EXISTS voice_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  audio_url TEXT NOT NULL,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. AJOUTER LES INDEXES POUR LES PERFORMANCES
CREATE INDEX IF NOT EXISTS idx_messages_conversation_type ON messages(conversation_id, message_type);
CREATE INDEX IF NOT EXISTS idx_messages_sender_read ON messages(sender_id, read);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- 9. FONCTION POUR NETTOYER LES ANCIENS MESSAGES (OPTIONNEL)
CREATE OR REPLACE FUNCTION cleanup_old_messages()
RETURNS void AS $$
BEGIN
  -- Supprimer les messages de plus de 1 an
  DELETE FROM messages
  WHERE created_at < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

-- 10. TRIGGER POUR METTRE À JOUR LES TIMESTAMPS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. CRÉER UNE VUE POUR LES CONVERSATIONS AVEC DERNIER MESSAGE
CREATE OR REPLACE VIEW conversation_with_last_message AS
SELECT
  c.id,
  c.type,
  c.created_at as conversation_created_at,
  m.content as last_message_content,
  m.created_at as last_message_at,
  m.sender_id as last_sender_id,
  p.name as last_sender_name,
  (
    SELECT COUNT(*)
    FROM messages m2
    WHERE m2.conversation_id = c.id
    AND m2.read = false
    AND m2.sender_id != cp.user_id
  ) as unread_count
FROM conversations c
LEFT JOIN messages m ON m.id = (
  SELECT id FROM messages
  WHERE conversation_id = c.id
  ORDER BY created_at DESC
  LIMIT 1
)
LEFT JOIN profiles p ON p.id = m.sender_id
LEFT JOIN conversation_participants cp ON cp.conversation_id = c.id
WHERE cp.user_id = auth.uid();

-- 12. FONCTION POUR CRÉER UNE CONVERSATION OU EN TROUVER UNE EXISTANTE
CREATE OR REPLACE FUNCTION get_or_create_conversation(user_a UUID, user_b UUID)
RETURNS UUID AS $$
DECLARE
  conv_id UUID;
BEGIN
  -- Chercher une conversation existante entre ces deux utilisateurs
  SELECT c.id INTO conv_id
  FROM conversations c
  JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = user_a
  JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = user_b
  WHERE c.type = 'dm'
  LIMIT 1;

  -- Si pas trouvée, en créer une nouvelle
  IF conv_id IS NULL THEN
    INSERT INTO conversations (type) VALUES ('dm') RETURNING id INTO conv_id;

    INSERT INTO conversation_participants (conversation_id, user_id) VALUES
    (conv_id, user_a),
    (conv_id, user_b);
  END IF;

  RETURN conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
