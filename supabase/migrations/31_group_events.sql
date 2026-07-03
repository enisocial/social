-- ============================================================
-- FILE 31 - GROUP EVENTS
-- ============================================================

------------------------------------------------------------
-- Table des événements de groupes
------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.group_events (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    group_id UUID NOT NULL
        REFERENCES public.groups(id)
        ON DELETE CASCADE,

    created_by UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    title VARCHAR(200) NOT NULL,

    description TEXT,

    cover_url TEXT,

    location_name TEXT,

    latitude DOUBLE PRECISION,

    longitude DOUBLE PRECISION,

    start_at TIMESTAMPTZ NOT NULL,

    end_at TIMESTAMPTZ,

    timezone TEXT DEFAULT 'UTC',

    visibility TEXT NOT NULL DEFAULT 'group'
        CHECK (
            visibility IN (
                'group',
                'public'
            )
        ),

    allow_guests BOOLEAN NOT NULL DEFAULT FALSE,

    require_approval BOOLEAN NOT NULL DEFAULT FALSE,

    max_participants INTEGER,

    is_cancelled BOOLEAN NOT NULL DEFAULT FALSE,

    cancelled_at TIMESTAMPTZ,

    cancelled_reason TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_event_dates
    CHECK (
        end_at IS NULL
        OR
        end_at >= start_at
    )

);

------------------------------------------------------------
-- Index
------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_group_events_group
ON public.group_events(group_id);

CREATE INDEX IF NOT EXISTS idx_group_events_creator
ON public.group_events(created_by);

CREATE INDEX IF NOT EXISTS idx_group_events_start
ON public.group_events(start_at);

CREATE INDEX IF NOT EXISTS idx_group_events_visibility
ON public.group_events(visibility);

------------------------------------------------------------
-- updated_at
------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_group_events_updated_at
ON public.group_events;

CREATE TRIGGER trg_group_events_updated_at

BEFORE UPDATE

ON public.group_events

FOR EACH ROW

EXECUTE FUNCTION public.update_updated_at_column();

------------------------------------------------------------
-- RLS
------------------------------------------------------------

ALTER TABLE public.group_events
ENABLE ROW LEVEL SECURITY;

------------------------------------------------------------
-- Lecture
------------------------------------------------------------

CREATE POLICY "Members can read group events"

ON public.group_events

FOR SELECT

USING (

    visibility = 'public'

    OR

    EXISTS (

        SELECT 1

        FROM public.group_members gm

        WHERE gm.group_id = group_events.group_id
          AND gm.user_id = auth.uid()
          AND gm.status = 'accepted'

    )

);

------------------------------------------------------------
-- Création
------------------------------------------------------------

CREATE POLICY "Admins create group events"

ON public.group_events

FOR INSERT

WITH CHECK (

    auth.uid() = created_by

    AND

    EXISTS (

        SELECT 1

        FROM public.group_members gm

        WHERE gm.group_id = group_events.group_id
          AND gm.user_id = auth.uid()
          AND gm.role IN (
                'owner',
                'admin',
                'moderator'
          )

    )

);

------------------------------------------------------------
-- Modification
------------------------------------------------------------

CREATE POLICY "Admins update group events"

ON public.group_events

FOR UPDATE

USING (

    EXISTS (

        SELECT 1

        FROM public.group_members gm

        WHERE gm.group_id = group_events.group_id
          AND gm.user_id = auth.uid()
          AND gm.role IN (
                'owner',
                'admin',
                'moderator'
          )

    )

);

------------------------------------------------------------
-- Suppression
------------------------------------------------------------

CREATE POLICY "Owners delete group events"

ON public.group_events

FOR DELETE

USING (

    EXISTS (

        SELECT 1

        FROM public.group_members gm

        WHERE gm.group_id = group_events.group_id
          AND gm.user_id = auth.uid()
          AND gm.role IN (
                'owner',
                'admin'
          )

    )

);

------------------------------------------------------------
-- Documentation
------------------------------------------------------------

COMMENT ON TABLE public.group_events IS
'Événements organisés dans les groupes.';