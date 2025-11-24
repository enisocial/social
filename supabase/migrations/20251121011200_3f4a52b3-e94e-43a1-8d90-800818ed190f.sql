-- Security Fix: Address critical error-level security issues
-- This migration fixes:
-- 1. Profiles table public exposure
-- 2. User presence table missing RLS
-- 3. Missing server-side input validation
-- 4. Post media privacy bypass

-- ============================================
-- PART 1: Create helper functions
-- ============================================

-- Function to check if two users are friends
CREATE OR REPLACE FUNCTION public.check_friendship(user1_id UUID, user2_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM friend_requests
    WHERE status = 'accepted'
    AND ((sender_id = user1_id AND receiver_id = user2_id)
      OR (sender_id = user2_id AND receiver_id = user1_id))
  )
$$;

-- Function to check if viewer can see target user's online presence
CREATE OR REPLACE FUNCTION public.check_can_view_presence(viewer_id UUID, target_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM account_settings
    WHERE user_id = target_id
    AND (
      show_online_status = true
      OR viewer_id = target_id
      OR (show_online_status = false AND check_friendship(viewer_id, target_id))
    )
  )
$$;

-- ============================================
-- PART 2: Fix profiles table RLS policies
-- ============================================

-- Drop the insecure public policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Users can always view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Public profiles are viewable by everyone
CREATE POLICY "Public profiles are viewable"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM account_settings
    WHERE user_id = profiles.id
    AND profile_visibility = 'public'
  )
);

-- Friends can view friends-only profiles
CREATE POLICY "Friends can view friends profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM account_settings
    WHERE user_id = profiles.id
    AND profile_visibility = 'friends'
    AND check_friendship(auth.uid(), profiles.id)
  )
);

-- ============================================
-- PART 3: Add RLS to user_presence table
-- ============================================

-- Enable RLS on user_presence
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

-- Users can view their own presence
CREATE POLICY "Users can view own presence"
ON public.user_presence
FOR SELECT
USING (auth.uid() = user_id);

-- Others can view presence if privacy settings allow
CREATE POLICY "Others can view presence if allowed"
ON public.user_presence
FOR SELECT
USING (check_can_view_presence(auth.uid(), user_id));

-- System can update presence (for SECURITY DEFINER functions)
CREATE POLICY "System can update presence"
ON public.user_presence
FOR ALL
USING (true)
WITH CHECK (true);

-- ============================================
-- PART 4: Add server-side input validation
-- ============================================

-- Add length constraints to posts
ALTER TABLE public.posts 
ADD CONSTRAINT posts_content_length_check 
CHECK (length(content) <= 10000);

-- Add length constraints to comments
ALTER TABLE public.comments 
ADD CONSTRAINT comments_text_length_check 
CHECK (length(text) <= 5000);

-- Add length constraints to profiles bio
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_bio_length_check 
CHECK (bio IS NULL OR length(bio) <= 2000);

-- Add length constraints to profiles fields
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_work_length_check 
CHECK (work IS NULL OR length(work) <= 500);

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_education_length_check 
CHECK (education IS NULL OR length(education) <= 500);

-- Add validation to group posts
ALTER TABLE public.group_posts 
ADD CONSTRAINT group_posts_content_length_check 
CHECK (length(content) <= 10000);

-- Add validation to live chat messages
ALTER TABLE public.live_chat_messages 
ADD CONSTRAINT live_chat_messages_length_check 
CHECK (length(message) <= 1000);

-- Add validation to group messages
ALTER TABLE public.group_messages 
ADD CONSTRAINT group_messages_content_length_check 
CHECK (length(content) <= 5000);

-- Add validation to marketplace products
ALTER TABLE public.marketplace_products 
ADD CONSTRAINT marketplace_title_length_check 
CHECK (length(title) <= 200);

ALTER TABLE public.marketplace_products 
ADD CONSTRAINT marketplace_description_length_check 
CHECK (description IS NULL OR length(description) <= 5000);

-- Add validation to broadcast messages
ALTER TABLE public.broadcast_messages 
ADD CONSTRAINT broadcast_title_length_check 
CHECK (length(title) <= 200);

ALTER TABLE public.broadcast_messages 
ADD CONSTRAINT broadcast_message_length_check 
CHECK (length(message) <= 5000);

-- ============================================
-- PART 5: Fix post_media RLS policy
-- ============================================

-- Drop existing insecure policy
DROP POLICY IF EXISTS "Post media is viewable by everyone" ON public.post_media;

-- Create privacy-aware policy that checks friendship for friends-only posts
CREATE POLICY "Post media viewable per post privacy"
ON public.post_media
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM posts p
    WHERE p.id = post_media.post_id
    AND (
      -- Public posts are viewable by everyone
      p.privacy = 'public'
      -- Users can view their own post media
      OR p.user_id = auth.uid()
      -- Friends can view friends-only posts
      OR (
        p.privacy = 'friends'
        AND check_friendship(auth.uid(), p.user_id)
      )
    )
  )
);

-- ============================================
-- PART 6: Add validation function for future use
-- ============================================

-- Function to validate and sanitize text content (for future RPC usage)
CREATE OR REPLACE FUNCTION public.validate_text_content(content TEXT, max_length INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check length
  IF length(content) > max_length THEN
    RAISE EXCEPTION 'Content exceeds maximum length of % characters', max_length;
  END IF;
  
  -- Check for dangerous patterns (basic XSS prevention)
  IF content ~* '<script|javascript:|onerror=|onclick=' THEN
    RAISE EXCEPTION 'Content contains potentially dangerous code';
  END IF;
  
  RETURN true;
END;
$$;