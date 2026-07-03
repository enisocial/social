-- =====================================================
-- 12_create_messages.sql
-- Messages Messenger
-- =====================================================

CREATE TABLE public.messages (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    conversation_id UUID NOT NULL
        REFERENCES public.conversations(id)
        ON DELETE CASCADE,

    sender_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    reply_to UUID
        REFERENCES public.messages(id)
        ON DELETE SET NULL,

    message_type TEXT NOT NULL DEFAULT 'text'
        CHECK (
            message_type IN (
                'text',
                'image',
                'video',
                'audio',
                'file',
                'system'
            )
        ),

    content TEXT,

    edited BOOLEAN NOT NULL DEFAULT FALSE,

    deleted BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CHECK (
        content IS NOT NULL
        OR message_type <> 'text'
    )
);

-- =====================================================
-- Pièces jointes
-- =====================================================

CREATE TABLE public.message_media (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    message_id UUID NOT NULL
        REFERENCES public.messages(id)
        ON DELETE CASCADE,

    storage_path TEXT NOT NULL,

    media_type TEXT NOT NULL
        CHECK (
            media_type IN (
                'image',
                'video',
                'audio',
                'file'
            )
        ),

    file_name TEXT,

    mime_type TEXT,

    file_size BIGINT,

    width INTEGER,

    height INTEGER,

    duration INTEGER,

    created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- Messages lus
-- =====================================================

CREATE TABLE public.message_reads (

    message_id UUID NOT NULL
        REFERENCES public.messages(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    read_at TIMESTAMPTZ DEFAULT now(),

    PRIMARY KEY(message_id, user_id)
);

-- =====================================================
-- Trigger updated_at
-- =====================================================

CREATE TRIGGER update_messages_updated_at
BEFORE UPDATE
ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- Index
-- =====================================================

CREATE INDEX idx_messages_conversation
ON public.messages(conversation_id);

CREATE INDEX idx_messages_sender
ON public.messages(sender_id);

CREATE INDEX idx_messages_created
ON public.messages(created_at DESC);

CREATE INDEX idx_message_reads_user
ON public.message_reads(user_id);

CREATE INDEX idx_message_media_message
ON public.message_media(message_id);

-- =====================================================
-- RLS
-- =====================================================

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------
-- Lecture des messages
---------------------------------------------------------

CREATE POLICY "Participants can read messages"
ON public.messages
FOR SELECT
USING (

    EXISTS (

        SELECT 1

        FROM public.conversation_participants cp

        WHERE cp.conversation_id = conversation_id
        AND cp.user_id = auth.uid()

    )

);

---------------------------------------------------------
-- Envoyer un message
---------------------------------------------------------

CREATE POLICY "Participants can send messages"
ON public.messages
FOR INSERT
WITH CHECK (

    auth.uid() = sender_id

    AND

    EXISTS (

        SELECT 1

        FROM public.conversation_participants cp

        WHERE cp.conversation_id = conversation_id
        AND cp.user_id = auth.uid()

    )

);

---------------------------------------------------------
-- Modifier son message
---------------------------------------------------------

CREATE POLICY "Users update own messages"
ON public.messages
FOR UPDATE
USING (
    auth.uid() = sender_id
);

---------------------------------------------------------
-- Supprimer son message
---------------------------------------------------------

CREATE POLICY "Users delete own messages"
ON public.messages
FOR DELETE
USING (
    auth.uid() = sender_id
);

---------------------------------------------------------
-- Médias
---------------------------------------------------------

CREATE POLICY "Participants view media"
ON public.message_media
FOR SELECT
USING (

    EXISTS (

        SELECT 1

        FROM public.messages m
        JOIN public.conversation_participants cp
            ON cp.conversation_id = m.conversation_id

        WHERE m.id = message_id
        AND cp.user_id = auth.uid()

    )

);

CREATE POLICY "Users upload media"
ON public.message_media
FOR INSERT
WITH CHECK (true);

---------------------------------------------------------
-- Lecture des messages
---------------------------------------------------------

CREATE POLICY "Users mark messages as read"
ON public.message_reads
FOR INSERT
WITH CHECK (
    auth.uid() = user_id
);

CREATE POLICY "Users view read receipts"
ON public.message_reads
FOR SELECT
USING (
    auth.uid() = user_id
);