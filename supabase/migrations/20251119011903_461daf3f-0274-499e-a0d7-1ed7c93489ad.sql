-- Add user moderation fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned')),
ADD COLUMN IF NOT EXISTS ban_reason TEXT,
ADD COLUMN IF NOT EXISTS ban_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS banned_by UUID REFERENCES public.profiles(id);

-- Create content moderation queue table
CREATE TABLE IF NOT EXISTS public.moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL CHECK (content_type IN ('post', 'comment', 'user', 'group')),
  content_id UUID NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'escalated')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  reason TEXT,
  reporter_id UUID REFERENCES public.profiles(id),
  moderator_id UUID REFERENCES public.profiles(id),
  moderator_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.moderation_queue ENABLE ROW LEVEL SECURITY;

-- Only admins and moderators can view moderation queue
CREATE POLICY "Admins and moderators can view moderation queue"
ON public.moderation_queue
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'moderator')
  )
);

-- Admins and moderators can update moderation items
CREATE POLICY "Admins and moderators can update moderation items"
ON public.moderation_queue
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'moderator')
  )
);

-- Anyone can insert to moderation queue (for reports)
CREATE POLICY "Anyone can report content"
ON public.moderation_queue
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create platform settings table
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings
CREATE POLICY "Everyone can read platform settings"
ON public.platform_settings
FOR SELECT
TO authenticated
USING (true);

-- Only admins can update settings
CREATE POLICY "Admins can update platform settings"
ON public.platform_settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Create indexes
CREATE INDEX idx_moderation_queue_status ON public.moderation_queue(status);
CREATE INDEX idx_moderation_queue_priority ON public.moderation_queue(priority);
CREATE INDEX idx_moderation_queue_created_at ON public.moderation_queue(created_at DESC);
CREATE INDEX idx_profiles_status ON public.profiles(status);

-- Insert default platform settings
INSERT INTO public.platform_settings (key, value, category, description) VALUES
  ('max_post_length', '5000', 'content', 'Maximum post content length in characters'),
  ('allow_anonymous', 'false', 'security', 'Allow anonymous browsing'),
  ('require_email_verification', 'true', 'security', 'Require email verification for new users'),
  ('min_age_requirement', '13', 'security', 'Minimum age requirement'),
  ('auto_moderation_enabled', 'true', 'moderation', 'Enable automatic content moderation'),
  ('report_threshold', '3', 'moderation', 'Number of reports before auto-flagging')
ON CONFLICT (key) DO NOTHING;

-- Function to ban user
CREATE OR REPLACE FUNCTION public.ban_user(
  p_user_id UUID,
  p_reason TEXT,
  p_duration_days INTEGER DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ban_until TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate ban expiry if temporary
  IF p_duration_days IS NOT NULL THEN
    v_ban_until := now() + (p_duration_days || ' days')::INTERVAL;
  END IF;

  -- Update user status
  UPDATE public.profiles
  SET 
    status = 'banned',
    ban_reason = p_reason,
    ban_until = v_ban_until,
    banned_at = now(),
    banned_by = auth.uid()
  WHERE id = p_user_id;

  -- Log the action
  PERFORM log_admin_action(
    'BAN_USER',
    'user',
    p_user_id,
    jsonb_build_object('reason', p_reason, 'duration_days', p_duration_days)
  );
END;
$$;

-- Function to unban user
CREATE OR REPLACE FUNCTION public.unban_user(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET 
    status = 'active',
    ban_reason = NULL,
    ban_until = NULL,
    banned_at = NULL,
    banned_by = NULL
  WHERE id = p_user_id;

  -- Log the action
  PERFORM log_admin_action('UNBAN_USER', 'user', p_user_id, '{}'::jsonb);
END;
$$;