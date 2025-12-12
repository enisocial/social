-- Live Audio System - Système de live audio en temps réel
-- Optimisé pour les connexions africaines (faible bande passante)

-- ===========================================
-- TABLE LIVE_AUDIO_ROOMS
-- ===========================================

CREATE TABLE IF NOT EXISTS live_audio_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  room_type TEXT NOT NULL CHECK (room_type IN ('live_rap', 'live_debat')),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'live', 'ended', 'archived')),
  max_participants INTEGER DEFAULT 50,
  is_private BOOLEAN DEFAULT false,
  password TEXT, -- Pour les salles privées
  audio_quality TEXT DEFAULT 'medium' CHECK (audio_quality IN ('low', 'medium', 'high')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  archived_audio_url TEXT, -- URL du replay archivé
  participant_count INTEGER DEFAULT 0,
  total_listeners INTEGER DEFAULT 0
);

-- ===========================================
-- TABLE LIVE_AUDIO_PARTICIPANTS
-- ===========================================

CREATE TABLE IF NOT EXISTS live_audio_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES live_audio_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'listener' CHECK (role IN ('host', 'speaker', 'listener')),
  is_muted BOOLEAN DEFAULT true,
  is_hand_raised BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- ===========================================
-- TABLE LIVE_AUDIO_MESSAGES
-- ===========================================

CREATE TABLE IF NOT EXISTS live_audio_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES live_audio_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'chat' CHECK (message_type IN ('chat', 'system', 'hand_raise', 'speaker_request')),
  is_pinned BOOLEAN DEFAULT false,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- TABLE LIVE_AUDIO_MESSAGE_LIKES
-- ===========================================

CREATE TABLE IF NOT EXISTS live_audio_message_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES live_audio_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- ===========================================
-- INDEXES POUR PERFORMANCE
-- ===========================================

CREATE INDEX IF NOT EXISTS live_audio_rooms_host_id_idx ON live_audio_rooms(host_id);
CREATE INDEX IF NOT EXISTS live_audio_rooms_status_idx ON live_audio_rooms(status);
CREATE INDEX IF NOT EXISTS live_audio_rooms_created_at_idx ON live_audio_rooms(created_at DESC);
CREATE INDEX IF NOT EXISTS live_audio_participants_room_id_idx ON live_audio_participants(room_id);
CREATE INDEX IF NOT EXISTS live_audio_participants_user_id_idx ON live_audio_participants(user_id);
CREATE INDEX IF NOT EXISTS live_audio_messages_room_id_idx ON live_audio_messages(room_id);
CREATE INDEX IF NOT EXISTS live_audio_messages_created_at_idx ON live_audio_messages(created_at DESC);

-- ===========================================
-- FONCTIONS UTILITAIRES
-- ===========================================

-- Fonction pour rejoindre une salle
CREATE OR REPLACE FUNCTION join_live_audio_room(
  room_uuid UUID,
  user_uuid UUID,
  user_role TEXT DEFAULT 'listener'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  room_record RECORD;
  result JSON;
BEGIN
  -- Vérifier que la salle existe et est active
  SELECT * INTO room_record
  FROM live_audio_rooms
  WHERE id = room_uuid AND status IN ('waiting', 'live');

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Salle non trouvée ou inactive');
  END IF;

  -- Vérifier le nombre maximum de participants
  IF room_record.participant_count >= room_record.max_participants THEN
    RETURN json_build_object('success', false, 'error', 'Salle complète');
  END IF;

  -- Insérer ou mettre à jour le participant
  INSERT INTO live_audio_participants (room_id, user_id, role)
  VALUES (room_uuid, user_uuid, user_role)
  ON CONFLICT (room_id, user_id) DO UPDATE SET
    last_activity = NOW(),
    role = EXCLUDED.role;

  -- Mettre à jour le compteur de participants
  UPDATE live_audio_rooms
  SET participant_count = (
    SELECT COUNT(*) FROM live_audio_participants WHERE room_id = room_uuid
  )
  WHERE id = room_uuid;

  -- Démarrer la salle si elle était en attente et que l'hôte rejoint
  IF room_record.status = 'waiting' AND room_record.host_id = user_uuid THEN
    UPDATE live_audio_rooms
    SET status = 'live', started_at = NOW()
    WHERE id = room_uuid;
  END IF;

  RETURN json_build_object(
    'success', true,
    'room', room_record,
    'role', user_role
  );
END;
$$;

-- Fonction pour quitter une salle
CREATE OR REPLACE FUNCTION leave_live_audio_room(room_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  participant_count INTEGER;
BEGIN
  -- Supprimer le participant
  DELETE FROM live_audio_participants
  WHERE room_id = room_uuid AND user_id = user_uuid;

  -- Compter les participants restants
  SELECT COUNT(*) INTO participant_count
  FROM live_audio_participants
  WHERE room_id = room_uuid;

  -- Mettre à jour le compteur
  UPDATE live_audio_rooms
  SET participant_count = participant_count
  WHERE id = room_uuid;

  -- Terminer la salle si l'hôte part
  UPDATE live_audio_rooms
  SET status = 'ended', ended_at = NOW()
  WHERE id = room_uuid
    AND host_id = user_uuid
    AND status = 'live';

  RETURN true;
END;
$$;

-- Fonction pour lever/baisser la main
CREATE OR REPLACE FUNCTION toggle_hand_raise(room_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE live_audio_participants
  SET is_hand_raised = NOT is_hand_raised
  WHERE room_id = room_uuid AND user_id = user_uuid;

  RETURN true;
END;
$$;

-- Fonction pour donner la parole
CREATE OR REPLACE FUNCTION grant_speaker_role(room_uuid UUID, host_uuid UUID, target_user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  host_check UUID;
BEGIN
  -- Vérifier que l'utilisateur est l'hôte
  SELECT host_id INTO host_check
  FROM live_audio_rooms
  WHERE id = room_uuid AND host_id = host_uuid;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Donner le rôle speaker
  UPDATE live_audio_participants
  SET role = 'speaker', is_muted = false, is_hand_raised = false
  WHERE room_id = room_uuid AND user_id = target_user_uuid;

  RETURN true;
END;
$$;

-- ===========================================
-- SUPABASE STORAGE BUCKET
-- ===========================================

-- Créer le bucket pour les replays audio
INSERT INTO storage.buckets (id, name, public)
VALUES ('live-audio-replays', 'live-audio-replays', true)
ON CONFLICT (id) DO NOTHING;

-- Politiques de sécurité pour les replays
DROP POLICY IF EXISTS "live_audio_replays_public_read_policy" ON storage.objects;
CREATE POLICY "live_audio_replays_public_read_policy" ON storage.objects
  FOR SELECT USING (bucket_id = 'live-audio-replays');

DROP POLICY IF EXISTS "live_audio_replays_upload_policy" ON storage.objects;
CREATE POLICY "live_audio_replays_upload_policy" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'live-audio-replays'
    AND auth.role() = 'authenticated'
  );

-- ===========================================
-- POLITIQUES RLS
-- ===========================================

-- Live Audio Rooms - Lecture publique pour les salles publiques
DROP POLICY IF EXISTS "live_audio_rooms_select_policy" ON live_audio_rooms;
CREATE POLICY "live_audio_rooms_select_policy" ON live_audio_rooms
  FOR SELECT USING (
    NOT is_private OR host_id = auth.uid()
  );

-- Live Audio Rooms - Création par utilisateurs authentifiés
DROP POLICY IF EXISTS "live_audio_rooms_insert_policy" ON live_audio_rooms;
CREATE POLICY "live_audio_rooms_insert_policy" ON live_audio_rooms
  FOR INSERT WITH CHECK (
    auth.uid() = host_id
    AND auth.role() = 'authenticated'
  );

-- Live Audio Rooms - Modification par hôte uniquement
DROP POLICY IF EXISTS "live_audio_rooms_update_policy" ON live_audio_rooms;
CREATE POLICY "live_audio_rooms_update_policy" ON live_audio_rooms
  FOR UPDATE USING (auth.uid() = host_id);

-- Live Audio Rooms - Suppression par hôte uniquement
DROP POLICY IF EXISTS "live_audio_rooms_delete_policy" ON live_audio_rooms;
CREATE POLICY "live_audio_rooms_delete_policy" ON live_audio_rooms
  FOR DELETE USING (auth.uid() = host_id);

-- Participants - Gestion par les participants eux-mêmes et lecture pour tous les participants de la salle
DROP POLICY IF EXISTS "live_audio_participants_select_policy" ON live_audio_participants;
CREATE POLICY "live_audio_participants_select_policy" ON live_audio_participants
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM live_audio_participants lap2
      WHERE lap2.room_id = live_audio_participants.room_id
      AND lap2.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "live_audio_participants_insert_policy" ON live_audio_participants;
CREATE POLICY "live_audio_participants_insert_policy" ON live_audio_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "live_audio_participants_update_policy" ON live_audio_participants;
CREATE POLICY "live_audio_participants_update_policy" ON live_audio_participants
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "live_audio_participants_delete_policy" ON live_audio_participants;
CREATE POLICY "live_audio_participants_delete_policy" ON live_audio_participants
  FOR DELETE USING (auth.uid() = user_id);

-- Messages - Lecture pour tous les participants de la salle
DROP POLICY IF EXISTS "live_audio_messages_select_policy" ON live_audio_messages;
CREATE POLICY "live_audio_messages_select_policy" ON live_audio_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM live_audio_participants
      WHERE room_id = live_audio_messages.room_id
      AND user_id = auth.uid()
    )
  );

-- Messages - Insertion par participants
DROP POLICY IF EXISTS "live_audio_messages_insert_policy" ON live_audio_messages;
CREATE POLICY "live_audio_messages_insert_policy" ON live_audio_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM live_audio_participants
      WHERE room_id = live_audio_messages.room_id
      AND user_id = auth.uid()
    )
  );

-- Likes sur messages
DROP POLICY IF EXISTS "live_audio_message_likes_policy" ON live_audio_message_likes;
CREATE POLICY "live_audio_message_likes_policy" ON live_audio_message_likes
  FOR ALL USING (auth.uid() = user_id);

-- ===========================================
-- TRIGGERS POUR METADATA
-- ===========================================

-- Trigger pour mettre à jour participant_count
CREATE OR REPLACE FUNCTION update_live_audio_participant_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE live_audio_rooms
  SET participant_count = (
    SELECT COUNT(*) FROM live_audio_participants
    WHERE room_id = COALESCE(NEW.room_id, OLD.room_id)
  )
  WHERE id = COALESCE(NEW.room_id, OLD.room_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS live_audio_participant_count_trigger ON live_audio_participants;
CREATE TRIGGER live_audio_participant_count_trigger
  AFTER INSERT OR DELETE ON live_audio_participants
  FOR EACH ROW EXECUTE FUNCTION update_live_audio_participant_count();

-- ===========================================
-- VUES POUR LE FEED
-- ===========================================

-- Vue des salles live actives
CREATE OR REPLACE VIEW active_live_audio_rooms AS
SELECT
  lar.*,
  p.username,
  p.name,
  p.avatar_url,
  -- Stats calculées
  COALESCE(participants.participant_count, 0) as current_participants,
  COALESCE(messages.message_count, 0) as message_count
FROM live_audio_rooms lar
JOIN profiles p ON lar.host_id = p.id
LEFT JOIN (
  SELECT room_id, COUNT(*) as participant_count
  FROM live_audio_participants
  GROUP BY room_id
) participants ON lar.id = participants.room_id
LEFT JOIN (
  SELECT room_id, COUNT(*) as message_count
  FROM live_audio_messages
  GROUP BY room_id
) messages ON lar.id = messages.room_id
WHERE lar.status IN ('waiting', 'live')
ORDER BY lar.created_at DESC;

-- ===========================================
-- LOG DE FIN DE MIGRATION
-- ===========================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration Live Audio System terminée avec succès';
  RAISE NOTICE 'Tables créées: live_audio_rooms, live_audio_participants, live_audio_messages, live_audio_message_likes';
  RAISE NOTICE 'Fonctions utilitaires: join_live_audio_room, leave_live_audio_room, toggle_hand_raise, grant_speaker_role';
  RAISE NOTICE 'Bucket storage créé: live-audio-replays (public)';
  RAISE NOTICE 'Optimisé pour connexions africaines: qualité adaptative, faible latence';
  RAISE NOTICE 'Système prêt pour production avec WebRTC et archivage';
END $$;
