-- Migration complète du système Live Audio pour la production
-- Création de toutes les tables, vues, fonctions et politiques RLS nécessaires

-- ===========================================
-- TABLES PRINCIPALES
-- ===========================================

-- Table des salles Live Audio
CREATE TABLE IF NOT EXISTS live_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mode TEXT NOT NULL CHECK (mode IN ('rap', 'debat', 'general')),
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'live', 'ended', 'paused')),
    is_private BOOLEAN NOT NULL DEFAULT FALSE,
    password TEXT,
    current_participants INTEGER NOT NULL DEFAULT 0,
    max_participants INTEGER NOT NULL DEFAULT 50,
    speakers_count INTEGER NOT NULL DEFAULT 0,
    listeners_count INTEGER NOT NULL DEFAULT 0,
    audio_quality TEXT NOT NULL DEFAULT 'high' CHECK (audio_quality IN ('high', 'medium', 'low')),
    beat_playing JSONB,
    settings JSONB NOT NULL DEFAULT '{
        "allow_requests": true,
        "time_limit": null,
        "auto_mute": false,
        "recording_enabled": false
    }',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration INTEGER -- durée en secondes
);

-- Table des participants aux salles
CREATE TABLE IF NOT EXISTS live_audio_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES live_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'listener' CHECK (role IN ('host', 'speaker', 'listener')),
    is_muted BOOLEAN NOT NULL DEFAULT FALSE,
    is_hand_raised BOOLEAN NOT NULL DEFAULT FALSE,
    is_speaking BOOLEAN NOT NULL DEFAULT FALSE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    connection_quality TEXT NOT NULL DEFAULT 'excellent' CHECK (connection_quality IN ('excellent', 'good', 'poor', 'disconnected')),
    audio_level INTEGER NOT NULL DEFAULT 0 CHECK (audio_level >= 0 AND audio_level <= 100),
    network_stats JSONB,
    UNIQUE(room_id, user_id)
);

-- Table des messages du chat
CREATE TABLE IF NOT EXISTS live_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES live_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    user_avatar TEXT,
    content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'reaction', 'system')),
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    likes_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    edited_at TIMESTAMP WITH TIME ZONE
);

-- Table des likes des messages
CREATE TABLE IF NOT EXISTS live_audio_message_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES live_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);

-- Table des demandes de parole (file d'attente)
CREATE TABLE IF NOT EXISTS live_speaker_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES live_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    user_avatar TEXT,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    position INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'approved', 'declined', 'expired')),
    UNIQUE(room_id, user_id)
);

-- ===========================================
-- INDEXES POUR LES PERFORMANCES
-- ===========================================

-- Indexes sur les salles
CREATE INDEX IF NOT EXISTS idx_live_rooms_host_id ON live_rooms(host_id);
CREATE INDEX IF NOT EXISTS idx_live_rooms_status ON live_rooms(status);
CREATE INDEX IF NOT EXISTS idx_live_rooms_mode ON live_rooms(mode);
CREATE INDEX IF NOT EXISTS idx_live_rooms_is_private ON live_rooms(is_private);
CREATE INDEX IF NOT EXISTS idx_live_rooms_created_at ON live_rooms(created_at DESC);

-- Indexes sur les participants
CREATE INDEX IF NOT EXISTS idx_live_audio_participants_room_id ON live_audio_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_live_audio_participants_user_id ON live_audio_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_live_audio_participants_role ON live_audio_participants(role);

-- Indexes sur les messages
CREATE INDEX IF NOT EXISTS idx_live_messages_room_id ON live_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_live_messages_user_id ON live_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_live_messages_created_at ON live_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_messages_is_pinned ON live_messages(is_pinned);

-- Indexes sur les likes
CREATE INDEX IF NOT EXISTS idx_live_audio_message_likes_message_id ON live_audio_message_likes(message_id);
CREATE INDEX IF NOT EXISTS idx_live_audio_message_likes_user_id ON live_audio_message_likes(user_id);

-- Indexes sur la file d'attente
CREATE INDEX IF NOT EXISTS idx_live_speaker_queue_room_id ON live_speaker_queue(room_id);
CREATE INDEX IF NOT EXISTS idx_live_speaker_queue_status ON live_speaker_queue(status);
CREATE INDEX IF NOT EXISTS idx_live_speaker_queue_position ON live_speaker_queue(position);

-- ===========================================
-- POLITIQUES RLS (Row Level Security)
-- ===========================================

-- Politiques pour live_rooms
ALTER TABLE live_rooms ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut voir les salles publiques
CREATE POLICY "Public rooms are viewable by everyone" ON live_rooms
    FOR SELECT USING (is_private = FALSE);

-- Les utilisateurs peuvent voir leurs propres salles privées
CREATE POLICY "Users can view their own private rooms" ON live_rooms
    FOR SELECT USING (host_id = auth.uid());

-- Les utilisateurs peuvent créer des salles
CREATE POLICY "Users can create rooms" ON live_rooms
    FOR INSERT WITH CHECK (host_id = auth.uid());

-- Les hôtes peuvent modifier leurs salles
CREATE POLICY "Hosts can update their rooms" ON live_rooms
    FOR UPDATE USING (host_id = auth.uid());

-- Les hôtes peuvent supprimer leurs salles
CREATE POLICY "Hosts can delete their rooms" ON live_rooms
    FOR DELETE USING (host_id = auth.uid());

-- Politiques pour live_audio_participants
ALTER TABLE live_audio_participants ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut voir les participants des salles publiques
CREATE POLICY "Participants in public rooms are viewable by everyone" ON live_audio_participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM live_rooms
            WHERE live_rooms.id = live_audio_participants.room_id
            AND live_rooms.is_private = FALSE
        )
    );

-- Les participants peuvent voir les autres participants de leurs salles
CREATE POLICY "Users can view participants in their rooms" ON live_audio_participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM live_audio_participants p
            WHERE p.room_id = live_audio_participants.room_id
            AND p.user_id = auth.uid()
        )
    );

-- Les utilisateurs peuvent rejoindre des salles
CREATE POLICY "Users can join rooms" ON live_audio_participants
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Les utilisateurs peuvent modifier leur propre participation
CREATE POLICY "Users can update their own participation" ON live_audio_participants
    FOR UPDATE USING (user_id = auth.uid());

-- Les utilisateurs peuvent quitter des salles
CREATE POLICY "Users can leave rooms" ON live_audio_participants
    FOR DELETE USING (user_id = auth.uid());

-- Politiques pour live_messages
ALTER TABLE live_messages ENABLE ROW LEVEL SECURITY;

-- Les messages des salles publiques sont visibles par tous
CREATE POLICY "Messages in public rooms are viewable by everyone" ON live_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM live_rooms
            WHERE live_rooms.id = live_messages.room_id
            AND live_rooms.is_private = FALSE
        )
    );

-- Les participants peuvent voir les messages de leurs salles
CREATE POLICY "Users can view messages in their rooms" ON live_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM live_audio_participants
            WHERE live_audio_participants.room_id = live_messages.room_id
            AND live_audio_participants.user_id = auth.uid()
        )
    );

-- Les participants peuvent envoyer des messages
CREATE POLICY "Users can send messages in their rooms" ON live_messages
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM live_audio_participants
            WHERE live_audio_participants.room_id = live_messages.room_id
            AND live_audio_participants.user_id = auth.uid()
        )
    );

-- Les auteurs peuvent modifier leurs messages
CREATE POLICY "Users can edit their own messages" ON live_messages
    FOR UPDATE USING (user_id = auth.uid());

-- Les modérateurs peuvent supprimer des messages
CREATE POLICY "Hosts can delete messages in their rooms" ON live_messages
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM live_rooms
            WHERE live_rooms.id = live_messages.room_id
            AND live_rooms.host_id = auth.uid()
        )
    );

-- Politiques pour live_audio_message_likes
ALTER TABLE live_audio_message_likes ENABLE ROW LEVEL SECURITY;

-- Les likes sont visibles par tous (même logique que les messages)
CREATE POLICY "Message likes are viewable by everyone in public rooms" ON live_audio_message_likes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM live_messages m
            JOIN live_rooms r ON r.id = m.room_id
            WHERE m.id = live_audio_message_likes.message_id
            AND r.is_private = FALSE
        )
    );

-- Les participants peuvent voir les likes de leurs salles
CREATE POLICY "Users can view likes in their rooms" ON live_audio_message_likes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM live_audio_participants p
            JOIN live_messages m ON m.room_id = p.room_id
            WHERE m.id = live_audio_message_likes.message_id
            AND p.user_id = auth.uid()
        )
    );

-- Les utilisateurs peuvent liker des messages
CREATE POLICY "Users can like messages in their rooms" ON live_audio_message_likes
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM live_audio_participants p
            JOIN live_messages m ON m.room_id = p.room_id
            WHERE m.id = live_audio_message_likes.message_id
            AND p.user_id = auth.uid()
        )
    );

-- Les utilisateurs peuvent unliker des messages
CREATE POLICY "Users can unlike messages" ON live_audio_message_likes
    FOR DELETE USING (user_id = auth.uid());

-- Politiques pour live_speaker_queue
ALTER TABLE live_speaker_queue ENABLE ROW LEVEL SECURITY;

-- La file d'attente est visible dans les salles publiques
CREATE POLICY "Speaker queue in public rooms is viewable by everyone" ON live_speaker_queue
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM live_rooms
            WHERE live_rooms.id = live_speaker_queue.room_id
            AND live_rooms.is_private = FALSE
        )
    );

-- Les participants peuvent voir la file d'attente de leurs salles
CREATE POLICY "Users can view speaker queue in their rooms" ON live_speaker_queue
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM live_audio_participants
            WHERE live_audio_participants.room_id = live_speaker_queue.room_id
            AND live_audio_participants.user_id = auth.uid()
        )
    );

-- Les utilisateurs peuvent demander la parole
CREATE POLICY "Users can request to speak in their rooms" ON live_speaker_queue
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM live_audio_participants
            WHERE live_audio_participants.room_id = live_speaker_queue.room_id
            AND live_audio_participants.user_id = auth.uid()
        )
    );

-- Les hôtes peuvent gérer les demandes de parole
CREATE POLICY "Hosts can manage speaker queue in their rooms" ON live_speaker_queue
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM live_rooms
            WHERE live_rooms.id = live_speaker_queue.room_id
            AND live_rooms.host_id = auth.uid()
        )
    );

-- Les utilisateurs peuvent supprimer leurs propres demandes
CREATE POLICY "Users can cancel their own speaker requests" ON live_speaker_queue
    FOR DELETE USING (user_id = auth.uid());

-- ===========================================
-- FONCTIONS UTILITAIRES
-- ===========================================

-- Fonction pour mettre à jour le compteur de participants
CREATE OR REPLACE FUNCTION update_room_participant_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE live_rooms
        SET current_participants = current_participants + 1
        WHERE id = NEW.room_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE live_rooms
        SET current_participants = GREATEST(current_participants - 1, 0)
        WHERE id = OLD.room_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour mettre à jour les compteurs de speakers/listeners
CREATE OR REPLACE FUNCTION update_room_speaker_listener_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE live_rooms
    SET
        speakers_count = (
            SELECT COUNT(*)
            FROM live_audio_participants
            WHERE room_id = COALESCE(NEW.room_id, OLD.room_id)
            AND role IN ('host', 'speaker')
        ),
        listeners_count = (
            SELECT COUNT(*)
            FROM live_audio_participants
            WHERE room_id = COALESCE(NEW.room_id, OLD.room_id)
            AND role = 'listener'
        )
    WHERE id = COALESCE(NEW.room_id, OLD.room_id);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Fonction pour mettre à jour le compteur de likes des messages
CREATE OR REPLACE FUNCTION update_message_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE live_messages
        SET likes_count = likes_count + 1
        WHERE id = NEW.message_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE live_messages
        SET likes_count = GREATEST(likes_count - 1, 0)
        WHERE id = OLD.message_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- TRIGGERS
-- ===========================================

-- Triggers pour mettre à jour les compteurs de participants
CREATE TRIGGER update_room_participant_count_trigger
    AFTER INSERT OR DELETE ON live_audio_participants
    FOR EACH ROW EXECUTE FUNCTION update_room_participant_count();

-- Triggers pour mettre à jour les compteurs de speakers/listeners
CREATE TRIGGER update_room_speaker_listener_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON live_audio_participants
    FOR EACH ROW EXECUTE FUNCTION update_room_speaker_listener_count();

-- Triggers pour mettre à jour les compteurs de likes
CREATE TRIGGER update_message_likes_count_trigger
    AFTER INSERT OR DELETE ON live_audio_message_likes
    FOR EACH ROW EXECUTE FUNCTION update_message_likes_count();

-- ===========================================
-- VUES POUR LES REQUÊTES OPTIMISÉES
-- ===========================================

-- Vue des salles actives avec statistiques
CREATE OR REPLACE VIEW active_live_rooms AS
SELECT
    r.*,
    COALESCE(p.participant_count, 0) as participant_count,
    COALESCE(p.speaker_count, 0) as speaker_count,
    COALESCE(p.listener_count, 0) as listener_count,
    h.username as host_username,
    h.avatar_url as host_avatar
FROM live_rooms r
LEFT JOIN (
    SELECT
        room_id,
        COUNT(*) as participant_count,
        COUNT(CASE WHEN role IN ('host', 'speaker') THEN 1 END) as speaker_count,
        COUNT(CASE WHEN role = 'listener' THEN 1 END) as listener_count
    FROM live_audio_participants
    GROUP BY room_id
) p ON p.room_id = r.id
LEFT JOIN profiles h ON h.id = r.host_id
WHERE r.status IN ('waiting', 'live')
ORDER BY r.created_at DESC;

-- Vue des salles populaires
CREATE OR REPLACE VIEW popular_live_rooms AS
SELECT
    r.*,
    COALESCE(p.participant_count, 0) as participant_count,
    COALESCE(m.message_count, 0) as message_count,
    (COALESCE(p.participant_count, 0) + COALESCE(m.message_count, 0) * 0.1) as popularity_score
FROM live_rooms r
LEFT JOIN (
    SELECT room_id, COUNT(*) as participant_count
    FROM live_audio_participants
    GROUP BY room_id
) p ON p.room_id = r.id
LEFT JOIN (
    SELECT room_id, COUNT(*) as message_count
    FROM live_messages
    GROUP BY room_id
) m ON m.room_id = r.id
WHERE r.status = 'live'
ORDER BY popularity_score DESC, r.created_at DESC;

-- ===========================================
-- DONNÉES DE TEST (à supprimer en production)
-- ===========================================

-- Insertion de données de test (uniquement pour développement)
/*
-- Salle de test Rap
INSERT INTO live_rooms (title, description, host_id, mode, status, audio_quality, settings)
VALUES (
    'Freestyle Session - Afro Trap',
    'Session freestyle avec beats afro trap. Tous niveaux bienvenus ! 🎤',
    (SELECT id FROM auth.users LIMIT 1),
    'rap',
    'live',
    'high',
    '{"allow_requests": true, "auto_mute": false, "recording_enabled": false}'
);

-- Salle de test Débat
INSERT INTO live_rooms (title, description, host_id, mode, status, audio_quality, settings)
VALUES (
    'Débat: IA en Afrique',
    'Discussion sur l''impact de l''intelligence artificielle dans le développement africain',
    (SELECT id FROM auth.users LIMIT 1),
    'debat',
    'waiting',
    'high',
    '{"allow_requests": true, "time_limit": 300, "auto_mute": true, "recording_enabled": true}'
);
*/

-- ===========================================
-- INDEXES SUPPLÉMENTAIRES POUR LES PERFORMANCES
-- ===========================================

-- Index composite pour les salles actives
CREATE INDEX IF NOT EXISTS idx_live_rooms_active ON live_rooms(status, is_private, created_at DESC)
    WHERE status IN ('waiting', 'live');

-- Index pour les recherches de salles
CREATE INDEX IF NOT EXISTS idx_live_rooms_search ON live_rooms USING gin(to_tsvector('french', title || ' ' || COALESCE(description, '')));

-- Index pour les statistiques temps réel
CREATE INDEX IF NOT EXISTS idx_live_audio_participants_activity ON live_audio_participants(room_id, last_activity DESC);

-- ===========================================
-- FONCTIONS DE NETTOYAGE
-- ===========================================

-- Fonction pour nettoyer les salles expirées
CREATE OR REPLACE FUNCTION cleanup_expired_rooms()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Supprimer les salles terminées depuis plus de 24h
    DELETE FROM live_rooms
    WHERE status = 'ended'
    AND ended_at < NOW() - INTERVAL '24 hours';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour nettoyer les participants inactifs
CREATE OR REPLACE FUNCTION cleanup_inactive_participants()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Supprimer les participants inactifs depuis plus de 5 minutes
    DELETE FROM live_audio_participants
    WHERE last_activity < NOW() - INTERVAL '5 minutes'
    AND role != 'host'; -- Garder les hôtes même s'ils sont inactifs

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- PERMISSIONS ET SÉCURITÉ
-- ===========================================

-- Donner les permissions nécessaires
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON live_rooms TO authenticated;
GRANT ALL ON live_audio_participants TO authenticated;
GRANT ALL ON live_messages TO authenticated;
GRANT ALL ON live_audio_message_likes TO authenticated;
GRANT ALL ON live_speaker_queue TO authenticated;

-- Permissions sur les vues
GRANT SELECT ON active_live_rooms TO authenticated;
GRANT SELECT ON popular_live_rooms TO authenticated;

-- ===========================================
-- COMMENTAIRES DE DOCUMENTATION
-- ===========================================

COMMENT ON TABLE live_rooms IS 'Salles de live audio avec paramètres et statistiques';
COMMENT ON TABLE live_audio_participants IS 'Participants des salles avec rôles et états';
COMMENT ON TABLE live_messages IS 'Messages du chat en temps réel';
COMMENT ON TABLE live_audio_message_likes IS 'Likes des messages du chat';
COMMENT ON TABLE live_speaker_queue IS 'File d''attente pour les demandes de parole';

COMMENT ON VIEW active_live_rooms IS 'Vue des salles actives avec statistiques complètes';
COMMENT ON VIEW popular_live_rooms IS 'Vue des salles triées par popularité';

-- ===========================================
-- MIGRATION TERMINÉE
-- ===========================================

-- Log de la migration
DO $$
BEGIN
    RAISE NOTICE 'Migration Live Audio System terminée avec succès';
    RAISE NOTICE 'Tables créées: live_rooms, live_audio_participants, live_messages, live_audio_message_likes, live_speaker_queue';
    RAISE NOTICE 'Vues créées: active_live_rooms, popular_live_rooms';
    RAISE NOTICE 'Politiques RLS configurées pour toutes les tables';
    RAISE NOTICE 'Triggers et fonctions utilitaires créées';
END $$;
