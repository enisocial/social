-- Supprimer tous les triggers qui dépendent de la fonction
DROP TRIGGER IF EXISTS add_group_creator_as_admin_trigger ON public.groups;
DROP TRIGGER IF EXISTS add_creator_as_admin ON public.groups;

-- Supprimer la fonction avec CASCADE pour supprimer toutes les dépendances
DROP FUNCTION IF EXISTS public.add_group_creator_as_admin() CASCADE;

-- Créer la nouvelle fonction SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.add_group_creator_as_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insérer le créateur comme admin, SECURITY DEFINER bypass les RLS
  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin');
  
  RETURN NEW;
END;
$$;

-- Créer le trigger
CREATE TRIGGER add_group_creator_as_admin_trigger
AFTER INSERT ON public.groups
FOR EACH ROW
EXECUTE FUNCTION public.add_group_creator_as_admin();

-- Simplifier la politique d'insertion sur group_members
DROP POLICY IF EXISTS "Members can be added by group creator or self" ON public.group_members;

CREATE POLICY "Members can join or be added"
ON public.group_members
FOR INSERT
WITH CHECK (
  -- L'utilisateur peut s'ajouter lui-même
  auth.uid() = user_id
);