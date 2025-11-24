-- Add cover photo to profiles
ALTER TABLE public.profiles ADD COLUMN cover_photo_url text;

-- Add privacy settings to posts
CREATE TYPE public.post_privacy AS ENUM ('public', 'friends', 'private');
ALTER TABLE public.posts ADD COLUMN privacy post_privacy NOT NULL DEFAULT 'public';

-- Create post views tracking table
CREATE TABLE public.post_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_at timestamp with time zone DEFAULT now(),
  UNIQUE(post_id, viewer_id)
);

-- Enable RLS on post_views
ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;

-- RLS policies for post_views
CREATE POLICY "Users can track their own views"
ON public.post_views FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = viewer_id);

CREATE POLICY "Post owners can view their post views"
ON public.post_views FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.posts
    WHERE posts.id = post_views.post_id
    AND posts.user_id = auth.uid()
  )
);

-- Create account privacy settings table
CREATE TABLE public.account_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  profile_visibility post_privacy NOT NULL DEFAULT 'public',
  allow_messages_from post_privacy NOT NULL DEFAULT 'public',
  show_online_status boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on account_settings
ALTER TABLE public.account_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for account_settings
CREATE POLICY "Users can view their own settings"
ON public.account_settings FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
ON public.account_settings FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
ON public.account_settings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Function to create default account settings
CREATE OR REPLACE FUNCTION public.create_default_account_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.account_settings (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

-- Trigger to create default settings when profile is created
CREATE TRIGGER on_profile_created_settings
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_account_settings();

-- Update the posts RLS policy to respect privacy settings
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;

CREATE POLICY "Posts are viewable based on privacy"
ON public.posts FOR SELECT
TO authenticated
USING (
  privacy = 'public'
  OR user_id = auth.uid()
  OR (
    privacy = 'friends' 
    AND EXISTS (
      SELECT 1 FROM public.follows
      WHERE (follower_id = auth.uid() AND following_id = posts.user_id)
      OR (follower_id = posts.user_id AND following_id = auth.uid())
    )
  )
);

-- Allow anonymous users to see only public posts
CREATE POLICY "Public posts viewable by anonymous"
ON public.posts FOR SELECT
TO anon
USING (privacy = 'public');