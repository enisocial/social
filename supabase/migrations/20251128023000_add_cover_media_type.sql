-- Ajouter la colonne cover_media_type pour distinguer images et vidéos de couverture
ALTER TABLE profiles
ADD COLUMN cover_media_type TEXT DEFAULT 'image' CHECK (cover_media_type IN ('image', 'video'));

-- Commentaire pour la colonne
COMMENT ON COLUMN profiles.cover_media_type IS 'Type de média pour la couverture : image ou video';
