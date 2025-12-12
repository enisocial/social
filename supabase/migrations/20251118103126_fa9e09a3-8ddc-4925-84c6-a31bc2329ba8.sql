-- Add story replies and reactions tables
CREATE TABLE IF NOT EXISTS public.story_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(story_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.story_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  slider_value integer CHECK (slider_value >= 0 AND slider_value <= 100),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(story_id, user_id)
);

-- Enable RLS
ALTER TABLE public.story_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_reactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for story_replies
CREATE POLICY "Users can view replies on stories they can see"
  ON public.story_replies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stories
      WHERE stories.id = story_replies.story_id
      AND stories.expires_at > now()
    )
  );

CREATE POLICY "Users can create their own replies"
  ON public.story_replies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own replies"
  ON public.story_replies FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for story_reactions
CREATE POLICY "Users can view reactions on stories they can see"
  ON public.story_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stories
      WHERE stories.id = story_reactions.story_id
      AND stories.expires_at > now()
    )
  );

CREATE POLICY "Users can create their own reactions"
  ON public.story_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reactions"
  ON public.story_reactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions"
  ON public.story_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- Function to get platform statistics
CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS TABLE(
  total_users bigint,
  total_posts bigint,
  total_stories bigint,
  total_messages bigint,
  active_users_today bigint,
  new_users_this_week bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM profiles),
    (SELECT COUNT(*) FROM posts),
    (SELECT COUNT(*) FROM stories WHERE expires_at > now()),
    (SELECT COUNT(*) FROM messages),
    (SELECT COUNT(DISTINCT user_id) FROM posts WHERE created_at > now() - interval '1 day'),
    (SELECT COUNT(*) FROM profiles WHERE created_at > now() - interval '7 days');
END;
$$;