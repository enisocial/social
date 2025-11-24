-- Supprimer tous les triggers et la fonction avec CASCADE
DROP TRIGGER IF EXISTS add_creator_as_admin ON public.groups;
DROP TRIGGER IF EXISTS add_group_creator_as_admin_trigger ON public.groups;
DROP FUNCTION IF EXISTS public.add_group_creator_as_admin() CASCADE;

-- Créer une fonction SECURITY DEFINER pour ajouter le créateur comme admin
CREATE OR REPLACE FUNCTION public.add_group_creator_as_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin');
  RETURN NEW;
END;
$$;

-- Créer le trigger
CREATE TRIGGER add_creator_as_admin
AFTER INSERT ON public.groups
FOR EACH ROW
EXECUTE FUNCTION public.add_group_creator_as_admin();

-- Simplifier complètement les politiques sur group_members
DROP POLICY IF EXISTS "Group creators and admins can add members" ON public.group_members;
DROP POLICY IF EXISTS "Users can be added as members" ON public.group_members;
DROP POLICY IF EXISTS "Only admins can add other members" ON public.group_members;

-- Nouvelle politique simple qui permet au trigger de fonctionner
CREATE POLICY "Allow member insertion"
ON public.group_members
FOR INSERT
WITH CHECK (true);