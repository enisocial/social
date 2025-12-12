-- Ajouter les colonnes manquantes dans la table profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS birthdate DATE,
ADD COLUMN IF NOT EXISTS relationship_status TEXT,
ADD COLUMN IF NOT EXISTS current_city TEXT,
ADD COLUMN IF NOT EXISTS hometown TEXT;

-- Commentaires pour les nouvelles colonnes
COMMENT ON COLUMN profiles.email IS 'Adresse email de l''utilisateur';
COMMENT ON COLUMN profiles.phone IS 'Numéro de téléphone';
COMMENT ON COLUMN profiles.website IS 'Site web personnel';
COMMENT ON COLUMN profiles.birthdate IS 'Date de naissance';
COMMENT ON COLUMN profiles.relationship_status IS 'Statut relationnel';
COMMENT ON COLUMN profiles.current_city IS 'Ville actuelle';
COMMENT ON COLUMN profiles.hometown IS 'Ville natale';
