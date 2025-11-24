-- Supprimer les anciennes politiques problématiques
DROP POLICY IF EXISTS "Members are viewable by group members" ON public.group_members;
DROP POLICY IF EXISTS "Admins and moderators can add members" ON public.group_members;
DROP POLICY IF EXISTS "Admins and moderators can update members" ON public.group_members;
DROP POLICY IF EXISTS "Admins can remove members" ON public.group_members;

-- Créer des politiques RLS sans récursion pour group_members
CREATE POLICY "Members viewable for public groups or own membership"
ON public.group_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_members.group_id 
    AND (g.privacy = 'public' OR group_members.user_id = auth.uid())
  )
);

CREATE POLICY "Group creators and admins can add members"
ON public.group_members
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_members.group_id 
    AND (g.created_by = auth.uid() OR auth.uid() = group_members.user_id)
  )
);

CREATE POLICY "Admins can update member roles"
ON public.group_members
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_members.group_id 
    AND g.created_by = auth.uid()
  )
);

CREATE POLICY "Admins can remove members or users can leave"
ON public.group_members
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_members.group_id 
    AND (g.created_by = auth.uid() OR group_members.user_id = auth.uid())
  )
);

-- Créer la table pour les demandes d'adhésion aux groupes
CREATE TABLE IF NOT EXISTS public.group_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id),
  UNIQUE(group_id, user_id)
);

-- RLS pour group_join_requests
ALTER TABLE public.group_join_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create join requests"
ON public.group_join_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own requests"
ON public.group_join_requests
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Group admins can view requests"
ON public.group_join_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_join_requests.group_id 
    AND g.created_by = auth.uid()
  )
);

CREATE POLICY "Group admins can update requests"
ON public.group_join_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_join_requests.group_id 
    AND g.created_by = auth.uid()
  )
);

-- Créer la table pour les publications dans les groupes
CREATE TABLE IF NOT EXISTS public.group_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('image', 'video')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS pour group_posts
ALTER TABLE public.group_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view group posts"
ON public.group_posts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_posts.group_id 
    AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "Members can create posts"
ON public.group_posts
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_posts.group_id 
    AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own posts"
ON public.group_posts
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users and admins can delete posts"
ON public.group_posts
FOR DELETE
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_posts.group_id 
    AND g.created_by = auth.uid()
  )
);