-- Ajouter les paramètres de confidentialité pour contrôler la visibilité des informations du profil
ALTER TABLE profiles
ADD COLUMN privacy_bio TEXT DEFAULT 'friends' CHECK (privacy_bio IN ('public', 'friends', 'private')),
ADD COLUMN privacy_work TEXT DEFAULT 'friends' CHECK (privacy_work IN ('public', 'friends', 'private')),
ADD COLUMN privacy_education TEXT DEFAULT 'friends' CHECK (privacy_education IN ('public', 'friends', 'private')),
ADD COLUMN privacy_current_city TEXT DEFAULT 'friends' CHECK (privacy_current_city IN ('public', 'friends', 'private')),
ADD COLUMN privacy_hometown TEXT DEFAULT 'friends' CHECK (privacy_hometown IN ('public', 'friends', 'private')),
ADD COLUMN privacy_relationship_status TEXT DEFAULT 'friends' CHECK (privacy_relationship_status IN ('public', 'friends', 'private')),
ADD COLUMN privacy_birthdate TEXT DEFAULT 'friends' CHECK (privacy_birthdate IN ('public', 'friends', 'private')),
ADD COLUMN privacy_website TEXT DEFAULT 'public' CHECK (privacy_website IN ('public', 'friends', 'private')),
ADD COLUMN privacy_phone TEXT DEFAULT 'friends' CHECK (privacy_phone IN ('public', 'friends', 'private')),
ADD COLUMN privacy_email TEXT DEFAULT 'friends' CHECK (privacy_email IN ('public', 'friends', 'private'));

-- Commentaires pour les colonnes de confidentialité
COMMENT ON COLUMN profiles.privacy_bio IS 'Visibilité de la biographie : public, friends, private';
COMMENT ON COLUMN profiles.privacy_work IS 'Visibilité du travail : public, friends, private';
COMMENT ON COLUMN profiles.privacy_education IS 'Visibilité de la formation : public, friends, private';
COMMENT ON COLUMN profiles.privacy_current_city IS 'Visibilité de la ville actuelle : public, friends, private';
COMMENT ON COLUMN profiles.privacy_hometown IS 'Visibilité de la ville natale : public, friends, private';
COMMENT ON COLUMN profiles.privacy_relationship_status IS 'Visibilité du statut relationnel : public, friends, private';
COMMENT ON COLUMN profiles.privacy_birthdate IS 'Visibilité de la date de naissance : public, friends, private';
COMMENT ON COLUMN profiles.privacy_website IS 'Visibilité du site web : public, friends, private';
COMMENT ON COLUMN profiles.privacy_phone IS 'Visibilité du téléphone : public, friends, private';
COMMENT ON COLUMN profiles.privacy_email IS 'Visibilité de l''email : public, friends, private';
