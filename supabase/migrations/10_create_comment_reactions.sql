-- =====================================================
-- 10_create_comment_reactions.sql
-- Réactions sur les commentaires
-- =====================================================

CREATE TABLE public.comment_reactions (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    comment_id UUID NOT NULL
        REFERENCES public.comments(id)
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

    CONSTRAINT unique_comment_reaction
        UNIQUE(comment_id, user_id)
);

-- =====================================================
-- Index
-- =====================================================

CREATE INDEX idx_comment_reactions_comment
ON public.comment_reactions(comment_id);

CREATE INDEX idx_comment_reactions_user
ON public.comment_reactions(user_id);

CREATE INDEX idx_comment_reactions_type
ON public.comment_reactions(reaction_type);

-- =====================================================
-- RLS
-- =====================================================

ALTER TABLE public.comment_reactions
ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------
-- Lecture
---------------------------------------------------------

CREATE POLICY "Users can view comment reactions"
ON public.comment_reactions
FOR SELECT
USING (true);

---------------------------------------------------------
-- Création
---------------------------------------------------------

CREATE POLICY "Users can react to comments"
ON public.comment_reactions
FOR INSERT
WITH CHECK (
    auth.uid() = user_id
);

---------------------------------------------------------
-- Modification
---------------------------------------------------------

CREATE POLICY "Users can update own comment reaction"
ON public.comment_reactions
FOR UPDATE
USING (
    auth.uid() = user_id
);

---------------------------------------------------------
-- Suppression
---------------------------------------------------------

CREATE POLICY "Users can delete own comment reaction"
ON public.comment_reactions
FOR DELETE
USING (
    auth.uid() = user_id
);

-- =====================================================
-- Fonction de mise à jour du compteur
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_comment_reaction_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

    IF TG_OP = 'INSERT' THEN

        UPDATE public.comments
        SET likes_count = (
            SELECT COUNT(*)
            FROM public.comment_reactions
            WHERE comment_id = NEW.comment_id
        )
        WHERE id = NEW.comment_id;

        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN

        UPDATE public.comments
        SET likes_count = (
            SELECT COUNT(*)
            FROM public.comment_reactions
            WHERE comment_id = OLD.comment_id
        )
        WHERE id = OLD.comment_id;

        RETURN OLD;

    ELSIF TG_OP = 'UPDATE' THEN

        UPDATE public.comments
        SET likes_count = (
            SELECT COUNT(*)
            FROM public.comment_reactions
            WHERE comment_id = NEW.comment_id
        )
        WHERE id = NEW.comment_id;

        RETURN NEW;

    END IF;

    RETURN NULL;

END;
$$;

-- =====================================================
-- Trigger
-- =====================================================

CREATE TRIGGER trg_comment_reaction_count
AFTER INSERT OR UPDATE OR DELETE
ON public.comment_reactions
FOR EACH ROW
EXECUTE FUNCTION public.update_comment_reaction_count();