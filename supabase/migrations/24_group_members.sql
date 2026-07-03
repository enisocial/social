-- ============================================
-- GROUP MEMBERS
-- ============================================

CREATE TABLE IF NOT EXISTS public.group_members (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    group_id UUID NOT NULL
        REFERENCES public.groups(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    role TEXT NOT NULL DEFAULT 'member'
        CHECK (
            role IN (
                'owner',
                'admin',
                'moderator',
                'member'
            )
        ),

    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (
            status IN (
                'pending',
                'approved',
                'rejected',
                'banned'
            )
        ),

    invited_by UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    joined_at TIMESTAMPTZ DEFAULT now(),

    approved_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT unique_group_member
        UNIQUE(group_id, user_id)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_group_members_group
ON public.group_members(group_id);

CREATE INDEX IF NOT EXISTS idx_group_members_user
ON public.group_members(user_id);

CREATE INDEX IF NOT EXISTS idx_group_members_role
ON public.group_members(role);

CREATE INDEX IF NOT EXISTS idx_group_members_status
ON public.group_members(status);

-- ============================================
-- UPDATE MEMBERS COUNT
-- ============================================

CREATE OR REPLACE FUNCTION public.update_group_members_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

    IF TG_OP = 'INSERT' THEN

        IF NEW.status = 'approved' THEN
            UPDATE public.groups
            SET members_count = members_count + 1
            WHERE id = NEW.group_id;
        END IF;

        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN

        IF OLD.status = 'approved' THEN
            UPDATE public.groups
            SET members_count = GREATEST(members_count - 1,0)
            WHERE id = OLD.group_id;
        END IF;

        RETURN OLD;

    ELSIF TG_OP = 'UPDATE' THEN

        IF OLD.status <> 'approved'
           AND NEW.status = 'approved' THEN

            UPDATE public.groups
            SET members_count = members_count + 1
            WHERE id = NEW.group_id;

        ELSIF OLD.status = 'approved'
           AND NEW.status <> 'approved' THEN

            UPDATE public.groups
            SET members_count = GREATEST(members_count - 1,0)
            WHERE id = NEW.group_id;

        END IF;

        RETURN NEW;

    END IF;

    RETURN NULL;

END;
$$;

-- ============================================
-- TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS trg_group_members_insert
ON public.group_members;

CREATE TRIGGER trg_group_members_insert
AFTER INSERT
ON public.group_members
FOR EACH ROW
EXECUTE FUNCTION public.update_group_members_count();


DROP TRIGGER IF EXISTS trg_group_members_update
ON public.group_members;

CREATE TRIGGER trg_group_members_update
AFTER UPDATE
ON public.group_members
FOR EACH ROW
EXECUTE FUNCTION public.update_group_members_count();


DROP TRIGGER IF EXISTS trg_group_members_delete
ON public.group_members;

CREATE TRIGGER trg_group_members_delete
AFTER DELETE
ON public.group_members
FOR EACH ROW
EXECUTE FUNCTION public.update_group_members_count();

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

CREATE TRIGGER trg_group_members_updated_at
BEFORE UPDATE
ON public.group_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();