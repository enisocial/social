-- Create stories table
CREATE TABLE public.stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    media_url TEXT NOT NULL,
    media_type VARCHAR(10) CHECK (media_type IN ('image', 'video')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '24 hours')
);

-- Create story_views table
CREATE TABLE public.story_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE NOT NULL,
    viewer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(story_id, viewer_id)
);

-- Enable RLS
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stories
CREATE POLICY "Anyone can view active stories"
ON public.stories
FOR SELECT
TO authenticated
USING (expires_at > now());

CREATE POLICY "Users can create their own stories"
ON public.stories
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories"
ON public.stories
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- RLS Policies for story_views
CREATE POLICY "Users can view story views of their own stories"
ON public.story_views
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.stories
        WHERE id = story_views.story_id
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can record their own story views"
ON public.story_views
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = viewer_id);

-- Create index for better performance
CREATE INDEX idx_stories_expires_at ON public.stories(expires_at);
CREATE INDEX idx_stories_user_id ON public.stories(user_id);
CREATE INDEX idx_story_views_story_id ON public.story_views(story_id);

-- Enable realtime for stories
ALTER PUBLICATION supabase_realtime ADD TABLE public.stories;