-- ============================================================
-- FILE 35 - GROUP FUNCTIONS & TRIGGERS
-- ============================================================

------------------------------------------------------------
-- Vérifier si un utilisateur est membre
------------------------------------------------------------
DROP POLICY IF EXISTS "Group members can read group posts" ON public.posts;
DROP POLICY IF EXISTS "Group members can create group posts" ON public.posts;
DROP POLICY IF EXISTS "Users update own group posts" ON public.posts;
DROP POLICY IF EXISTS "Users delete own group posts" ON public.posts;
DROP FUNCTION IF EXISTS public.is_group_member(UUID, UUID);
CREATE OR REPLACE FUNCTION public.is_group_member(
    p_group_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS
$$
SELECT EXISTS (
    SELECT 1
    FROM public.group_members
    WHERE group_id = p_group_id
      AND user_id = p_user_id
      AND status = 'accepted'
);
$$;

------------------------------------------------------------
-- Vérifier si un utilisateur est modérateur
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_group_moderator(
    p_group_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS
$$
SELECT EXISTS (
    SELECT 1
    FROM public.group_members
    WHERE group_id = p_group_id
      AND user_id = p_user_id
      AND role IN ('owner','admin','moderator')
      AND status='accepted'
);
$$;

------------------------------------------------------------
-- Vérifier si un utilisateur est propriétaire
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_group_owner(
    p_group_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS
$$
SELECT EXISTS (
    SELECT 1
    FROM public.group_members
    WHERE group_id = p_group_id
      AND user_id = p_user_id
      AND role='owner'
      AND status='accepted'
);
$$;

------------------------------------------------------------
-- Vérifier si un utilisateur peut publier
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.can_post_in_group(
    p_group UUID,
    p_user UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS
$$
DECLARE
    v_permission TEXT;
BEGIN

    SELECT who_can_post
    INTO v_permission
    FROM public.group_settings
    WHERE group_id = p_group;

    IF v_permission IS NULL THEN
        RETURN FALSE;
    END IF;

    IF v_permission='members' THEN
        RETURN public.is_group_member(p_group,p_user);
    END IF;

    IF v_permission='moderators' THEN
        RETURN public.is_group_moderator(p_group,p_user);
    END IF;

    IF v_permission='admins' THEN
        RETURN public.is_group_owner(p_group,p_user);
    END IF;

    RETURN FALSE;

END;
$$;

------------------------------------------------------------
-- Compteur de membres
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_group_member_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS
$$
BEGIN

    IF TG_OP='INSERT' THEN

        UPDATE public.groups
        SET member_count = (
            SELECT COUNT(*)
            FROM public.group_members
            WHERE group_id=NEW.group_id
            AND status='accepted'
        )
        WHERE id=NEW.group_id;

        RETURN NEW;

    END IF;

    UPDATE public.groups
    SET member_count = (
        SELECT COUNT(*)
        FROM public.group_members
        WHERE group_id=OLD.group_id
        AND status='accepted'
    )
    WHERE id=OLD.group_id;

    RETURN OLD;

END;
$$;

DROP TRIGGER IF EXISTS trg_group_member_count_insert
ON public.group_members;

DROP TRIGGER IF EXISTS trg_group_member_count_delete
ON public.group_members;

CREATE TRIGGER trg_group_member_count_insert
AFTER INSERT
ON public.group_members
FOR EACH ROW
EXECUTE FUNCTION public.update_group_member_count();

CREATE TRIGGER trg_group_member_count_delete
AFTER DELETE
ON public.group_members
FOR EACH ROW
EXECUTE FUNCTION public.update_group_member_count();

------------------------------------------------------------
-- Compteur de publications
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_group_post_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS
$$
BEGIN

    IF NEW.group_id IS NULL AND TG_OP='INSERT' THEN
        RETURN NEW;
    END IF;

    IF TG_OP='INSERT' THEN

        UPDATE public.groups
        SET post_count = (
            SELECT COUNT(*)
            FROM public.posts
            WHERE group_id=NEW.group_id
        )
        WHERE id=NEW.group_id;

        RETURN NEW;

    END IF;

    IF OLD.group_id IS NULL THEN
        RETURN OLD;
    END IF;

    UPDATE public.groups
    SET post_count = (
        SELECT COUNT(*)
        FROM public.posts
        WHERE group_id=OLD.group_id
    )
    WHERE id=OLD.group_id;

    RETURN OLD;

END;
$$;

DROP TRIGGER IF EXISTS trg_group_post_insert
ON public.posts;

DROP TRIGGER IF EXISTS trg_group_post_delete
ON public.posts;

CREATE TRIGGER trg_group_post_insert
AFTER INSERT
ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.update_group_post_count();

CREATE TRIGGER trg_group_post_delete
AFTER DELETE
ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.update_group_post_count();

------------------------------------------------------------
-- Compteur d'événements
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_group_event_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS
$$
BEGIN

    IF TG_OP='INSERT' THEN

        UPDATE public.groups
        SET event_count = (
            SELECT COUNT(*)
            FROM public.group_events
            WHERE group_id=NEW.group_id
        )
        WHERE id=NEW.group_id;

        RETURN NEW;

    END IF;

    UPDATE public.groups
    SET event_count = (
        SELECT COUNT(*)
        FROM public.group_events
        WHERE group_id=OLD.group_id
    )
    WHERE id=OLD.group_id;

    RETURN OLD;

END;
$$;

DROP TRIGGER IF EXISTS trg_group_event_insert
ON public.group_events;

DROP TRIGGER IF EXISTS trg_group_event_delete
ON public.group_events;

CREATE TRIGGER trg_group_event_insert
AFTER INSERT
ON public.group_events
FOR EACH ROW
EXECUTE FUNCTION public.update_group_event_count();

CREATE TRIGGER trg_group_event_delete
AFTER DELETE
ON public.group_events
FOR EACH ROW
EXECUTE FUNCTION public.update_group_event_count();

------------------------------------------------------------
-- Validation des publications
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.validate_group_post()
RETURNS TRIGGER
LANGUAGE plpgsql
AS
$$
BEGIN

    IF NEW.group_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF NOT public.can_post_in_group(
        NEW.group_id,
        NEW.user_id
    ) THEN

        RAISE EXCEPTION
        'Vous n''êtes pas autorisé à publier dans ce groupe.';

    END IF;

    RETURN NEW;

END;
$$;

DROP TRIGGER IF EXISTS trg_validate_group_post
ON public.posts;

CREATE TRIGGER trg_validate_group_post
BEFORE INSERT
ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.validate_group_post();

------------------------------------------------------------
-- Documentation
------------------------------------------------------------

COMMENT ON FUNCTION public.is_group_member IS
'Retourne TRUE si un utilisateur est membre accepté du groupe.';

COMMENT ON FUNCTION public.is_group_moderator IS
'Retourne TRUE si un utilisateur est modérateur, administrateur ou propriétaire.';

COMMENT ON FUNCTION public.can_post_in_group IS
'Vérifie les paramètres du groupe avant d''autoriser une publication.';