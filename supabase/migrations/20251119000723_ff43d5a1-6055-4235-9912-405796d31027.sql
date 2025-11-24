-- Create reaction type enum
CREATE TYPE public.reaction_type AS ENUM ('like', 'love', 'haha', 'wow', 'sad', 'angry');

-- Create post_reactions table
CREATE TABLE public.post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction_type reaction_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Create comment_reactions table (replacing comment_likes)
CREATE TABLE public.comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction_type reaction_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Enable RLS
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for post_reactions
CREATE POLICY "Reactions are viewable by everyone"
ON public.post_reactions FOR SELECT
USING (true);

CREATE POLICY "Users can add reactions"
ON public.post_reactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their reactions"
ON public.post_reactions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their reactions"
ON public.post_reactions FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for comment_reactions
CREATE POLICY "Comment reactions are viewable by everyone"
ON public.comment_reactions FOR SELECT
USING (true);

CREATE POLICY "Users can add comment reactions"
ON public.comment_reactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their comment reactions"
ON public.comment_reactions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their comment reactions"
ON public.comment_reactions FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_post_reactions_post_id ON public.post_reactions(post_id);
CREATE INDEX idx_post_reactions_user_id ON public.post_reactions(user_id);
CREATE INDEX idx_comment_reactions_comment_id ON public.comment_reactions(comment_id);
CREATE INDEX idx_comment_reactions_user_id ON public.comment_reactions(user_id);

-- Add reply_count to comments table
ALTER TABLE public.comments
ADD COLUMN reply_count INTEGER DEFAULT 0;

-- Function to update reply count
CREATE OR REPLACE FUNCTION public.update_comment_reply_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.parent_comment_id IS NOT NULL THEN
    UPDATE comments SET reply_count = reply_count + 1 WHERE id = NEW.parent_comment_id;
  ELSIF TG_OP = 'DELETE' AND OLD.parent_comment_id IS NOT NULL THEN
    UPDATE comments SET reply_count = GREATEST(reply_count - 1, 0) WHERE id = OLD.parent_comment_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger for reply count
CREATE TRIGGER update_comment_reply_count_trigger
AFTER INSERT OR DELETE ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.update_comment_reply_count();