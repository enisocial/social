-- Create broadcast messages table
CREATE TABLE IF NOT EXISTS public.broadcast_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'feature', 'maintenance', 'security', 'event'))
);

-- Enable RLS
ALTER TABLE public.broadcast_messages ENABLE ROW LEVEL SECURITY;

-- Admins can create broadcast messages
CREATE POLICY "Admins can create broadcast messages"
ON public.broadcast_messages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Admins can view all broadcast messages
CREATE POLICY "Admins can view broadcast messages"
ON public.broadcast_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Admins can delete broadcast messages
CREATE POLICY "Admins can delete broadcast messages"
ON public.broadcast_messages
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create function to send broadcast notification to all users
CREATE OR REPLACE FUNCTION public.send_broadcast_to_users(
  p_broadcast_id UUID,
  p_title TEXT,
  p_message TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Insert notification for each user
  FOR v_user_id IN SELECT id FROM public.profiles WHERE status = 'active' OR status IS NULL
  LOOP
    INSERT INTO public.notifications (user_id, type, metadata)
    VALUES (
      v_user_id,
      'follow', -- Réutilisation du type existant
      jsonb_build_object(
        'broadcast_id', p_broadcast_id,
        'title', p_title,
        'message', p_message,
        'is_broadcast', true
      )
    );
  END LOOP;
  
  -- Log admin action
  PERFORM log_admin_action(
    'BROADCAST_MESSAGE',
    'broadcast',
    p_broadcast_id,
    jsonb_build_object('title', p_title, 'recipients_count', (SELECT COUNT(*) FROM public.profiles WHERE status = 'active' OR status IS NULL))
  );
END;
$$;