-- Ajouter le champ cover_video_muted pour contrôler si la vidéo de couverture doit être muette
ALTER TABLE profiles
ADD COLUMN cover_video_muted BOOLEAN DEFAULT true;

-- Commentaire pour la colonne
COMMENT ON COLUMN profiles.cover_video_muted IS 'Indique si la vidéo de couverture doit être muette (true) ou avec son (false)';
