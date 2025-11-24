-- Fix infinite recursion in group_members policies

-- Drop the problematic policies first
DROP POLICY IF EXISTS "Admins and moderators can add members" ON public.group_members;
DROP POLICY IF EXISTS "Admins and moderators can update members" ON public.group_members;

-- Recreate policies without recursion
CREATE POLICY "Admins and moderators can add members"
ON public.group_members
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = group_members.group_id
    AND gm.user_id = auth.uid()
    AND gm.role IN ('admin', 'moderator')
  )
);

CREATE POLICY "Admins and moderators can update members"
ON public.group_members
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = group_members.group_id
    AND gm.user_id = auth.uid()
    AND gm.role IN ('admin', 'moderator')
    AND gm.id != group_members.id  -- Exclude self to prevent recursion
  )
);