-- ============================================
-- PHOTO ALBUMS
-- ============================================

CREATE TABLE IF NOT EXISTS public.photo_albums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    name TEXT NOT NULL,

    description TEXT,

    privacy TEXT NOT NULL DEFAULT 'public'
        CHECK (
            privacy IN (
                'public',
                'friends',
                'private'
            )
        ),

    system_album TEXT,

    cover_photo TEXT,

    photos_count INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_photo_albums_user
ON public.photo_albums(user_id);

CREATE INDEX IF NOT EXISTS idx_photo_albums_privacy
ON public.photo_albums(privacy);

CREATE INDEX IF NOT EXISTS idx_photo_albums_system
ON public.photo_albums(user_id, system_album)
WHERE system_album IS NOT NULL;

-- ============================================
-- UNIQUE SYSTEM ALBUMS
-- ============================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_system_album
ON public.photo_albums(user_id, system_album)
WHERE system_album IS NOT NULL;

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

CREATE TRIGGER trg_photo_albums_updated_at
BEFORE UPDATE ON public.photo_albums
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();