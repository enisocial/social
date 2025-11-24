-- Supprimer les politiques problématiques sur groups
DROP POLICY IF EXISTS "Admins can update their groups" ON public.groups;
DROP POLICY IF EXISTS "Admins can delete their groups" ON public.groups;

-- Créer des politiques sans récursion pour groups
CREATE POLICY "Group creators can update their groups"
ON public.groups
FOR UPDATE
USING (created_by = auth.uid());

CREATE POLICY "Group creators can delete their groups"
ON public.groups
FOR DELETE
USING (created_by = auth.uid());