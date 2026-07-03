-- ============================================================
-- FILE 26 - GROUP POST MEDIA
-- Utilise la table post_media existante
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
        AND table_name='post_media'
    ) THEN

        RAISE EXCEPTION 'Table post_media introuvable. Exécuter la migration 07_create_post_media.sql avant celle-ci.';

    END IF;

END $$;

------------------------------------------------------------
-- Index pour les performances des posts de groupes
------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_post_media_post
ON public.post_media(post_id);

------------------------------------------------------------
-- Fonction utilitaire
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.post_belongs_to_group(
    p_post UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
SELECT EXISTS (
    SELECT 1
    FROM public.posts
    WHERE id = p_post
      AND group_id IS NOT NULL
);
$$;

------------------------------------------------------------
-- Politique RLS
------------------------------------------------------------

DROP POLICY IF EXISTS "Group members can view group media"
ON public.post_media;

CREATE POLICY "Group members can view group media"
ON public.post_media
FOR SELECT
USING (

    NOT public.post_belongs_to_group(post_id)

    OR

    EXISTS (
        SELECT 1
        FROM public.posts p
        JOIN public.group_members gm
          ON gm.group_id = p.group_id
        WHERE p.id = post_media.post_id
          AND gm.user_id = auth.uid()
          AND gm.status = 'accepted'
    )

);

------------------------------------------------------------
-- Insertion
------------------------------------------------------------

DROP POLICY IF EXISTS "Users upload media to own posts"
ON public.post_media;

CREATE POLICY "Users upload media to own posts"
ON public.post_media
FOR INSERT
WITH CHECK (

    EXISTS (
        SELECT 1
        FROM public.posts p
        WHERE p.id = post_media.post_id
          AND p.user_id = auth.uid()
    )

);

------------------------------------------------------------
-- Modification
------------------------------------------------------------

DROP POLICY IF EXISTS "Users update own media"
ON public.post_media;

CREATE POLICY "Users update own media"
ON public.post_media
FOR UPDATE
USING (

    EXISTS (
        SELECT 1
        FROM public.posts p
        WHERE p.id = post_media.post_id
          AND p.user_id = auth.uid()
    )

);

------------------------------------------------------------
-- Suppression
------------------------------------------------------------

DROP POLICY IF EXISTS "Users delete own media"
ON public.post_media;

CREATE POLICY "Users delete own media"
ON public.post_media
FOR DELETE
USING (

    EXISTS (
        SELECT 1
        FROM public.posts p
        WHERE p.id = post_media.post_id
          AND p.user_id = auth.uid()
    )

);

------------------------------------------------------------
-- Documentation
------------------------------------------------------------

COMMENT ON TABLE public.post_media IS
'Médias des publications classiques et des publications de groupes.';