-- ============================================
-- ALBUM PHOTOS
-- ============================================

CREATE TABLE IF NOT EXISTS public.album_photos (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    album_id UUID NOT NULL
        REFERENCES public.photo_albums(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    storage_path TEXT NOT NULL,

    file_name TEXT,

    mime_type TEXT,

    file_size BIGINT,

    width INTEGER,

    height INTEGER,

    caption TEXT,

    position INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_album_photos_album
ON public.album_photos(album_id);

CREATE INDEX IF NOT EXISTS idx_album_photos_user
ON public.album_photos(user_id);

CREATE INDEX IF NOT EXISTS idx_album_photos_position
ON public.album_photos(album_id, position);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

CREATE TRIGGER trg_album_photos_updated_at
BEFORE UPDATE ON public.album_photos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();