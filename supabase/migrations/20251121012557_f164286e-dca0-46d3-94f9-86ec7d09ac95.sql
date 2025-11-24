-- Fix profiles RLS policy to handle missing account_settings
-- Drop existing policies that require account_settings
DROP POLICY IF EXISTS "Public profiles are viewable" ON public.profiles;
DROP POLICY IF EXISTS "Friends can view friends profiles" ON public.profiles;

-- Create default account_settings for users who don't have them
INSERT INTO public.account_settings (user_id, profile_visibility, allow_messages_from, show_online_status)
SELECT id, 'public'::post_privacy, 'public'::post_privacy, true
FROM public.profiles
WHERE id NOT IN (SELECT user_id FROM public.account_settings)
ON CONFLICT (user_id) DO NOTHING;

-- Recreate policies with proper fallback for missing account_settings
CREATE POLICY "Public profiles are viewable"
ON public.profiles
FOR SELECT
TO public
USING (
  -- Allow if explicitly set to public OR if no account_settings exist (default to public)
  NOT EXISTS (
    SELECT 1 FROM account_settings 
    WHERE account_settings.user_id = profiles.id 
    AND account_settings.profile_visibility != 'public'::post_privacy
  )
);

CREATE POLICY "Friends can view friends profiles"
ON public.profiles
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM account_settings
    WHERE account_settings.user_id = profiles.id
    AND account_settings.profile_visibility = 'friends'::post_privacy
    AND check_friendship(auth.uid(), profiles.id)
  )
);