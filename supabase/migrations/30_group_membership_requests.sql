-- ============================================================
-- FILE 30 - GROUP MEMBERSHIP REQUESTS
-- Invitations et demandes d'adhésion aux groupes
-- ============================================================

------------------------------------------------------------
-- Table
------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.group_membership_requests (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    group_id UUID NOT NULL
        REFERENCES public.groups(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    invited_by UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    request_type TEXT NOT NULL
        CHECK (
            request_type IN (
                'join_request',
                'invitation'
            )
        ),

    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (
            status IN (
                'pending',
                'accepted',
                'declined',
                'cancelled'
            )
        ),

    message TEXT,

    responded_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT unique_group_request
    UNIQUE (
        group_id,
        user_id,
        request_type
    )

);

------------------------------------------------------------
-- Index
------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_group_requests_group

ON public.group_membership_requests(group_id);

CREATE INDEX IF NOT EXISTS idx_group_requests_user

ON public.group_membership_requests(user_id);

CREATE INDEX IF NOT EXISTS idx_group_requests_status

ON public.group_membership_requests(status);

------------------------------------------------------------
-- Trigger updated_at
------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_group_requests_updated_at
ON public.group_membership_requests;

CREATE TRIGGER trg_group_requests_updated_at

BEFORE UPDATE

ON public.group_membership_requests

FOR EACH ROW

EXECUTE FUNCTION public.update_updated_at_column();

------------------------------------------------------------
-- RLS
------------------------------------------------------------

ALTER TABLE public.group_membership_requests
ENABLE ROW LEVEL SECURITY;

------------------------------------------------------------
-- Lecture
------------------------------------------------------------

CREATE POLICY "Users can view their requests"

ON public.group_membership_requests

FOR SELECT

USING (

    auth.uid() = user_id

    OR

    EXISTS (

        SELECT 1

        FROM public.group_members gm

        WHERE gm.group_id = group_membership_requests.group_id
          AND gm.user_id = auth.uid()
          AND gm.role IN (
                'owner',
                'admin',
                'moderator'
          )

    )

);

------------------------------------------------------------
-- Création
------------------------------------------------------------

CREATE POLICY "Users can create requests"

ON public.group_membership_requests

FOR INSERT

WITH CHECK (

    auth.uid() = user_id

);

------------------------------------------------------------
-- Mise à jour
------------------------------------------------------------

CREATE POLICY "Admins manage requests"

ON public.group_membership_requests

FOR UPDATE

USING (

    EXISTS (

        SELECT 1

        FROM public.group_members gm

        WHERE gm.group_id = group_membership_requests.group_id
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

CREATE POLICY "Users delete own pending requests"

ON public.group_membership_requests

FOR DELETE

USING (

    auth.uid() = user_id

    AND status = 'pending'

);

------------------------------------------------------------
-- Documentation
------------------------------------------------------------

COMMENT ON TABLE public.group_membership_requests IS
'Demandes d’adhésion et invitations aux groupes.';