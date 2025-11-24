-- Créer une fonction pour vérifier si l'utilisateur est le créateur du groupe
CREATE OR REPLACE FUNCTION public.is_group_creator(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.groups
    WHERE id = _group_id
      AND created_by = _user_id
  )
$$;

-- Remplacer la politique d'insertion pour éviter la récursion
DROP POLICY IF EXISTS "Members can be added by admins or self-join" ON public.group_members;

CREATE POLICY "Members can be added by group creator or self"
ON public.group_members
FOR INSERT
WITH CHECK (
  -- L'utilisateur peut s'ajouter lui-même
  auth.uid() = user_id
  OR
  -- Ou le créateur du groupe peut ajouter des membres
  public.is_group_creator(auth.uid(), group_id)
);