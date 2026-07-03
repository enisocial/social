-- ============================================================
-- FILE 32 - GROUP EVENT PARTICIPANTS
-- ============================================================

------------------------------------------------------------
-- Table
------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.group_event_participants (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    event_id UUID NOT NULL
        REFERENCES public.group_events(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    status TEXT NOT NULL DEFAULT 'going'
        CHECK (
            status IN (
                'going',
                'interested',
                'not_going',
                'invited',
                'pending'
            )
        ),

    invited_by UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    approved_by UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    reminder_sent BOOLEAN NOT NULL DEFAULT FALSE,

    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT unique_event_participant
        UNIQUE(event_id, user_id)

);

------------------------------------------------------------
-- Index
------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_group_event_participants_event
ON public.group_event_participants(event_id);

CREATE INDEX IF NOT EXISTS idx_group_event_participants_user
ON public.group_event_participants(user_id);

CREATE INDEX IF NOT EXISTS idx_group_event_participants_status
ON public.group_event_participants(status);

------------------------------------------------------------
-- updated_at
------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_group_event_participants_updated_at
ON public.group_event_participants;

CREATE TRIGGER trg_group_event_participants_updated_at

BEFORE UPDATE

ON public.group_event_participants

FOR EACH ROW

EXECUTE FUNCTION public.update_updated_at_column();

------------------------------------------------------------
-- Fonction compteur
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_group_event_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS
$$
BEGIN

    UPDATE public.group_events
    SET updated_at = now()
    WHERE id = COALESCE(NEW.event_id, OLD.event_id);

    RETURN COALESCE(NEW, OLD);

END;
$$;

DROP TRIGGER IF EXISTS trg_group_event_counts_insert
ON public.group_event_participants;

DROP TRIGGER IF EXISTS trg_group_event_counts_update
ON public.group_event_participants;

DROP TRIGGER IF EXISTS trg_group_event_counts_delete
ON public.group_event_participants;

CREATE TRIGGER trg_group_event_counts_insert
AFTER INSERT
ON public.group_event_participants
FOR EACH ROW
EXECUTE FUNCTION public.update_group_event_counts();

CREATE TRIGGER trg_group_event_counts_update
AFTER UPDATE
ON public.group_event_participants
FOR EACH ROW
EXECUTE FUNCTION public.update_group_event_counts();

CREATE TRIGGER trg_group_event_counts_delete
AFTER DELETE
ON public.group_event_participants
FOR EACH ROW
EXECUTE FUNCTION public.update_group_event_counts();

------------------------------------------------------------
-- RLS
------------------------------------------------------------

ALTER TABLE public.group_event_participants
ENABLE ROW LEVEL SECURITY;

------------------------------------------------------------
-- Lecture
------------------------------------------------------------

CREATE POLICY "Members can view event participants"

ON public.group_event_participants

FOR SELECT

USING (

    EXISTS (

        SELECT 1
        FROM public.group_events ge
        JOIN public.group_members gm
            ON gm.group_id = ge.group_id

        WHERE ge.id = event_id
          AND gm.user_id = auth.uid()
          AND gm.status = 'accepted'

    )

);

------------------------------------------------------------
-- Participer
------------------------------------------------------------

CREATE POLICY "Users join events"

ON public.group_event_participants

FOR INSERT

WITH CHECK (

    auth.uid() = user_id

    AND

    EXISTS (

        SELECT 1
        FROM public.group_events ge
        JOIN public.group_members gm
            ON gm.group_id = ge.group_id

        WHERE ge.id = event_id
          AND gm.user_id = auth.uid()
          AND gm.status = 'accepted'

    )

);

------------------------------------------------------------
-- Modifier son statut
------------------------------------------------------------

CREATE POLICY "Users update own participation"

ON public.group_event_participants

FOR UPDATE

USING (

    auth.uid() = user_id

);

------------------------------------------------------------
-- Quitter un événement
------------------------------------------------------------

CREATE POLICY "Users leave events"

ON public.group_event_participants

FOR DELETE

USING (

    auth.uid() = user_id

);

------------------------------------------------------------
-- Documentation
------------------------------------------------------------

COMMENT ON TABLE public.group_event_participants IS
'Participants aux événements de groupes (Going, Interested, Invited, etc.).';