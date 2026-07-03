-- ============================================
-- STORY REPLIES
-- ============================================

CREATE TABLE IF NOT EXISTS public.story_replies (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    story_id UUID NOT NULL
        REFERENCES public.stories(id)
        ON DELETE CASCADE,

    sender_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    recipient_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    message TEXT NOT NULL,

    is_read BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT story_reply_not_empty
        CHECK (length(trim(message)) > 0)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_story_replies_story
ON public.story_replies(story_id);

CREATE INDEX IF NOT EXISTS idx_story_replies_sender
ON public.story_replies(sender_id);

CREATE INDEX IF NOT EXISTS idx_story_replies_recipient
ON public.story_replies(recipient_id);

CREATE INDEX IF NOT EXISTS idx_story_replies_created
ON public.story_replies(created_at DESC);

-- ============================================
-- FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.update_story_replies_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

    IF TG_OP = 'INSERT' THEN

        UPDATE public.stories
        SET replies_count = replies_count + 1
        WHERE id = NEW.story_id;

        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN

        UPDATE public.stories
        SET replies_count = GREATEST(replies_count - 1, 0)
        WHERE id = OLD.story_id;

        RETURN OLD;

    END IF;

    RETURN NULL;

END;
$$;

-- ============================================
-- TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS trg_story_reply_insert
ON public.story_replies;

CREATE TRIGGER trg_story_reply_insert
AFTER INSERT
ON public.story_replies
FOR EACH ROW
EXECUTE FUNCTION public.update_story_replies_count();


DROP TRIGGER IF EXISTS trg_story_reply_delete
ON public.story_replies;

CREATE TRIGGER trg_story_reply_delete
AFTER DELETE
ON public.story_replies
FOR EACH ROW
EXECUTE FUNCTION public.update_story_replies_count();