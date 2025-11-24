-- Créer une fonction SECURITY DEFINER pour vérifier si un utilisateur est admin d'un groupe
CREATE OR REPLACE FUNCTION public.is_group_admin(_user_id uuid, _group_id uuid)
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
      AND role = 'admin'
  )
$$;

-- Remplacer la politique trop permissive
DROP POLICY IF EXISTS "Allow member insertion" ON public.group_members;

CREATE POLICY "Members can be added by admins or self-join"
ON public.group_members
FOR INSERT
WITH CHECK (
  -- L'utilisateur peut s'ajouter lui-même (rejoindre le groupe)
  auth.uid() = user_id
  OR
  -- Ou un admin peut ajouter quelqu'un (utilise la fonction SECURITY DEFINER)
  public.is_group_admin(auth.uid(), group_id)
);