-- Add pinned_by field to messages table for pinning functionality
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS pinned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS pinned_at timestamp with time zone;

-- Create index for pinned messages
CREATE INDEX IF NOT EXISTS idx_messages_pinned ON public.messages(conversation_id, pinned_at) WHERE pinned_at IS NOT NULL;

-- Create message_reactions table for rich reactions (separate from the simple reactions jsonb)
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  emoji text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Enable RLS on message_reactions
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for message_reactions
CREATE POLICY "Users can view reactions in their conversations"
ON public.message_reactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = message_reactions.message_id
    AND is_conversation_participant(auth.uid(), m.conversation_id)
  )
);

CREATE POLICY "Users can add reactions"
ON public.message_reactions FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = message_reactions.message_id
    AND is_conversation_participant(auth.uid(), m.conversation_id)
  )
);

CREATE POLICY "Users can remove their reactions"
ON public.message_reactions FOR DELETE
USING (auth.uid() = user_id);

-- Add realtime for message_reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;