-- Create post_shares table to track shared posts
CREATE TABLE IF NOT EXISTS public.post_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shared_with_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  shared_with_group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  share_type TEXT NOT NULL CHECK (share_type IN ('profile', 'friend', 'group')),
  share_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, shared_by, shared_with_user_id, shared_with_group_id)
);

-- Enable RLS
ALTER TABLE public.post_shares ENABLE ROW LEVEL SECURITY;

-- Users can share posts
CREATE POLICY "Users can share posts"
ON public.post_shares
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = shared_by);

-- Users can view shares they created
CREATE POLICY "Users can view their shares"
ON public.post_shares
FOR SELECT
TO authenticated
USING (auth.uid() = shared_by);

-- Users can view shares directed to them
CREATE POLICY "Users can view shares directed to them"
ON public.post_shares
FOR SELECT
TO authenticated
USING (
  auth.uid() = shared_with_user_id
  OR (shared_with_user_id IS NULL AND share_type = 'profile')
  OR EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = post_shares.shared_with_group_id
    AND user_id = auth.uid()
  )
);

-- Users can view shares from friends
CREATE POLICY "Users can view shares from friends"
ON public.post_shares
FOR SELECT
TO authenticated
USING (
  share_type = 'profile' AND EXISTS (
    SELECT 1 FROM friend_requests
    WHERE status = 'accepted'
    AND ((sender_id = auth.uid() AND receiver_id = post_shares.shared_by)
    OR (receiver_id = auth.uid() AND sender_id = post_shares.shared_by))
  )
);

-- Users can delete their shares
CREATE POLICY "Users can delete their shares"
ON public.post_shares
FOR DELETE
TO authenticated
USING (auth.uid() = shared_by);

-- Create index for better performance
CREATE INDEX idx_post_shares_post_id ON public.post_shares(post_id);
CREATE INDEX idx_post_shares_shared_by ON public.post_shares(shared_by);
CREATE INDEX idx_post_shares_created_at ON public.post_shares(created_at DESC);

-- Add share_count to posts (optional but useful for performance)
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0;

-- Create function to update share count
CREATE OR REPLACE FUNCTION public.update_post_share_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET share_count = share_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET share_count = GREATEST(share_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for share count
DROP TRIGGER IF EXISTS trigger_update_post_share_count ON public.post_shares;
CREATE TRIGGER trigger_update_post_share_count
AFTER INSERT OR DELETE ON public.post_shares
FOR EACH ROW
EXECUTE FUNCTION public.update_post_share_count();