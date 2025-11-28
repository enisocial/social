-- MIGRATION POUR AJOUTER LE SYSTÈME DE PRÉSENCE EN TEMPS RÉEL

-- 1. TABLE POUR STOCKER L'ÉTAT DE PRÉSENCE DES UTILISATEURS
CREATE TABLE IF NOT EXISTS user_presence (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. POLICIES RLS
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire la présence des autres
CREATE POLICY "Anyone can read presence" ON user_presence FOR SELECT USING (true);

-- Les utilisateurs peuvent modifier leur propre présence
CREATE POLICY "Users can update own presence" ON user_presence FOR ALL USING (auth.uid() = user_id);

-- 3. FONCTION POUR METTRE À JOUR LA PRÉSENCE
CREATE OR REPLACE FUNCTION update_user_presence(user_uuid UUID, online_status BOOLEAN DEFAULT true)
RETURNS void AS $$
BEGIN
  INSERT INTO user_presence (user_id, is_online, last_seen, updated_at)
  VALUES (user_uuid, online_status, NOW(), NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET
    is_online = EXCLUDED.is_online,
    last_seen = CASE WHEN EXCLUDED.is_online THEN NOW() ELSE user_presence.last_seen END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. TRIGGER POUR METTRE À JOUR LE TIMESTAMP
CREATE OR REPLACE FUNCTION update_presence_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_presence_timestamp
  BEFORE UPDATE ON user_presence
  FOR EACH ROW
  EXECUTE FUNCTION update_presence_timestamp();

-- 5. FONCTION POUR NETTOYER LES UTILISATEURS HORS LIGNE DEPUIS LONGTEMPS
CREATE OR REPLACE FUNCTION cleanup_old_presence()
RETURNS void AS $$
BEGIN
  -- Marquer comme hors ligne les utilisateurs inactifs depuis plus de 5 minutes
  UPDATE user_presence
  SET is_online = false, last_seen = updated_at
  WHERE updated_at < NOW() - INTERVAL '5 minutes' AND is_online = true;
END;
$$ LANGUAGE plpgsql;

-- 6. INSÉRER UNE PRÉSENCE PAR DÉFAUT POUR LES UTILISATEURS EXISTANTS
INSERT INTO user_presence (user_id, is_online, last_seen)
SELECT id, false, NOW()
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_presence)
ON CONFLICT DO NOTHING;
