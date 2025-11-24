-- 1. Créer une fonction SECURITY DEFINER pour vérifier si un groupe est public
CREATE OR REPLACE FUNCTION public.is_group_public(_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT privacy = 'public'
  FROM public.groups
  WHERE id = _group_id
$$;

-- 2. Créer une fonction pour vérifier si l'utilisateur est membre d'un groupe
CREATE OR REPLACE FUNCTION public.is_group_member(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members
    WHERE user_id = _user_id
      AND group_id = _group_id
  )
$$;

-- 3. Remplacer les politiques sur group_members pour éviter la récursion
DROP POLICY IF EXISTS "Members viewable for public groups or own membership" ON public.group_members;
DROP POLICY IF EXISTS "Admins can update member roles" ON public.group_members;
DROP POLICY IF EXISTS "Admins can remove members or users can leave" ON public.group_members;

-- Nouvelle politique SELECT sans récursion
CREATE POLICY "Members viewable for public groups or own membership"
ON public.group_members
FOR SELECT
USING (
  public.is_group_public(group_id)
  OR auth.uid() = user_id
);

-- Nouvelle politique UPDATE sans récursion
CREATE POLICY "Group creators can update member roles"
ON public.group_members
FOR UPDATE
USING (public.is_group_creator(auth.uid(), group_id));

-- Nouvelle politique DELETE sans récursion
CREATE POLICY "Creators can remove members or users can leave"
ON public.group_members
FOR DELETE
USING (
  public.is_group_creator(auth.uid(), group_id)
  OR auth.uid() = user_id
);

-- 4. Simplifier la politique sur groups pour les groupes privés
DROP POLICY IF EXISTS "Private groups viewable by members (not creator)" ON public.groups;

CREATE POLICY "Private groups viewable by members (not creator)"
ON public.groups
FOR SELECT
USING (
  privacy = 'private' 
  AND auth.uid() != created_by
  AND public.is_group_member(auth.uid(), id)
);