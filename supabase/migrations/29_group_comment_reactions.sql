-- ============================================================
-- FILE 29 - GROUP COMMENT REACTIONS
-- Compatible avec les commentaires des posts classiques
-- et des groupes
-- ============================================================

------------------------------------------------------------
-- Vérification
------------------------------------------------------------

DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'comment_reactions'
    ) THEN
        RAISE EXCEPTION 'Table comment_reactions introuvable.';
    END IF;

END $$;

------------------------------------------------------------
-- Index
------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment
ON public.comment_reactions(comment_id);

CREATE INDEX IF NOT EXISTS idx_comment_reactions_user
ON public.comment_reactions(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_comment_reaction
ON public.comment_reactions(comment_id,user_id);

------------------------------------------------------------
-- Fonction de permission
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.can_react_comment(
    p_comment UUID,
    p_user UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS
$$

SELECT EXISTS (

    SELECT 1

    FROM public.comments c

    JOIN public.posts p
        ON p.id = c.post_id

    LEFT JOIN public.group_members gm

        ON gm.group_id = p.group_id
       AND gm.user_id = p_user
       AND gm.status = 'accepted'

    WHERE c.id = p_comment

      AND (

            p.group_id IS NULL

            OR

            gm.id IS NOT NULL

      )

);

$$;

------------------------------------------------------------
-- SELECT
------------------------------------------------------------

DROP POLICY IF EXISTS "Read comment reactions"
ON public.comment_reactions;

CREATE POLICY "Read comment reactions"

ON public.comment_reactions

FOR SELECT

USING (

    public.can_react_comment(comment_id, auth.uid())

);

------------------------------------------------------------
-- INSERT
------------------------------------------------------------

DROP POLICY IF EXISTS "Insert comment reactions"
ON public.comment_reactions;

CREATE POLICY "Insert comment reactions"

ON public.comment_reactions

FOR INSERT

WITH CHECK (

    user_id = auth.uid()

    AND

    public.can_react_comment(comment_id, auth.uid())

);

------------------------------------------------------------
-- UPDATE
------------------------------------------------------------

DROP POLICY IF EXISTS "Update own comment reactions"
ON public.comment_reactions;

CREATE POLICY "Update own comment reactions"

ON public.comment_reactions

FOR UPDATE

USING (

    user_id = auth.uid()

);

------------------------------------------------------------
-- DELETE
------------------------------------------------------------

DROP POLICY IF EXISTS "Delete own comment reactions"
ON public.comment_reactions;

CREATE POLICY "Delete own comment reactions"

ON public.comment_reactions

FOR DELETE

USING (

    user_id = auth.uid()

);

------------------------------------------------------------
-- Trigger de comptage
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_comment_reaction_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS
$$
BEGIN

    IF TG_OP = 'INSERT' THEN

        UPDATE public.comments
        SET reaction_count = reaction_count + 1
        WHERE id = NEW.comment_id;

        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN

        UPDATE public.comments
        SET reaction_count = GREATEST(reaction_count - 1,0)
        WHERE id = OLD.comment_id;

        RETURN OLD;

    END IF;

    RETURN NULL;

END;
$$;

DROP TRIGGER IF EXISTS trg_comment_reaction_insert
ON public.comment_reactions;

DROP TRIGGER IF EXISTS trg_comment_reaction_delete
ON public.comment_reactions;

CREATE TRIGGER trg_comment_reaction_insert

AFTER INSERT

ON public.comment_reactions

FOR EACH ROW

EXECUTE FUNCTION public.update_comment_reaction_count();

CREATE TRIGGER trg_comment_reaction_delete

AFTER DELETE

ON public.comment_reactions

FOR EACH ROW

EXECUTE FUNCTION public.update_comment_reaction_count();

------------------------------------------------------------
-- Documentation
------------------------------------------------------------

COMMENT ON TABLE public.comment_reactions IS
'Réactions sur les commentaires des publications classiques et des groupes.';