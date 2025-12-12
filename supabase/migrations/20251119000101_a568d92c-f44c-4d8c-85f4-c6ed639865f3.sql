-- Create comment_likes table
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Enable RLS
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- Users can like comments
CREATE POLICY "Users can like comments"
ON public.comment_likes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can view likes on comments
CREATE POLICY "Comment likes are viewable by everyone"
ON public.comment_likes
FOR SELECT
TO authenticated
USING (true);

-- Users can unlike comments
CREATE POLICY "Users can unlike comments"
ON public.comment_likes
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_comment_likes_comment_id ON public.comment_likes(comment_id);
CREATE INDEX idx_comment_likes_user_id ON public.comment_likes(user_id);

-- Add like_count to comments table
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;

-- Create function to update comment like count
CREATE OR REPLACE FUNCTION public.update_comment_like_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE comments SET like_count = like_count + 1 WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE comments SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for comment like count
DROP TRIGGER IF EXISTS trigger_update_comment_like_count ON public.comment_likes;
CREATE TRIGGER trigger_update_comment_like_count
AFTER INSERT OR DELETE ON public.comment_likes
FOR EACH ROW
EXECUTE FUNCTION public.update_comment_like_count();

-- Enable realtime for comment_likes
ALTER PUBLICATION supabase_realtime ADD TABLE public.comment_likes;