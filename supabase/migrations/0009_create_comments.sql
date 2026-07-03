-- =====================================================
-- 09_create_comments.sql
-- Commentaires des publications
-- =====================================================

CREATE TABLE public.comments (

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

    is_edited BOOLEAN NOT NULL DEFAULT FALSE,

    likes_count INTEGER NOT NULL DEFAULT 0,

    replies_count INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CHECK(length(trim(content)) > 0)
);

-- =====================================================
-- Trigger updated_at
-- =====================================================

CREATE TRIGGER update_comments_updated_at
BEFORE UPDATE
ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- Index
-- =====================================================

CREATE INDEX idx_comments_post
ON public.comments(post_id);

CREATE INDEX idx_comments_user
ON public.comments(user_id);

CREATE INDEX idx_comments_parent
ON public.comments(parent_comment_id);

CREATE INDEX idx_comments_created
ON public.comments(created_at DESC);

-- =====================================================
-- RLS
-- =====================================================

ALTER TABLE public.comments
ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------
-- Lecture
---------------------------------------------------------

CREATE POLICY "Users can view comments"
ON public.comments
FOR SELECT
USING (true);

---------------------------------------------------------
-- Création
---------------------------------------------------------

CREATE POLICY "Users can create comments"
ON public.comments
FOR INSERT
WITH CHECK (
    auth.uid() = user_id
);

---------------------------------------------------------
-- Modification
---------------------------------------------------------

CREATE POLICY "Users can update own comments"
ON public.comments
FOR UPDATE
USING (
    auth.uid() = user_id
);

---------------------------------------------------------
-- Suppression
---------------------------------------------------------

CREATE POLICY "Users can delete own comments"
ON public.comments
FOR DELETE
USING (
    auth.uid() = user_id
);

-- =====================================================
-- Fonction mise à jour compteur commentaires
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_post_comments_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

    IF TG_OP = 'INSERT' THEN

        UPDATE public.posts
        SET comments_count = (
            SELECT COUNT(*)
            FROM public.comments
            WHERE post_id = NEW.post_id
        )
        WHERE id = NEW.post_id;

        IF NEW.parent_comment_id IS NOT NULL THEN

            UPDATE public.comments
            SET replies_count = (
                SELECT COUNT(*)
                FROM public.comments
                WHERE parent_comment_id = NEW.parent_comment_id
            )
            WHERE id = NEW.parent_comment_id;

        END IF;

        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN

        UPDATE public.posts
        SET comments_count = (
            SELECT COUNT(*)
            FROM public.comments
            WHERE post_id = OLD.post_id
        )
        WHERE id = OLD.post_id;

        IF OLD.parent_comment_id IS NOT NULL THEN

            UPDATE public.comments
            SET replies_count = (
                SELECT COUNT(*)
                FROM public.comments
                WHERE parent_comment_id = OLD.parent_comment_id
            )
            WHERE id = OLD.parent_comment_id;

        END IF;

        RETURN OLD;

    ELSIF TG_OP = 'UPDATE' THEN

        RETURN NEW;

    END IF;

    RETURN NULL;

END;
$$;

-- =====================================================
-- Trigger compteur commentaires
-- =====================================================

CREATE TRIGGER trg_comments_counter
AFTER INSERT OR DELETE OR UPDATE
ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.update_post_comments_count();