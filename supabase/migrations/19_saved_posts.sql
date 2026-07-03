-- ============================================
-- SAVED POSTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.saved_posts (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    post_id UUID NOT NULL
        REFERENCES public.posts(id)
        ON DELETE CASCADE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT unique_saved_post
        UNIQUE (user_id, post_id)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_saved_posts_user
ON public.saved_posts(user_id);

CREATE INDEX IF NOT EXISTS idx_saved_posts_post
ON public.saved_posts(post_id);

CREATE INDEX IF NOT EXISTS idx_saved_posts_created
ON public.saved_posts(created_at DESC);