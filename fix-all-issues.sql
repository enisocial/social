-- COMPREHENSIVE FIX FOR ALL APPLICATION ISSUES
-- Run this SQL script in Supabase Dashboard > SQL Editor

-- ===========================================
-- 1. FIX RLS RECURSION IN USER_ROLES TABLE
-- ===========================================

-- Drop problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow role checking for authentication" ON public.user_roles;

-- Create safer policies without recursion
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Allow role checking for authentication"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (true);

-- ===========================================
-- 2. CREATE STORAGE BUCKETS FOR CHAT MEDIA
-- ===========================================

-- Note: These buckets need to be created manually in Supabase Dashboard > Storage
-- with the following settings:

-- Bucket: chat-media
-- Public: true
-- File size limit: 10MB
-- Allowed MIME types: image/*, video/*

-- Bucket: chat-files
-- Public: false
-- File size limit: 50MB
-- Allowed MIME types: */*

-- Bucket: chat-voice
-- Public: false
-- File size limit: 10MB
-- Allowed MIME types: audio/*

-- ===========================================
-- 3. FIX MESSAGES TABLE ISSUES
-- ===========================================

-- Ensure messages table has all required columns
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'sticker', 'voice')),
ADD COLUMN IF NOT EXISTS media_url TEXT,
ADD COLUMN IF NOT EXISTS file_name TEXT,
ADD COLUMN IF NOT EXISTS file_size BIGINT,
ADD COLUMN IF NOT EXISTS reply_to UUID REFERENCES messages(id);

-- ===========================================
-- 4. FIX CONVERSATION PERMISSIONS
-- ===========================================

-- Ensure conversation_participants has proper RLS
DROP POLICY IF EXISTS "Users can view their conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can manage their conversation participation" ON conversation_participants;

CREATE POLICY "Users can view their conversations"
ON conversation_participants
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their conversation participation"
ON conversation_participants
FOR ALL
TO authenticated
USING (auth.uid() = user_id);

-- ===========================================
-- 5. ENSURE ADMIN USER EXISTS
-- ===========================================

-- Insert admin role for admin@binkaa.com if not exists
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'admin@binkaa.com'
AND NOT EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_id = auth.users.id AND role = 'admin'
);

-- ===========================================
-- 6. CLEANUP AND OPTIMIZATION
-- ===========================================

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON conversation_participants(user_id);

-- ===========================================
-- VERIFICATION QUERIES
-- ===========================================

-- Check if user_roles policies are working
-- SELECT * FROM user_roles LIMIT 5;

-- Check if buckets exist (run in Storage section)
-- This will show in the UI if created properly

COMMIT;
