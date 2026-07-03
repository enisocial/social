-- Verify Supabase Audio Storage Configuration
-- Run this to check if the audio storage fixes were applied correctly

-- Check voice-posts bucket configuration
SELECT
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'voice-posts';

-- Check storage policies for voice-posts
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%voice_posts%'
ORDER BY policyname;

-- Check recent audio file uploads
SELECT
  id,
  name,
  bucket_id,
  metadata,
  created_at
FROM storage.objects
WHERE bucket_id = 'voice-posts'
ORDER BY created_at DESC
LIMIT 5;

-- Check if MIME types are properly configured
SELECT '✅ Audio storage verification completed' as status;
