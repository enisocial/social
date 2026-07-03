-- =====================================================
-- 05_create_friendships.sql
-- Système d'amis
-- =====================================================

CREATE TABLE public.friendships (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    requester_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    addressee_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (
            status IN (
                'pending',
                'accepted',
                'rejected',
                'blocked'
            )
        ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT friendship_unique
        UNIQUE(requester_id, addressee_id),

    CONSTRAINT friendship_no_self
        CHECK (requester_id <> addressee_id)
);

-- =====================================================
-- Index
-- =====================================================

CREATE INDEX idx_friendships_requester
ON public.friendships(requester_id);

CREATE INDEX idx_friendships_addressee
ON public.friendships(addressee_id);

CREATE INDEX idx_friendships_status
ON public.friendships(status);

-- =====================================================
-- Trigger updated_at
-- =====================================================

CREATE TRIGGER update_friendships_updated_at
BEFORE UPDATE
ON public.friendships
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- RLS
-- =====================================================

ALTER TABLE public.friendships
ENABLE ROW LEVEL SECURITY;

-- Voir uniquement ses relations

CREATE POLICY "Users can view own friendships"
ON public.friendships
FOR SELECT
USING (
    auth.uid() = requester_id
    OR
    auth.uid() = addressee_id
);

-- Envoyer une demande

CREATE POLICY "Users can send friend request"
ON public.friendships
FOR INSERT
WITH CHECK (
    auth.uid() = requester_id
);

-- Modifier uniquement les demandes qui le concernent

CREATE POLICY "Users can update friendship"
ON public.friendships
FOR UPDATE
USING (
    auth.uid() = requester_id
    OR
    auth.uid() = addressee_id
);

-- Supprimer une relation

CREATE POLICY "Users can delete friendship"
ON public.friendships
FOR DELETE
USING (
    auth.uid() = requester_id
    OR
    auth.uid() = addressee_id
);