-- Create groups table
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  cover_url TEXT,
  privacy TEXT NOT NULL DEFAULT 'public' CHECK (privacy IN ('public', 'private')),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create group_members table with roles
CREATE TABLE public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Create group_messages table
CREATE TABLE public.group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create group_events table
CREATE TABLE public.group_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create group_event_attendees table
CREATE TABLE public.group_event_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.group_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'going' CHECK (status IN ('going', 'maybe', 'not_going')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Enable RLS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_event_attendees ENABLE ROW LEVEL SECURITY;

-- RLS Policies for groups
CREATE POLICY "Public groups are viewable by everyone"
  ON public.groups FOR SELECT
  USING (privacy = 'public');

CREATE POLICY "Private groups viewable by members"
  ON public.groups FOR SELECT
  USING (
    privacy = 'private' AND EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = groups.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create groups"
  ON public.groups FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update their groups"
  ON public.groups FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = groups.id 
        AND user_id = auth.uid() 
        AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete their groups"
  ON public.groups FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = groups.id 
        AND user_id = auth.uid() 
        AND role = 'admin'
    )
  );

-- RLS Policies for group_members
CREATE POLICY "Members are viewable by group members"
  ON public.group_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_members.group_id 
        AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and moderators can add members"
  ON public.group_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = group_members.group_id 
        AND user_id = auth.uid() 
        AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins and moderators can update members"
  ON public.group_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = group_members.group_id 
        AND user_id = auth.uid() 
        AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins can remove members"
  ON public.group_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = group_members.group_id 
        AND user_id = auth.uid() 
        AND role = 'admin'
    ) OR user_id = auth.uid()
  );

-- RLS Policies for group_messages
CREATE POLICY "Messages viewable by group members"
  ON public.group_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = group_messages.group_id 
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "Members can send messages"
  ON public.group_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = group_messages.group_id 
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "Senders and moderators can delete messages"
  ON public.group_messages FOR DELETE
  USING (
    auth.uid() = sender_id OR
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = group_messages.group_id 
        AND user_id = auth.uid() 
        AND role IN ('admin', 'moderator')
    )
  );

-- RLS Policies for group_events
CREATE POLICY "Events viewable by group members"
  ON public.group_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = group_events.group_id 
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and moderators can create events"
  ON public.group_events FOR INSERT
  WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = group_events.group_id 
        AND user_id = auth.uid() 
        AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins and moderators can update events"
  ON public.group_events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = group_events.group_id 
        AND user_id = auth.uid() 
        AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins and moderators can delete events"
  ON public.group_events FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = group_events.group_id 
        AND user_id = auth.uid() 
        AND role IN ('admin', 'moderator')
    )
  );

-- RLS Policies for group_event_attendees
CREATE POLICY "Attendees viewable by group members"
  ON public.group_event_attendees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_events ge
      JOIN public.group_members gm ON gm.group_id = ge.group_id
      WHERE ge.id = group_event_attendees.event_id 
        AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can RSVP to events"
  ON public.group_event_attendees FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.group_events ge
      JOIN public.group_members gm ON gm.group_id = ge.group_id
      WHERE ge.id = group_event_attendees.event_id 
        AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their RSVP"
  ON public.group_event_attendees FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their RSVP"
  ON public.group_event_attendees FOR DELETE
  USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to automatically add creator as admin
CREATE OR REPLACE FUNCTION public.add_group_creator_as_admin()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER add_creator_as_admin
  AFTER INSERT ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION public.add_group_creator_as_admin();

-- Enable realtime for group messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;