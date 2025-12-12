-- Create RLS policies for platform_settings table
-- Only admins should be able to manage platform settings

-- Enable RLS on platform_settings if not already enabled
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins can view platform settings" ON platform_settings;
DROP POLICY IF EXISTS "Admins can insert platform settings" ON platform_settings;
DROP POLICY IF EXISTS "Admins can update platform settings" ON platform_settings;
DROP POLICY IF EXISTS "Admins can delete platform settings" ON platform_settings;

-- Allow admins to view all platform settings
CREATE POLICY "Admins can view platform settings"
ON platform_settings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Allow admins to insert platform settings
CREATE POLICY "Admins can insert platform settings"
ON platform_settings
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Allow admins to update platform settings
CREATE POLICY "Admins can update platform settings"
ON platform_settings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Allow admins to delete platform settings
CREATE POLICY "Admins can delete platform settings"
ON platform_settings
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Insert some default platform settings if they don't exist
INSERT INTO platform_settings (key, value, category, description) VALUES
  ('platform_name', '"Ma Plateforme Sociale"', 'general', 'Nom de la plateforme'),
  ('platform_description', '"Une plateforme sociale moderne et innovante"', 'general', 'Description de la plateforme'),
  ('contact_email', '"contact@plateforme.com"', 'general', 'Email de contact'),
  ('maintenance_mode', 'false', 'system', 'Mode maintenance activé/désactivé'),
  ('registration_enabled', 'true', 'system', 'Autoriser les nouvelles inscriptions'),
  ('max_upload_size', '5242880', 'limits', 'Taille maximale de téléchargement en octets (5MB par défaut)'),
  ('max_posts_per_day', '50', 'limits', 'Nombre maximum de posts par jour par utilisateur'),
  ('auto_moderation', 'false', 'moderation', 'Modération automatique activée'),
  ('min_password_length', '8', 'security', 'Longueur minimale du mot de passe')
ON CONFLICT (key) DO NOTHING;