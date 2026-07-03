-- ============================================
-- STORIES
-- ============================================

CREATE TABLE IF NOT EXISTS public.stories (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    media_url TEXT NOT NULL,

    media_type TEXT NOT NULL
        CHECK (media_type IN ('image', 'video', 'audio')),

    caption TEXT,

    background_color TEXT,

    text_color TEXT,

    privacy TEXT NOT NULL DEFAULT 'public'
        CHECK (privacy IN ('public', 'friends', 'private')),

    views_count INTEGER NOT NULL DEFAULT 0,

    replies_count INTEGER NOT NULL DEFAULT 0,

    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),

    is_archived BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT stories_media_not_empty
        CHECK (length(trim(media_url)) > 0)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_stories_user
ON public.stories(user_id);

CREATE INDEX IF NOT EXISTS idx_stories_created
ON public.stories(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stories_expires
ON public.stories(expires_at);

CREATE INDEX IF NOT EXISTS idx_stories_privacy
ON public.stories(privacy);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

CREATE TRIGGER trg_stories_updated_at
BEFORE UPDATE
ON public.stories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();