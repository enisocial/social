-- Create live_streams table
CREATE TABLE IF NOT EXISTS public.live_streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  stream_url TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'ended')),
  viewer_count INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create live_chat_messages table
CREATE TABLE IF NOT EXISTS public.live_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create live_reactions table
CREATE TABLE IF NOT EXISTS public.live_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'love', 'wow', 'clap')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create photo_albums table
CREATE TABLE IF NOT EXISTS public.photo_albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cover_photo_url TEXT,
  privacy TEXT NOT NULL DEFAULT 'public' CHECK (privacy IN ('public', 'friends', 'private')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create photos table
CREATE TABLE IF NOT EXISTS public.photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID REFERENCES public.photo_albums(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  location TEXT,
  privacy TEXT NOT NULL DEFAULT 'public' CHECK (privacy IN ('public', 'friends', 'private')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create photo_tags table (for tagging friends)
CREATE TABLE IF NOT EXISTS public.photo_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
  tagged_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tagged_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  position_x DECIMAL(5,2),
  position_y DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for live_streams
CREATE POLICY "Streams are viewable by everyone"
  ON public.live_streams FOR SELECT
  USING (status = 'live' OR status = 'ended' OR user_id = auth.uid());

CREATE POLICY "Users can create their own streams"
  ON public.live_streams FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streams"
  ON public.live_streams FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own streams"
  ON public.live_streams FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for live_chat_messages
CREATE POLICY "Chat messages viewable for active streams"
  ON public.live_chat_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.live_streams 
    WHERE id = stream_id AND status = 'live'
  ));

CREATE POLICY "Users can send chat messages"
  ON public.live_chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for live_reactions
CREATE POLICY "Reactions viewable for active streams"
  ON public.live_reactions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.live_streams 
    WHERE id = stream_id AND status = 'live'
  ));

CREATE POLICY "Users can react to streams"
  ON public.live_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their reactions"
  ON public.live_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for photo_albums
CREATE POLICY "Public albums are viewable by everyone"
  ON public.photo_albums FOR SELECT
  USING (privacy = 'public');

CREATE POLICY "Friends can view friend albums"
  ON public.photo_albums FOR SELECT
  USING (
    privacy = 'friends' AND (
      user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.friend_requests
        WHERE status = 'accepted' AND
        ((sender_id = auth.uid() AND receiver_id = user_id) OR
         (receiver_id = auth.uid() AND sender_id = user_id))
      )
    )
  );

CREATE POLICY "Users can view their own albums"
  ON public.photo_albums FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create albums"
  ON public.photo_albums FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their albums"
  ON public.photo_albums FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their albums"
  ON public.photo_albums FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for photos
CREATE POLICY "Public photos are viewable by everyone"
  ON public.photos FOR SELECT
  USING (privacy = 'public');

CREATE POLICY "Friends can view friend photos"
  ON public.photos FOR SELECT
  USING (
    privacy = 'friends' AND (
      user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.friend_requests
        WHERE status = 'accepted' AND
        ((sender_id = auth.uid() AND receiver_id = user_id) OR
         (receiver_id = auth.uid() AND sender_id = user_id))
      )
    )
  );

CREATE POLICY "Users can view their own photos"
  ON public.photos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create photos"
  ON public.photos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their photos"
  ON public.photos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their photos"
  ON public.photos FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for photo_tags
CREATE POLICY "Photo tags are viewable with photos"
  ON public.photo_tags FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.photos
    WHERE id = photo_id AND (
      privacy = 'public' OR
      user_id = auth.uid() OR
      (privacy = 'friends' AND EXISTS (
        SELECT 1 FROM public.friend_requests
        WHERE status = 'accepted' AND
        ((sender_id = auth.uid() AND receiver_id = photos.user_id) OR
         (receiver_id = auth.uid() AND sender_id = photos.user_id))
      ))
    )
  ));

CREATE POLICY "Users can tag friends on photos"
  ON public.photo_tags FOR INSERT
  WITH CHECK (auth.uid() = tagged_by);

CREATE POLICY "Users can remove their tags"
  ON public.photo_tags FOR DELETE
  USING (auth.uid() = tagged_user_id OR auth.uid() = tagged_by);

-- Enable realtime for live features
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_streams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_reactions;

-- Create indexes for performance
CREATE INDEX idx_live_streams_status ON public.live_streams(status);
CREATE INDEX idx_live_streams_user_id ON public.live_streams(user_id);
CREATE INDEX idx_live_chat_messages_stream_id ON public.live_chat_messages(stream_id);
CREATE INDEX idx_live_reactions_stream_id ON public.live_reactions(stream_id);
CREATE INDEX idx_photo_albums_user_id ON public.photo_albums(user_id);
CREATE INDEX idx_photos_album_id ON public.photos(album_id);
CREATE INDEX idx_photos_user_id ON public.photos(user_id);
CREATE INDEX idx_photo_tags_photo_id ON public.photo_tags(photo_id);
CREATE INDEX idx_photo_tags_tagged_user_id ON public.photo_tags(tagged_user_id);