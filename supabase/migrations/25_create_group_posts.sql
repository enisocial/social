-- ============================================================
-- FILE 25 - GROUP POSTS
-- ============================================================

ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS group_id UUID;

ALTER TABLE public.posts
ADD CONSTRAINT fk_posts_group
FOREIGN KEY (group_id)
REFERENCES public.groups(id)
ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_posts_group
ON public.posts(group_id);

CREATE INDEX IF NOT EXISTS idx_posts_group_created
ON public.posts(group_id, created_at DESC);

COMMENT ON COLUMN public.posts.group_id IS
'NULL = publication classique, valeur = publication appartenant à un groupe.';

------------------------------------------------------------
-- Vérification de membre
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_group_member(
    p_group UUID,
    p_user UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
SELECT EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = p_group
      AND gm.user_id = p_user
      AND gm.status = 'accepted'
);
$$;

------------------------------------------------------------
-- RLS
------------------------------------------------------------

DROP POLICY IF EXISTS "Group members can read group posts"
ON public.posts;

CREATE POLICY "Group members can read group posts"
ON public.posts
FOR SELECT
USING (

    group_id IS NULL

    OR

    public.is_group_member(group_id, auth.uid())

);

DROP POLICY IF EXISTS "Group members can create group posts"
ON public.posts;

CREATE POLICY "Group members can create group posts"
ON public.posts
FOR INSERT
WITH CHECK (

    (
        group_id IS NULL
    )

    OR

    public.is_group_member(group_id, auth.uid())

);

DROP POLICY IF EXISTS "Users update own group posts"
ON public.posts;

CREATE POLICY "Users update own group posts"
ON public.posts
FOR UPDATE
USING (

    user_id = auth.uid()

);

DROP POLICY IF EXISTS "Users delete own group posts"
ON public.posts;

CREATE POLICY "Users delete own group posts"
ON public.posts
FOR DELETE
USING (

    user_id = auth.uid()

);