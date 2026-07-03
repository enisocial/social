-- ============================================================
-- FILE 28 - GROUP COMMENTS
-- Compatible avec les publications classiques et les groupes
-- ============================================================

------------------------------------------------------------
-- Vérification
------------------------------------------------------------

DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema='public'
        AND table_name='comments'
    ) THEN
        RAISE EXCEPTION 'Table comments introuvable.';
    END IF;

END $$;

------------------------------------------------------------
-- Index
------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_comments_post
ON public.comments(post_id);

CREATE INDEX IF NOT EXISTS idx_comments_user
ON public.comments(user_id);

CREATE INDEX IF NOT EXISTS idx_comments_parent
ON public.comments(parent_comment_id);

CREATE INDEX IF NOT EXISTS idx_comments_created
ON public.comments(created_at DESC);

------------------------------------------------------------
-- Fonction
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.can_comment_post(
    p_post UUID,
    p_user UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS
$$

SELECT EXISTS (

    SELECT 1

    FROM public.posts p

    LEFT JOIN public.group_members gm

           ON gm.group_id = p.group_id
          AND gm.user_id = p_user
          AND gm.status = 'accepted'

    WHERE p.id = p_post

      AND (

            p.group_id IS NULL

            OR

            gm.id IS NOT NULL

      )

);

$$;

------------------------------------------------------------
-- Lecture
------------------------------------------------------------

DROP POLICY IF EXISTS "Read comments" ON public.comments;

CREATE POLICY "Read comments"

ON public.comments

FOR SELECT

USING (

    public.can_comment_post(post_id, auth.uid())

);

------------------------------------------------------------
-- Création
------------------------------------------------------------

DROP POLICY IF EXISTS "Insert comments" ON public.comments;

CREATE POLICY "Insert comments"

ON public.comments

FOR INSERT

WITH CHECK (

    user_id = auth.uid()

    AND

    public.can_comment_post(post_id, auth.uid())

);

------------------------------------------------------------
-- Modification
------------------------------------------------------------

DROP POLICY IF EXISTS "Update own comments" ON public.comments;

CREATE POLICY "Update own comments"

ON public.comments

FOR UPDATE

USING (

    user_id = auth.uid()

);

------------------------------------------------------------
-- Suppression
------------------------------------------------------------

DROP POLICY IF EXISTS "Delete own comments" ON public.comments;

CREATE POLICY "Delete own comments"

ON public.comments

FOR DELETE

USING (

    user_id = auth.uid()

);

------------------------------------------------------------
-- Fonction de comptage automatique
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_post_comment_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS
$$
BEGIN

    IF TG_OP = 'INSERT' THEN

        UPDATE public.posts
        SET comment_count = comment_count + 1
        WHERE id = NEW.post_id;

        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN

        UPDATE public.posts
        SET comment_count = GREATEST(comment_count - 1,0)
        WHERE id = OLD.post_id;

        RETURN OLD;

    END IF;

    RETURN NULL;

END;
$$;

------------------------------------------------------------
-- Trigger
------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_post_comment_count_insert
ON public.comments;

DROP TRIGGER IF EXISTS trg_post_comment_count_delete
ON public.comments;

CREATE TRIGGER trg_post_comment_count_insert

AFTER INSERT

ON public.comments

FOR EACH ROW

EXECUTE FUNCTION public.update_post_comment_count();

CREATE TRIGGER trg_post_comment_count_delete

AFTER DELETE

ON public.comments

FOR EACH ROW

EXECUTE FUNCTION public.update_post_comment_count();

------------------------------------------------------------
-- Documentation
------------------------------------------------------------

COMMENT ON TABLE public.comments IS
'Commentaires des publications classiques et des publications de groupes.';