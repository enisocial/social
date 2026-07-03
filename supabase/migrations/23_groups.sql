-- ============================================
-- GROUPS
-- ============================================

CREATE TABLE IF NOT EXISTS public.groups (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    owner_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    name TEXT NOT NULL,

    slug TEXT UNIQUE,

    description TEXT,

    avatar_url TEXT,

    cover_url TEXT,

    privacy TEXT NOT NULL DEFAULT 'public'
        CHECK (
            privacy IN (
                'public',
                'private',
                'secret'
            )
        ),

    approval_required BOOLEAN NOT NULL DEFAULT FALSE,

    allow_member_posts BOOLEAN NOT NULL DEFAULT TRUE,

    members_count INTEGER NOT NULL DEFAULT 1,

    posts_count INTEGER NOT NULL DEFAULT 0,

    is_verified BOOLEAN NOT NULL DEFAULT FALSE,

    is_archived BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT groups_name_not_empty
        CHECK (length(trim(name)) > 0)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_groups_owner
ON public.groups(owner_id);

CREATE INDEX IF NOT EXISTS idx_groups_privacy
ON public.groups(privacy);

CREATE INDEX IF NOT EXISTS idx_groups_created
ON public.groups(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_groups_slug
ON public.groups(slug);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

CREATE TRIGGER trg_groups_updated_at
BEFORE UPDATE
ON public.groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();