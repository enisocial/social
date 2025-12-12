-- ============================================
-- SYSTÈME D'AMIS COMPLET AVEC NOTIFICATIONS
-- ============================================

-- Ajouter des colonnes manquantes aux notifications si elles n'existent pas
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'notifications' 
                 AND column_name = 'sender_id') THEN
    ALTER TABLE notifications ADD COLUMN sender_id UUID REFERENCES profiles(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'notifications' 
                 AND column_name = 'action_url') THEN
    ALTER TABLE notifications ADD COLUMN action_url TEXT;
  END IF;
END $$;

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
  ON notifications(user_id, read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_friend_requests_status_sender 
  ON friend_requests(status, sender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_friend_requests_status_receiver 
  ON friend_requests(status, receiver_id, created_at DESC);

-- Fonction pour créer une notification de demande d'ami
CREATE OR REPLACE FUNCTION create_friend_request_notification()
RETURNS TRIGGER AS $$
DECLARE
  sender_profile profiles%ROWTYPE;
BEGIN
  -- Récupérer le profil de l'expéditeur
  SELECT * INTO sender_profile 
  FROM profiles 
  WHERE id = NEW.sender_id;

  -- Si la demande est en attente, notifier le destinataire
  IF NEW.status = 'pending' THEN
    INSERT INTO notifications (
      user_id,
      sender_id,
      type,
      metadata,
      read,
      action_url
    ) VALUES (
      NEW.receiver_id,
      NEW.sender_id,
      'friend_request',
      jsonb_build_object(
        'request_id', NEW.id,
        'sender_id', NEW.sender_id,
        'sender_name', sender_profile.name,
        'sender_username', sender_profile.username,
        'sender_avatar_url', sender_profile.avatar_url
      ),
      false,
      '/profile/' || sender_profile.username
    );
  
  -- Si la demande est acceptée, notifier l'expéditeur
  ELSIF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    DECLARE
      receiver_profile profiles%ROWTYPE;
    BEGIN
      SELECT * INTO receiver_profile 
      FROM profiles 
      WHERE id = NEW.receiver_id;
      
      INSERT INTO notifications (
        user_id,
        sender_id,
        type,
        metadata,
        read,
        action_url
      ) VALUES (
        NEW.sender_id,
        NEW.receiver_id,
        'friend_request_accepted',
        jsonb_build_object(
          'request_id', NEW.id,
          'accepter_id', NEW.receiver_id,
          'accepter_name', receiver_profile.name,
          'accepter_username', receiver_profile.username,
          'accepter_avatar_url', receiver_profile.avatar_url
        ),
        false,
        '/profile/' || receiver_profile.username
      );
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS friend_request_notification_trigger ON friend_requests;

-- Créer le trigger pour les notifications automatiques
CREATE TRIGGER friend_request_notification_trigger
  AFTER INSERT OR UPDATE ON friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION create_friend_request_notification();

-- ============================================
-- SYSTÈME DE PUBLICATION MULTI-MÉDIAS
-- ============================================

-- Ajouter les colonnes manquantes à post_media si elles n'existent pas
DO $$ 
BEGIN
  -- media_order
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'post_media' 
                 AND column_name = 'media_order') THEN
    ALTER TABLE post_media ADD COLUMN media_order INTEGER NOT NULL DEFAULT 0;
  END IF;
  
  -- thumbnail_url
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'post_media' 
                 AND column_name = 'thumbnail_url') THEN
    ALTER TABLE post_media ADD COLUMN thumbnail_url TEXT;
  END IF;
  
  -- duration
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'post_media' 
                 AND column_name = 'duration') THEN
    ALTER TABLE post_media ADD COLUMN duration INTEGER;
  END IF;
  
  -- width
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'post_media' 
                 AND column_name = 'width') THEN
    ALTER TABLE post_media ADD COLUMN width INTEGER;
  END IF;
  
  -- height
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'post_media' 
                 AND column_name = 'height') THEN
    ALTER TABLE post_media ADD COLUMN height INTEGER;
  END IF;
  
  -- size_bytes
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'post_media' 
                 AND column_name = 'size_bytes') THEN
    ALTER TABLE post_media ADD COLUMN size_bytes BIGINT;
  END IF;
END $$;

-- Index pour récupération rapide des médias d'un post
CREATE INDEX IF NOT EXISTS idx_post_media_post_id_order 
  ON post_media(post_id, media_order);

-- RLS pour post_media
ALTER TABLE post_media ENABLE ROW LEVEL SECURITY;

-- Politique: Voir les médias des posts publics
DROP POLICY IF EXISTS "Public posts media viewable by everyone" ON post_media;
CREATE POLICY "Public posts media viewable by everyone"
  ON post_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = post_media.post_id 
      AND posts.privacy = 'public'
    )
  );

-- Politique: Voir les médias des posts d'amis
DROP POLICY IF EXISTS "Friends posts media viewable by friends" ON post_media;
CREATE POLICY "Friends posts media viewable by friends"
  ON post_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = post_media.post_id 
      AND posts.privacy = 'friends'
      AND (
        posts.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM friend_requests fr
          WHERE fr.status = 'accepted'
          AND (
            (fr.sender_id = auth.uid() AND fr.receiver_id = posts.user_id)
            OR (fr.receiver_id = auth.uid() AND fr.sender_id = posts.user_id)
          )
        )
      )
    )
  );

-- Politique: Voir ses propres médias
DROP POLICY IF EXISTS "Users can view their own post media" ON post_media;
CREATE POLICY "Users can view their own post media"
  ON post_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = post_media.post_id 
      AND posts.user_id = auth.uid()
    )
  );

-- Politique: Insérer des médias dans ses propres posts
DROP POLICY IF EXISTS "Users can insert media to their posts" ON post_media;
CREATE POLICY "Users can insert media to their posts"
  ON post_media FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = post_media.post_id 
      AND posts.user_id = auth.uid()
    )
  );

-- Politique: Supprimer les médias de ses propres posts
DROP POLICY IF EXISTS "Users can delete their own post media" ON post_media;
CREATE POLICY "Users can delete their own post media"
  ON post_media FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = post_media.post_id 
      AND posts.user_id = auth.uid()
    )
  );

-- ============================================
-- ACTIVER REALTIME SUR TOUTES LES TABLES
-- ============================================

-- Fonction helper pour ajouter une table à la publication seulement si elle n'y est pas déjà
DO $$
BEGIN
  -- friend_requests
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'friend_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE friend_requests;
  END IF;

  -- notifications
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;

  -- posts
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'posts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE posts;
  END IF;

  -- post_media
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'post_media'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE post_media;
  END IF;

  -- likes
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'likes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE likes;
  END IF;

  -- comments
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE comments;
  END IF;
END $$;