-- ============================================================
-- FILE 34 - GROUP SETTINGS
-- Configuration avancée des groupes
-- ============================================================

------------------------------------------------------------
-- Table
------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.group_settings (

    group_id UUID PRIMARY KEY
        REFERENCES public.groups(id)
        ON DELETE CASCADE,

    --------------------------------------------------------
    -- Confidentialité
    --------------------------------------------------------

    privacy TEXT NOT NULL DEFAULT 'public'
        CHECK (
            privacy IN (
                'public',
                'private',
                'hidden'
            )
        ),

    discoverable BOOLEAN NOT NULL DEFAULT TRUE,

    --------------------------------------------------------
    -- Publications
    --------------------------------------------------------

    who_can_post TEXT NOT NULL DEFAULT 'members'
        CHECK (
            who_can_post IN (
                'admins',
                'moderators',
                'members'
            )
        ),

    post_approval_required BOOLEAN NOT NULL DEFAULT FALSE,

    allow_anonymous_posts BOOLEAN NOT NULL DEFAULT FALSE,

    --------------------------------------------------------
    -- Commentaires
    --------------------------------------------------------

    who_can_comment TEXT NOT NULL DEFAULT 'members'
        CHECK (
            who_can_comment IN (
                'admins',
                'moderators',
                'members'
            )
        ),

    --------------------------------------------------------
    -- Membres
    --------------------------------------------------------

    membership_approval BOOLEAN NOT NULL DEFAULT TRUE,

    allow_member_invites BOOLEAN NOT NULL DEFAULT TRUE,

    allow_external_sharing BOOLEAN NOT NULL DEFAULT FALSE,

    --------------------------------------------------------
    -- Médias
    --------------------------------------------------------

    allow_photos BOOLEAN NOT NULL DEFAULT TRUE,

    allow_videos BOOLEAN NOT NULL DEFAULT TRUE,

    allow_documents BOOLEAN NOT NULL DEFAULT TRUE,

    max_upload_size_mb INTEGER NOT NULL DEFAULT 100,

    --------------------------------------------------------
    -- Fonctionnalités
    --------------------------------------------------------

    allow_events BOOLEAN NOT NULL DEFAULT TRUE,

    allow_polls BOOLEAN NOT NULL DEFAULT TRUE,

    allow_live_streams BOOLEAN NOT NULL DEFAULT TRUE,

    allow_chat BOOLEAN NOT NULL DEFAULT TRUE,

    --------------------------------------------------------
    -- Anti-spam
    --------------------------------------------------------

    enable_profanity_filter BOOLEAN NOT NULL DEFAULT TRUE,

    enable_link_filter BOOLEAN NOT NULL DEFAULT FALSE,

    enable_duplicate_post_detection BOOLEAN NOT NULL DEFAULT TRUE,

    slow_mode_seconds INTEGER NOT NULL DEFAULT 0,

    banned_keywords TEXT[] DEFAULT ARRAY[]::TEXT[],

    --------------------------------------------------------
    -- Divers
    --------------------------------------------------------

    welcome_message TEXT,

    rules TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()

);

------------------------------------------------------------
-- Index
------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_group_settings_privacy
ON public.group_settings(privacy);

------------------------------------------------------------
-- Trigger updated_at
------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_group_settings_updated_at
ON public.group_settings;

CREATE TRIGGER trg_group_settings_updated_at

BEFORE UPDATE

ON public.group_settings

FOR EACH ROW

EXECUTE FUNCTION public.update_updated_at_column();

------------------------------------------------------------
-- Création automatique des paramètres
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_default_group_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
AS
$$
BEGIN

    INSERT INTO public.group_settings(group_id)
    VALUES (NEW.id);

    RETURN NEW;

END;
$$;

DROP TRIGGER IF EXISTS trg_create_group_settings
ON public.groups;

CREATE TRIGGER trg_create_group_settings

AFTER INSERT

ON public.groups

FOR EACH ROW

EXECUTE FUNCTION public.create_default_group_settings();

------------------------------------------------------------
-- RLS
------------------------------------------------------------

ALTER TABLE public.group_settings
ENABLE ROW LEVEL SECURITY;

------------------------------------------------------------
-- Lecture
------------------------------------------------------------

CREATE POLICY "Anyone can read group settings"

ON public.group_settings

FOR SELECT

USING (TRUE);

------------------------------------------------------------
-- Modification
------------------------------------------------------------

CREATE POLICY "Admins update group settings"

ON public.group_settings

FOR UPDATE

USING (

    EXISTS (

        SELECT 1

        FROM public.group_members gm

        WHERE gm.group_id = group_settings.group_id
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

COMMENT ON TABLE public.group_settings IS
'Paramètres avancés et configuration des groupes.';