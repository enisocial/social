-- Create support_messages table for help center
CREATE TABLE IF NOT EXISTS support_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'closed')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'technical', 'account', 'billing', 'abuse', 'other')),
  admin_response TEXT,
  admin_response_at TIMESTAMP WITH TIME ZONE,
  responded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Users can create their own support messages
CREATE POLICY "Users can create support messages" ON support_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can view their own support messages
CREATE POLICY "Users can view own support messages" ON support_messages
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view and update all support messages
CREATE POLICY "Admins can manage all support messages" ON support_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'moderator')
    )
  );

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_support_messages_user_id ON support_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_status ON support_messages(status);
CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON support_messages(created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_support_message_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_update_support_message_updated_at
  BEFORE UPDATE ON support_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_support_message_updated_at();

-- Insert some sample data for testing
INSERT INTO support_messages (user_id, subject, message, status, priority, category)
SELECT
  p.id,
  'Problème de connexion',
  'Bonjour, j''ai des difficultés à me connecter à mon compte. Pouvez-vous m''aider ?',
  'pending',
  'normal',
  'account'
FROM profiles p
INNER JOIN user_roles ur ON ur.user_id = p.id
WHERE ur.role = 'user'
LIMIT 1;

INSERT INTO support_messages (user_id, subject, message, status, priority, category)
SELECT
  p.id,
  'Question technique',
  'Comment puis-je modifier ma photo de profil ?',
  'in_progress',
  'low',
  'technical'
FROM profiles p
INNER JOIN user_roles ur ON ur.user_id = p.id
WHERE ur.role = 'user'
LIMIT 1;

INSERT INTO support_messages (user_id, subject, message, status, priority, category, admin_response, admin_response_at)
SELECT
  p.id,
  'Signalement d''abus',
  'J''ai été victime de harcèlement sur la plateforme.',
  'resolved',
  'high',
  'abuse',
  'Nous avons examiné votre signalement et pris les mesures appropriées. L''utilisateur a été suspendu.',
  NOW()
FROM profiles p
INNER JOIN user_roles ur ON ur.user_id = p.id
WHERE ur.role = 'user'
LIMIT 1;
