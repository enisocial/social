-- ============================================================
-- FILE 27 - GROUP POST REACTIONS
-- Compatible avec les posts classiques et les posts de groupes
-- ============================================================

------------------------------------------------------------
-- Vérification des tables
------------------------------------------------------------

DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema='public'
        AND table_name='post_reactions'
    ) THEN
        RAISE EXCEPTION 'Table post_reactions introuvable.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema='public'
        AND table_name='posts'
    ) THEN
        RAISE EXCEPTION 'Table posts introuvable.';
    END IF;

END $$;

------------------------------------------------------------
-- Index
------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_post_reactions_post
ON public.post_reactions(post_id);

CREATE INDEX IF NOT EXISTS idx_post_reactions_user
ON public.post_reactions(user_id);

CREATE INDEX IF NOT EXISTS idx_post_reactions_post_user
ON public.post_reactions(post_id,user_id);

------------------------------------------------------------
-- Fonction
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.can_react_to_post(
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
       AND gm.status='accepted'

    WHERE p.id = p_post
      AND (
            p.group_id IS NULL
            OR gm.id IS NOT NULL
      )

);

$$;

------------------------------------------------------------
-- Lecture
------------------------------------------------------------

DROP POLICY IF EXISTS "Read reactions" ON public.post_reactions;

CREATE POLICY "Read reactions"

ON public.post_reactions

FOR SELECT

USING (

    public.can_react_to_post(post_id,auth.uid())

);

------------------------------------------------------------
-- Ajout
------------------------------------------------------------

DROP POLICY IF EXISTS "Insert reactions" ON public.post_reactions;

CREATE POLICY "Insert reactions"

ON public.post_reactions

FOR INSERT

WITH CHECK (

    user_id = auth.uid()

    AND

    public.can_react_to_post(post_id,auth.uid())

);

------------------------------------------------------------
-- Modification
------------------------------------------------------------

DROP POLICY IF EXISTS "Update own reactions" ON public.post_reactions;

CREATE POLICY "Update own reactions"

ON public.post_reactions

FOR UPDATE

USING (

    user_id = auth.uid()

);

------------------------------------------------------------
-- Suppression
------------------------------------------------------------

DROP POLICY IF EXISTS "Delete own reactions" ON public.post_reactions;

CREATE POLICY "Delete own reactions"

ON public.post_reactions

FOR DELETE

USING (

    user_id = auth.uid()

);

------------------------------------------------------------
-- Empêcher plusieurs réactions du même utilisateur
------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_post_reaction

ON public.post_reactions(post_id,user_id);

------------------------------------------------------------
-- Documentation
------------------------------------------------------------

COMMENT ON TABLE public.post_reactions IS
'Réactions des publications classiques et des publications de groupes.';