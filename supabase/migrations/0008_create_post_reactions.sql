-- =====================================================
-- 08_create_post_reactions.sql
-- Réactions Facebook
-- =====================================================

CREATE TABLE public.post_reactions (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    post_id UUID NOT NULL
        REFERENCES public.posts(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    reaction_type TEXT NOT NULL
        CHECK (
            reaction_type IN (
                'like',
                'love',
                'care',
                'haha',
                'wow',
                'sad',
                'angry'
            )
        ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT unique_post_reaction
        UNIQUE(post_id, user_id)
);

-- =====================================================
-- Index
-- =====================================================

CREATE INDEX idx_post_reactions_post
ON public.post_reactions(post_id);

CREATE INDEX idx_post_reactions_user
ON public.post_reactions(user_id);

CREATE INDEX idx_post_reactions_type
ON public.post_reactions(reaction_type);

-- =====================================================
-- RLS
-- =====================================================

ALTER TABLE public.post_reactions
ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------
-- Lecture
---------------------------------------------------------

CREATE POLICY "Users can view reactions"
ON public.post_reactions
FOR SELECT
USING (true);

---------------------------------------------------------
-- Ajouter une réaction
---------------------------------------------------------

CREATE POLICY "Users can react"
ON public.post_reactions
FOR INSERT
WITH CHECK (
    auth.uid() = user_id
);

---------------------------------------------------------
-- Modifier sa réaction
---------------------------------------------------------

CREATE POLICY "Users can update own reaction"
ON public.post_reactions
FOR UPDATE
USING (
    auth.uid() = user_id
);

---------------------------------------------------------
-- Supprimer sa réaction
---------------------------------------------------------

CREATE POLICY "Users can delete own reaction"
ON public.post_reactions
FOR DELETE
USING (
    auth.uid() = user_id
);

-- =====================================================
-- Fonction de mise à jour du compteur
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_post_reaction_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

    IF TG_OP = 'INSERT' THEN

        UPDATE public.posts
        SET likes_count = (
            SELECT COUNT(*)
            FROM public.post_reactions
            WHERE post_id = NEW.post_id
        )
        WHERE id = NEW.post_id;

        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN

        UPDATE public.posts
        SET likes_count = (
            SELECT COUNT(*)
            FROM public.post_reactions
            WHERE post_id = OLD.post_id
        )
        WHERE id = OLD.post_id;

        RETURN OLD;

    ELSIF TG_OP = 'UPDATE' THEN

        UPDATE public.posts
        SET likes_count = (
            SELECT COUNT(*)
            FROM public.post_reactions
            WHERE post_id = NEW.post_id
        )
        WHERE id = NEW.post_id;

        RETURN NEW;

    END IF;

    RETURN NULL;

END;
$$;

-- =====================================================
-- Trigger
-- =====================================================

CREATE TRIGGER trg_post_reaction_count
AFTER INSERT OR UPDATE OR DELETE
ON public.post_reactions
FOR EACH ROW
EXECUTE FUNCTION public.update_post_reaction_count();