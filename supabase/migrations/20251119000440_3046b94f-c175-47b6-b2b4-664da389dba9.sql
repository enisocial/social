-- Add parent_comment_id to comments table for nested replies
ALTER TABLE public.comments
ADD COLUMN parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;

-- Create index for better performance when querying replies
CREATE INDEX idx_comments_parent_id ON public.comments(parent_comment_id);

-- Update the RLS policies to handle replies
-- The existing policies already cover replies since they check user_id