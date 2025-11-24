-- Ajouter une politique permettant aux créateurs de voir leurs groupes
-- Cette politique s'exécute AVANT celle des groupes privés et évite la récursion
CREATE POLICY "Group creators can view their groups"
ON public.groups
FOR SELECT
USING (auth.uid() = created_by);

-- Modifier la politique des groupes privés pour exclure les créateurs
-- (déjà couverts par la politique ci-dessus)
DROP POLICY IF EXISTS "Private groups viewable by members" ON public.groups;

CREATE POLICY "Private groups viewable by members (not creator)"
ON public.groups
FOR SELECT
USING (
  privacy = 'private' 
  AND auth.uid() != created_by  -- Créateur déjà couvert par autre politique
  AND EXISTS (
    SELECT 1
    FROM group_members
    WHERE group_members.group_id = groups.id 
    AND group_members.user_id = auth.uid()
  )
);