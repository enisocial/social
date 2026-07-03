-- Fix Supabase Storage Configuration for Audio Files
-- Run this script in Supabase SQL Editor or via CLI
-- Addresses AVFoundationErrorDomain -11850 error for iOS audio playback

-- Update voice-posts bucket configuration
UPDATE storage.buckets
SET
  public = true,
  file_size_limit = 10485760, -- 10MB
  allowed_mime_types = ARRAY[
    'audio/mpeg',      -- MP3
    'audio/mp3',       -- Alternative MP3
    'audio/m4a',       -- M4A (AAC)
    'audio/x-m4a',     -- Alternative M4A
    'audio/aac',       -- AAC
    'audio/wav',       -- WAV
    'audio/webm',      -- WebM (fallback)
    'audio/ogg'        -- OGG
  ]
WHERE id = 'voice-posts';

-- Ensure bucket exists if not already
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voice-posts',
  'voice-posts',
  true,
  10485760,
  ARRAY[
    'audio/mpeg', 'audio/mp3', 'audio/m4a', 'audio/x-m4a',
    'audio/aac', 'audio/wav', 'audio/webm', 'audio/ogg'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Recreate storage policies
DROP POLICY IF EXISTS "voice_posts_bucket_upload_policy" ON storage.objects;
DROP POLICY IF EXISTS "voice_posts_bucket_public_read_policy" ON storage.objects;
DROP POLICY IF EXISTS "voice_posts_bucket_delete_policy" ON storage.objects;
DROP POLICY IF EXISTS "voice_posts_bucket_update_policy" ON storage.objects;

-- Upload policy
CREATE POLICY "voice_posts_bucket_upload_policy" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'voice-posts'
    AND auth.role() = 'authenticated'
  );

-- Public read policy (essential for audio streaming)
CREATE POLICY "voice_posts_bucket_public_read_policy" ON storage.objects
  FOR SELECT USING (bucket_id = 'voice-posts');

-- Delete policy
CREATE POLICY "voice_posts_bucket_delete_policy" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'voice-posts'
    AND auth.role() = 'authenticated'
  );

-- Update policy
CREATE POLICY "voice_posts_bucket_update_policy" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'voice-posts'
    AND auth.role() = 'authenticated'
  );

-- Migration completed successfully
