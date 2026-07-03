-- ============================================
-- COMMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.comments (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    post_id UUID NOT NULL
        REFERENCES public.posts(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    parent_comment_id UUID
        REFERENCES public.comments(id)
        ON DELETE CASCADE,

    content TEXT NOT NULL,

    media_url TEXT,

    media_type TEXT,

    likes_count INTEGER NOT NULL DEFAULT 0,

    replies_count INTEGER NOT NULL DEFAULT 0,

    edited BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT comments_content_check
    CHECK (
        length(trim(content)) > 0
    )
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_comments_post
ON public.comments(post_id);

CREATE INDEX IF NOT EXISTS idx_comments_user
ON public.comments(user_id);

CREATE INDEX IF NOT EXISTS idx_comments_parent
ON public.comments(parent_comment_id);

CREATE INDEX IF NOT EXISTS idx_comments_created
ON public.comments(created_at DESC);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

CREATE TRIGGER trg_comments_updated_at
BEFORE UPDATE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();