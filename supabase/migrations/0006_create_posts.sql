-- =====================================================
-- 06_create_posts.sql
-- Publications
-- =====================================================

CREATE TABLE public.posts (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    content TEXT,

    visibility TEXT NOT NULL DEFAULT 'public'
        CHECK (
            visibility IN (
                'public',
                'friends',
                'private'
            )
        ),

    comments_enabled BOOLEAN NOT NULL DEFAULT TRUE,

    shares_enabled BOOLEAN NOT NULL DEFAULT TRUE,

    likes_count INTEGER NOT NULL DEFAULT 0,

    comments_count INTEGER NOT NULL DEFAULT 0,

    shares_count INTEGER NOT NULL DEFAULT 0,

    views_count INTEGER NOT NULL DEFAULT 0,

    is_edited BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CHECK (
        content IS NOT NULL
        OR length(coalesce(content,'')) >= 0
    )
);

-- =====================================================
-- Trigger updated_at
-- =====================================================

CREATE TRIGGER update_posts_updated_at
BEFORE UPDATE
ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- Index
-- =====================================================

CREATE INDEX idx_posts_user
ON public.posts(user_id);

CREATE INDEX idx_posts_created
ON public.posts(created_at DESC);

CREATE INDEX idx_posts_visibility
ON public.posts(visibility);

-- =====================================================
-- RLS
-- =====================================================

ALTER TABLE public.posts
ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------
-- Lecture
---------------------------------------------------------

CREATE POLICY "Users can view public posts"
ON public.posts
FOR SELECT
USING (

    visibility = 'public'

    OR

    (
        visibility = 'private'
        AND auth.uid() = user_id
    )

    OR

    (
        visibility = 'friends'
    )
);

---------------------------------------------------------
-- Création
---------------------------------------------------------

CREATE POLICY "Users can create own posts"
ON public.posts
FOR INSERT
WITH CHECK (
    auth.uid() = user_id
);

---------------------------------------------------------
-- Modification
---------------------------------------------------------

CREATE POLICY "Users can update own posts"
ON public.posts
FOR UPDATE
USING (
    auth.uid() = user_id
);

---------------------------------------------------------
-- Suppression
---------------------------------------------------------

CREATE POLICY "Users can delete own posts"
ON public.posts
FOR DELETE
USING (
    auth.uid() = user_id
);