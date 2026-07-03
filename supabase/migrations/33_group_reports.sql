-- ============================================================
-- FILE 33 - GROUP REPORTS
-- Modération des groupes
-- ============================================================

------------------------------------------------------------
-- Table des signalements
------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.group_reports (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    group_id UUID NOT NULL
        REFERENCES public.groups(id)
        ON DELETE CASCADE,

    reporter_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    reviewed_by UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    report_type TEXT NOT NULL
        CHECK (
            report_type IN (
                'post',
                'comment',
                'member',
                'event'
            )
        ),

    target_id UUID NOT NULL,

    reason TEXT NOT NULL
        CHECK (
            reason IN (
                'spam',
                'harassment',
                'hate_speech',
                'violence',
                'nudity',
                'false_information',
                'copyright',
                'other'
            )
        ),

    description TEXT,

    status TEXT NOT NULL DEFAULT 'open'
        CHECK (
            status IN (
                'open',
                'reviewing',
                'resolved',
                'dismissed'
            )
        ),

    moderator_note TEXT,

    reviewed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()

);

------------------------------------------------------------
-- Index
------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_group_reports_group
ON public.group_reports(group_id);

CREATE INDEX IF NOT EXISTS idx_group_reports_reporter
ON public.group_reports(reporter_id);

CREATE INDEX IF NOT EXISTS idx_group_reports_target
ON public.group_reports(target_id);

CREATE INDEX IF NOT EXISTS idx_group_reports_status
ON public.group_reports(status);

CREATE INDEX IF NOT EXISTS idx_group_reports_type
ON public.group_reports(report_type);

------------------------------------------------------------
-- Trigger updated_at
------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_group_reports_updated_at
ON public.group_reports;

CREATE TRIGGER trg_group_reports_updated_at

BEFORE UPDATE

ON public.group_reports

FOR EACH ROW

EXECUTE FUNCTION public.update_updated_at_column();

------------------------------------------------------------
-- RLS
------------------------------------------------------------

ALTER TABLE public.group_reports
ENABLE ROW LEVEL SECURITY;

------------------------------------------------------------
-- Lecture
------------------------------------------------------------

CREATE POLICY "Moderators can read reports"

ON public.group_reports

FOR SELECT

USING (

    reporter_id = auth.uid()

    OR

    EXISTS (

        SELECT 1

        FROM public.group_members gm

        WHERE gm.group_id = group_reports.group_id
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

CREATE POLICY "Members create reports"

ON public.group_reports

FOR INSERT

WITH CHECK (

    reporter_id = auth.uid()

    AND

    EXISTS (

        SELECT 1

        FROM public.group_members gm

        WHERE gm.group_id = group_reports.group_id
          AND gm.user_id = auth.uid()
          AND gm.status = 'accepted'

    )

);

------------------------------------------------------------
-- Traitement
------------------------------------------------------------

CREATE POLICY "Moderators update reports"

ON public.group_reports

FOR UPDATE

USING (

    EXISTS (

        SELECT 1

        FROM public.group_members gm

        WHERE gm.group_id = group_reports.group_id
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

CREATE POLICY "Owners delete reports"

ON public.group_reports

FOR DELETE

USING (

    EXISTS (

        SELECT 1

        FROM public.group_members gm

        WHERE gm.group_id = group_reports.group_id
          AND gm.user_id = auth.uid()
          AND gm.role IN (
                'owner',
                'admin'
          )

    )

);

------------------------------------------------------------
-- Fonction de statistiques
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.group_open_reports(
    p_group UUID
)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS
$$

SELECT COUNT(*)

FROM public.group_reports

WHERE group_id = p_group
AND status IN ('open','reviewing');

$$;

------------------------------------------------------------
-- Documentation
------------------------------------------------------------

COMMENT ON TABLE public.group_reports IS
'Signalements des contenus, membres et événements des groupes.';