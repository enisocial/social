-- ============================================
-- STORY VIEWS
-- ============================================

CREATE TABLE IF NOT EXISTS public.story_views (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    story_id UUID NOT NULL
        REFERENCES public.stories(id)
        ON DELETE CASCADE,

    viewer_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT unique_story_view
        UNIQUE (story_id, viewer_id)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_story_views_story
ON public.story_views(story_id);

CREATE INDEX IF NOT EXISTS idx_story_views_viewer
ON public.story_views(viewer_id);

CREATE INDEX IF NOT EXISTS idx_story_views_date
ON public.story_views(viewed_at DESC);

-- ============================================
-- FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.update_story_views_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

    IF TG_OP = 'INSERT' THEN

        UPDATE public.stories
        SET views_count = views_count + 1
        WHERE id = NEW.story_id;

        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN

        UPDATE public.stories
        SET views_count = GREATEST(views_count - 1, 0)
        WHERE id = OLD.story_id;

        RETURN OLD;

    END IF;

    RETURN NULL;

END;
$$;

-- ============================================
-- TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS trg_story_view_insert
ON public.story_views;

CREATE TRIGGER trg_story_view_insert
AFTER INSERT
ON public.story_views
FOR EACH ROW
EXECUTE FUNCTION public.update_story_views_count();


DROP TRIGGER IF EXISTS trg_story_view_delete
ON public.story_views;

CREATE TRIGGER trg_story_view_delete
AFTER DELETE
ON public.story_views
FOR EACH ROW
EXECUTE FUNCTION public.update_story_views_count();