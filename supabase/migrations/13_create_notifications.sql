-- =====================================================
-- 13_create_notifications.sql
-- Système de notifications
-- =====================================================

CREATE TABLE public.notifications (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    actor_id UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    type TEXT NOT NULL
        CHECK (
            type IN (
                'friend_request',
                'friend_accepted',
                'post_like',
                'post_comment',
                'comment_reply',
                'comment_like',
                'post_share',
                'mention',
                'message',
                'group_invite',
                'system'
            )
        ),

    title TEXT NOT NULL,

    body TEXT,

    data JSONB DEFAULT '{}'::jsonb,

    is_read BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- Index
-- =====================================================

CREATE INDEX idx_notifications_user
ON public.notifications(user_id);

CREATE INDEX idx_notifications_read
ON public.notifications(user_id, is_read);

CREATE INDEX idx_notifications_created
ON public.notifications(created_at DESC);

CREATE INDEX idx_notifications_type
ON public.notifications(type);

-- =====================================================
-- RLS
-- =====================================================

ALTER TABLE public.notifications
ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------
-- Lecture
---------------------------------------------------------

CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
USING (
    auth.uid() = user_id
);

---------------------------------------------------------
-- Création
---------------------------------------------------------

CREATE POLICY "Authenticated users create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (
    auth.role() = 'authenticated'
);

---------------------------------------------------------
-- Modification
---------------------------------------------------------

CREATE POLICY "Users update own notifications"
ON public.notifications
FOR UPDATE
USING (
    auth.uid() = user_id
);

---------------------------------------------------------
-- Suppression
---------------------------------------------------------

CREATE POLICY "Users delete own notifications"
ON public.notifications
FOR DELETE
USING (
    auth.uid() = user_id
);

-- =====================================================
-- Fonction : marquer comme lues
-- =====================================================

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(
    p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN

    UPDATE public.notifications
    SET is_read = TRUE
    WHERE user_id = p_user_id
      AND is_read = FALSE;

END;
$$;

GRANT EXECUTE
ON FUNCTION public.mark_all_notifications_read(UUID)
TO authenticated;