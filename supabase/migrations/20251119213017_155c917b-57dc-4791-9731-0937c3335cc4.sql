-- Add live_stream to notification_type enum
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'live_stream';

-- Create gift_types table (catalog of available gifts)
CREATE TABLE IF NOT EXISTS public.gift_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  value INTEGER NOT NULL,
  animation_type TEXT NOT NULL DEFAULT 'default',
  rarity TEXT NOT NULL DEFAULT 'common',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create live_gifts table
CREATE TABLE IF NOT EXISTS public.live_gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  gift_type_id UUID NOT NULL REFERENCES gift_types(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  total_value INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create live_duo_invitations table
CREATE TABLE IF NOT EXISTS public.live_duo_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  invited_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ,
  CONSTRAINT valid_duo_status CHECK (status IN ('pending', 'accepted', 'rejected', 'ended'))
);

-- Add duo columns to live_streams
ALTER TABLE public.live_streams 
  ADD COLUMN IF NOT EXISTS is_duo BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS duo_guest_id UUID REFERENCES profiles(id);

-- Enable RLS
ALTER TABLE public.gift_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_duo_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gift_types
CREATE POLICY "Gift types are viewable by everyone"
  ON public.gift_types FOR SELECT
  USING (true);

-- RLS Policies for live_gifts
CREATE POLICY "Live gifts are viewable for active streams"
  ON public.live_gifts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM live_streams
      WHERE live_streams.id = live_gifts.stream_id
      AND live_streams.status = 'live'
    )
  );

CREATE POLICY "Users can send gifts"
  ON public.live_gifts FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- RLS Policies for live_duo_invitations
CREATE POLICY "Users can view duo invitations they're involved in"
  ON public.live_duo_invitations FOR SELECT
  USING (auth.uid() = host_id OR auth.uid() = guest_id);

CREATE POLICY "Stream owners can create duo invitations"
  ON public.live_duo_invitations FOR INSERT
  WITH CHECK (
    auth.uid() = host_id AND
    EXISTS (
      SELECT 1 FROM live_streams
      WHERE live_streams.id = live_duo_invitations.stream_id
      AND live_streams.user_id = auth.uid()
    )
  );

CREATE POLICY "Guests can update invitation status"
  ON public.live_duo_invitations FOR UPDATE
  USING (auth.uid() = guest_id);

-- Insert default gift types
INSERT INTO public.gift_types (name, icon, value, animation_type, rarity) VALUES
  ('Heart', '❤️', 1, 'float', 'common'),
  ('Rose', '🌹', 5, 'float', 'common'),
  ('Star', '⭐', 10, 'sparkle', 'uncommon'),
  ('Diamond', '💎', 50, 'explosion', 'rare'),
  ('Crown', '👑', 100, 'explosion', 'rare'),
  ('Rocket', '🚀', 500, 'fireworks', 'epic'),
  ('Trophy', '🏆', 1000, 'fireworks', 'legendary')
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_live_gifts_stream ON live_gifts(stream_id);
CREATE INDEX IF NOT EXISTS idx_live_gifts_sender ON live_gifts(sender_id);
CREATE INDEX IF NOT EXISTS idx_live_duo_invitations_stream ON live_duo_invitations(stream_id);
CREATE INDEX IF NOT EXISTS idx_live_duo_invitations_guest ON live_duo_invitations(guest_id);

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE live_gifts;
ALTER PUBLICATION supabase_realtime ADD TABLE live_duo_invitations;