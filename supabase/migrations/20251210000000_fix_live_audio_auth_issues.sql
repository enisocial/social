-- Fix Live Audio authentication issues
-- This migration fixes RLS policies and authentication problems

-- Step 1: Fix user_roles table policies (remove recursion)
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow role checking for authentication" ON public.user_roles;
DROP POLICY IF EXISTS "System admin can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "System admin can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "users_can_view_own_roles" ON public.user_roles;
DROP POLICY IF EXISTS "users_can_insert_own_roles" ON public.user_roles;
DROP POLICY IF EXISTS "admin_can_view_all_roles" ON public.user_roles;
DROP POLICY IF EXISTS "admin_can_manage_all_roles" ON public.user_roles;

-- Create new, simple policies without recursion
CREATE POLICY "users_can_view_own_roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "users_can_insert_own_roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admin (by email) can view all roles - NO RECURSION
CREATE POLICY "admin_can_view_all_roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.jwt() ->> 'email' = 'admin@binkaa.com');

-- Admin (by email) can manage all roles - NO RECURSION
CREATE POLICY "admin_can_manage_all_roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (auth.jwt() ->> 'email' = 'admin@binkaa.com')
WITH CHECK (auth.jwt() ->> 'email' = 'admin@binkaa.com');

-- Step 2: Ensure admin role exists
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'admin@binkaa.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 3: Ensure all users have default 'user' role
INSERT INTO user_roles (user_id, role)
SELECT id, 'user'
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.users.id
)
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 4: Fix live_audio_participants RLS policies
DROP POLICY IF EXISTS "Users can view participants in their rooms" ON public.live_audio_participants;
DROP POLICY IF EXISTS "Users can join rooms" ON public.live_audio_participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON public.live_audio_participants;
DROP POLICY IF EXISTS "Hosts can manage participants" ON public.live_audio_participants;
DROP POLICY IF EXISTS "users_can_view_participants_in_rooms" ON public.live_audio_participants;
DROP POLICY IF EXISTS "users_can_join_rooms" ON public.live_audio_participants;
DROP POLICY IF EXISTS "users_can_update_own_participation" ON public.live_audio_participants;
DROP POLICY IF EXISTS "hosts_can_manage_participants" ON public.live_audio_participants;

-- Create new policies for live_audio_participants
CREATE POLICY "users_can_view_participants_in_rooms"
ON public.live_audio_participants
FOR SELECT
TO authenticated
USING (
  -- User is participant in the room
  user_id = auth.uid() OR
  -- Room exists and is active (for discovery)
  EXISTS (
    SELECT 1 FROM live_audio_rooms
    WHERE live_audio_rooms.id = room_id
    AND live_audio_rooms.status IN ('waiting', 'live')
  )
);

CREATE POLICY "users_can_join_rooms"
ON public.live_audio_participants
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM live_audio_rooms
    WHERE live_audio_rooms.id = room_id
    AND live_audio_rooms.status IN ('waiting', 'live')
  )
);

CREATE POLICY "users_can_update_own_participation"
ON public.live_audio_participants
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "hosts_can_manage_participants"
ON public.live_audio_participants
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM live_audio_rooms
    WHERE live_audio_rooms.id = room_id
    AND live_audio_rooms.host_id = auth.uid()
  )
);

-- Step 5: Fix live_audio_rooms policies
DROP POLICY IF EXISTS "Anyone can view active rooms" ON public.live_audio_rooms;
DROP POLICY IF EXISTS "Authenticated users can create rooms" ON public.live_audio_rooms;
DROP POLICY IF EXISTS "Hosts can update their rooms" ON public.live_audio_rooms;
DROP POLICY IF EXISTS "Hosts can delete their rooms" ON public.live_audio_rooms;
DROP POLICY IF EXISTS "anyone_can_view_active_rooms" ON public.live_audio_rooms;
DROP POLICY IF EXISTS "authenticated_users_can_create_rooms" ON public.live_audio_rooms;
DROP POLICY IF EXISTS "hosts_can_update_their_rooms" ON public.live_audio_rooms;
DROP POLICY IF EXISTS "hosts_can_delete_their_rooms" ON public.live_audio_rooms;

CREATE POLICY "anyone_can_view_active_rooms"
ON public.live_audio_rooms
FOR SELECT
TO authenticated
USING (status IN ('waiting', 'live'));

CREATE POLICY "authenticated_users_can_create_rooms"
ON public.live_audio_rooms
FOR INSERT
TO authenticated
WITH CHECK (host_id = auth.uid());

CREATE POLICY "hosts_can_update_their_rooms"
ON public.live_audio_rooms
FOR UPDATE
TO authenticated
USING (host_id = auth.uid())
WITH CHECK (host_id = auth.uid());

CREATE POLICY "hosts_can_delete_their_rooms"
ON public.live_audio_rooms
FOR DELETE
TO authenticated
USING (host_id = auth.uid());

-- Step 6: Fix live_audio_messages policies
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON public.live_audio_messages;
DROP POLICY IF EXISTS "Users can send messages in rooms they participate in" ON public.live_audio_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.live_audio_messages;
DROP POLICY IF EXISTS "Hosts can manage messages" ON public.live_audio_messages;
DROP POLICY IF EXISTS "users_can_view_messages_in_rooms" ON public.live_audio_messages;
DROP POLICY IF EXISTS "users_can_send_messages" ON public.live_audio_messages;
DROP POLICY IF EXISTS "users_can_update_own_messages" ON public.live_audio_messages;
DROP POLICY IF EXISTS "hosts_can_manage_messages" ON public.live_audio_messages;

CREATE POLICY "users_can_view_messages_in_rooms"
ON public.live_audio_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM live_audio_participants
    WHERE live_audio_participants.room_id = live_audio_messages.room_id
    AND live_audio_participants.user_id = auth.uid()
  )
);

CREATE POLICY "users_can_send_messages"
ON public.live_audio_messages
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM live_audio_participants
    WHERE live_audio_participants.room_id = live_audio_messages.room_id
    AND live_audio_participants.user_id = auth.uid()
  )
);

CREATE POLICY "users_can_update_own_messages"
ON public.live_audio_messages
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "hosts_can_manage_messages"
ON public.live_audio_messages
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM live_audio_rooms
    WHERE live_audio_rooms.id = room_id
    AND live_audio_rooms.host_id = auth.uid()
  )
);

-- Step 7: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_live_audio_participants_room_user ON live_audio_participants(room_id, user_id);
CREATE INDEX IF NOT EXISTS idx_live_audio_rooms_host_status ON live_audio_rooms(host_id, status);
CREATE INDEX IF NOT EXISTS idx_live_audio_messages_room_created ON live_audio_messages(room_id, created_at);
