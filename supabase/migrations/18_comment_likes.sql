-- ============================================
-- COMMENT LIKES
-- ============================================

CREATE TABLE IF NOT EXISTS public.comment_likes (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    comment_id UUID NOT NULL
        REFERENCES public.comments(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT unique_comment_like
        UNIQUE (comment_id, user_id)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_comment_likes_comment
ON public.comment_likes(comment_id);

CREATE INDEX IF NOT EXISTS idx_comment_likes_user
ON public.comment_likes(user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.update_comment_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

    IF TG_OP = 'INSERT' THEN

        UPDATE public.comments
        SET likes_count = likes_count + 1
        WHERE id = NEW.comment_id;

        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN

        UPDATE public.comments
        SET likes_count = GREATEST(likes_count - 1, 0)
        WHERE id = OLD.comment_id;

        RETURN OLD;

    END IF;

    RETURN NULL;

END;
$$;

-- ============================================
-- TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS trg_comment_like_insert
ON public.comment_likes;

CREATE TRIGGER trg_comment_like_insert
AFTER INSERT
ON public.comment_likes
FOR EACH ROW
EXECUTE FUNCTION public.update_comment_likes_count();


DROP TRIGGER IF EXISTS trg_comment_like_delete
ON public.comment_likes;

CREATE TRIGGER trg_comment_like_delete
AFTER DELETE
ON public.comment_likes
FOR EACH ROW
EXECUTE FUNCTION public.update_comment_likes_count();