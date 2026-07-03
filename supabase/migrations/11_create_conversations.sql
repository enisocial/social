-- =====================================================
-- 11_create_conversations.sql
-- Conversations privées
-- =====================================================

CREATE TABLE public.conversations (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    is_group BOOLEAN NOT NULL DEFAULT FALSE,

    title TEXT,

    photo_url TEXT,

    created_by UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    last_message_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- Participants
-- =====================================================

CREATE TABLE public.conversation_participants (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    conversation_id UUID NOT NULL
        REFERENCES public.conversations(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    role TEXT NOT NULL DEFAULT 'member'
        CHECK (
            role IN (
                'owner',
                'admin',
                'member'
            )
        ),

    last_read_message UUID,

    muted BOOLEAN NOT NULL DEFAULT FALSE,

    archived BOOLEAN NOT NULL DEFAULT FALSE,

    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE(conversation_id, user_id)
);

-- =====================================================
-- Trigger updated_at
-- =====================================================

CREATE TRIGGER update_conversations_updated_at
BEFORE UPDATE
ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- Index
-- =====================================================

CREATE INDEX idx_conversations_last_message
ON public.conversations(last_message_at DESC);

CREATE INDEX idx_participants_user
ON public.conversation_participants(user_id);

CREATE INDEX idx_participants_conversation
ON public.conversation_participants(conversation_id);

-- =====================================================
-- RLS
-- =====================================================

ALTER TABLE public.conversations
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.conversation_participants
ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------
-- Conversations
---------------------------------------------------------

CREATE POLICY "Users can view own conversations"
ON public.conversations
FOR SELECT
USING (

    EXISTS (

        SELECT 1

        FROM public.conversation_participants cp

        WHERE cp.conversation_id = id
        AND cp.user_id = auth.uid()

    )

);

CREATE POLICY "Users can create conversations"
ON public.conversations
FOR INSERT
WITH CHECK (
    auth.uid() = created_by
);

CREATE POLICY "Conversation creator can update"
ON public.conversations
FOR UPDATE
USING (
    auth.uid() = created_by
);

---------------------------------------------------------
-- Participants
---------------------------------------------------------

CREATE POLICY "Users can view participants"
ON public.conversation_participants
FOR SELECT
USING (

    EXISTS (

        SELECT 1

        FROM public.conversation_participants cp

        WHERE cp.conversation_id = conversation_id
        AND cp.user_id = auth.uid()

    )

);

CREATE POLICY "Users can join conversations"
ON public.conversation_participants
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update own participant"
ON public.conversation_participants
FOR UPDATE
USING (
    auth.uid() = user_id
);

CREATE POLICY "Users can leave conversation"
ON public.conversation_participants
FOR DELETE
USING (
    auth.uid() = user_id
);