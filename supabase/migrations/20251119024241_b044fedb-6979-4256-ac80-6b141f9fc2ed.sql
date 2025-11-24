-- Create live_stream_participants table for duo/group streaming
CREATE TABLE IF NOT EXISTS public.live_stream_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid REFERENCES public.live_streams(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL DEFAULT 'guest' CHECK (role IN ('host', 'co-host', 'guest')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'declined', 'removed')),
  invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  invited_at timestamptz DEFAULT now(),
  joined_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(stream_id, user_id)
);

-- Enable RLS
ALTER TABLE public.live_stream_participants ENABLE ROW LEVEL SECURITY;

-- Participants viewable by stream viewers
CREATE POLICY "Participants viewable by everyone"
ON public.live_stream_participants
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.live_streams
    WHERE id = stream_id
    AND (status = 'live' OR user_id = auth.uid())
  )
);

-- Stream owner can invite participants
CREATE POLICY "Stream owners can invite participants"
ON public.live_stream_participants
FOR INSERT
WITH CHECK (
  auth.uid() = invited_by
  AND EXISTS (
    SELECT 1 FROM public.live_streams
    WHERE id = stream_id AND user_id = auth.uid()
  )
);

-- Participants can update their own status
CREATE POLICY "Participants can update their status"
ON public.live_stream_participants
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Stream owners can remove participants
CREATE POLICY "Stream owners can remove participants"
ON public.live_stream_participants
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.live_streams
    WHERE id = stream_id AND user_id = auth.uid()
  )
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_stream_participants;