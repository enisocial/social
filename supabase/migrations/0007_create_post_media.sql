-- =====================================================
-- 07_create_post_media.sql
-- Médias des publications
-- =====================================================

CREATE TABLE public.post_media (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    post_id UUID NOT NULL
        REFERENCES public.posts(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    media_type TEXT NOT NULL
        CHECK (
            media_type IN (
                'image',
                'video',
                'audio',
                'document'
            )
        ),

    storage_path TEXT NOT NULL,

    file_name TEXT,

    mime_type TEXT,

    file_size BIGINT,

    width INTEGER,

    height INTEGER,

    duration INTEGER,

    position INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- Index
-- =====================================================

CREATE INDEX idx_post_media_post
ON public.post_media(post_id);

CREATE INDEX idx_post_media_user
ON public.post_media(user_id);

CREATE INDEX idx_post_media_type
ON public.post_media(media_type);

-- =====================================================
-- RLS
-- =====================================================

ALTER TABLE public.post_media
ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------
-- Lecture
---------------------------------------------------------

CREATE POLICY "Users can view media"
ON public.post_media
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.posts p
        WHERE p.id = post_id
    )
);

---------------------------------------------------------
-- Création
---------------------------------------------------------

CREATE POLICY "Users can upload media"
ON public.post_media
FOR INSERT
WITH CHECK (
    auth.uid() = user_id
);

---------------------------------------------------------
-- Modification
---------------------------------------------------------

CREATE POLICY "Users can update own media"
ON public.post_media
FOR UPDATE
USING (
    auth.uid() = user_id
);

---------------------------------------------------------
-- Suppression
---------------------------------------------------------

CREATE POLICY "Users can delete own media"
ON public.post_media
FOR DELETE
USING (
    auth.uid() = user_id
);