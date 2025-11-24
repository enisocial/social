-- Create special system albums for profile photos, cover photos, and post photos
-- These will be automatically created and managed

-- Add a system_album column to photo_albums to identify special albums
ALTER TABLE photo_albums ADD COLUMN IF NOT EXISTS system_album TEXT;

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_photo_albums_system_album ON photo_albums(user_id, system_album) WHERE system_album IS NOT NULL;

-- Create a function to ensure system albums exist for a user
CREATE OR REPLACE FUNCTION ensure_system_albums(user_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile pictures album if it doesn't exist
  INSERT INTO photo_albums (user_id, name, description, privacy, system_album)
  VALUES (
    user_id_param,
    'Photos de profil',
    'Historique de vos photos de profil',
    'public',
    'profile_pictures'
  )
  ON CONFLICT DO NOTHING;

  -- Create cover photos album if it doesn't exist
  INSERT INTO photo_albums (user_id, name, description, privacy, system_album)
  VALUES (
    user_id_param,
    'Photos de couverture',
    'Historique de vos photos de couverture',
    'public',
    'cover_photos'
  )
  ON CONFLICT DO NOTHING;

  -- Create post photos album if it doesn't exist
  INSERT INTO photo_albums (user_id, name, description, privacy, system_album)
  VALUES (
    user_id_param,
    'Photos de publications',
    'Photos de vos publications',
    'public',
    'post_photos'
  )
  ON CONFLICT DO NOTHING;
END;
$$;

-- Add unique constraint to prevent duplicate system albums per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_system_albums 
ON photo_albums(user_id, system_album) 
WHERE system_album IS NOT NULL;